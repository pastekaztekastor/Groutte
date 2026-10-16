"""Staff > Comptes : les droits staff, les codes, les rôles, le mode muet, les noms, la désactivation ; et le journal.

Les actions de groupe (rôles, muet) prennent une liste `qui` ; les actions sur une seule personne prennent `qui`
(un nom). Chaque action est notée dans data/journal-staff.json, et la personne concernée est prévenue
(notification toujours reçue).
"""
import acces
import comptes_donnees as cd
import notifications
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import JOURNAL, ecrire_json, lire_json, maintenant

JOURNAL_MAX = 500


def noter(d, action, qui, detail=""):
    journal = lire_json(JOURNAL, [])
    journal.insert(0, {"quand": maintenant(), "par": d.nom, "action": action, "qui": qui, "detail": detail})
    ecrire_json(JOURNAL, journal[:JOURNAL_MAX])


def prevenir(d, qui, titre, texte_notif, lien="#fiche"):
    notifier(d.config, None, titre, texte_notif, lien, destinataires={qui}, sauf=d.nom)


def un_compte(d, comptes):
    qui = d.corps.get("qui")
    if not isinstance(qui, str) or qui not in comptes:
        raise Refus("compte inconnu")
    return qui


def plusieurs_comptes(d, comptes):
    qui = d.corps.get("qui")
    if not isinstance(qui, list) or not qui:
        raise Refus("choisis au moins une personne")
    inconnus = [n for n in qui if not isinstance(n, str) or n not in comptes or comptes[n]["desactive"]]
    if inconnus:
        raise Refus("compte inconnu")
    return list(dict.fromkeys(qui))


def est_hebergeur(nom):
    """Hébergeur du gîte ou de la salle (Staff > Gîte et salle, jalon suivant) : pas encore désigné."""
    return False


# --- Actions de groupe ----------------------------------------------------------------------------

@route("/api/staff/role")
def changer_role(d):
    """Ajouter (`ajouter`: true) ou retirer un rôle `libre` ou `staff` à plusieurs personnes."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = plusieurs_comptes(d, comptes)
    ident = d.corps.get("role")
    r = cd.role(ident) if isinstance(ident, str) else None
    if not r:
        raise Refus("rôle inconnu")
    if r["type"] == "automatique":
        raise Refus(f"le rôle {r['nom']} découle d'un autre réglage : il ne se pose pas à la main")
    ajouter = bool(d.corps.get("ajouter"))
    for nom in qui:
        roles = comptes[nom]["roles"]
        if ajouter and ident not in roles:
            roles.append(ident)
        elif not ajouter and ident in roles:
            roles.remove(ident)
        else:
            continue
        noter(d, "role", nom, ("+ " if ajouter else "- ") + r["nom"])
        prevenir(d, nom, "Rôle", f"{d.nom} t'a {'ajouté' if ajouter else 'retiré'} le rôle {r['nom']}.")
    cd.ecrire_comptes(comptes)


@route("/api/staff/muet")
def changer_muet(d):
    """Rendre muet (`muet`: true) ou rendre la parole, à plusieurs personnes. Un staff ne peut pas être rendu muet."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = plusieurs_comptes(d, comptes)
    muet = bool(d.corps.get("muet"))
    if muet:
        staffs = [n for n in qui if comptes[n]["staff"]]
        if staffs:
            raise Refus(f"{', '.join(staffs)} est staff : retire-lui d'abord son droit staff")
    for nom in qui:
        if comptes[nom]["muet"] == muet:
            continue
        comptes[nom]["muet"] = muet
        noter(d, "muet" if muet else "parole", nom)
        prevenir(d, nom, "Communauté",
                 "Tu ne peux plus écrire dans la Communauté pour le moment." if muet
                 else "Tu peux de nouveau écrire dans la Communauté.")
    cd.ecrire_comptes(comptes)


# --- Actions sur une seule personne ---------------------------------------------------------------

@route("/api/staff/droit")
def changer_droit_staff(d):
    """Nommer staff (`staff`: true) ou retirer le droit staff."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = un_compte(d, comptes)
    staff = bool(d.corps.get("staff"))
    if comptes[qui]["desactive"]:
        raise Refus("ce compte est désactivé")
    if comptes[qui]["staff"] == staff:
        return
    if not staff:
        if cd.staffs_actifs(comptes) == [qui]:
            raise Refus("c'est le dernier staff : nomme quelqu'un d'autre d'abord")
        if est_hebergeur(qui):
            raise Refus("c'est un hébergeur : désigne d'abord un autre hébergeur (Gîte et salle)")
    comptes[qui]["staff"] = staff
    if staff:
        comptes[qui]["muet"] = False
    cd.ecrire_comptes(comptes)
    noter(d, "staff" if staff else "plus-staff", qui)
    prevenir(d, qui, "Staff", f"{d.nom} t'a nommé staff." if staff else f"{d.nom} t'a retiré le droit staff.")


@route("/api/staff/code")
def remettre_code(d):
    """Remet le code de `qui` à zéro : renvoie un code provisoire, montré une seule fois au staff."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = un_compte(d, comptes)
    if comptes[qui]["desactive"]:
        raise Refus("ce compte est désactivé")
    code = acces.code_provisoire(d.config, qui)
    noter(d, "code", qui)
    prevenir(d, qui, "Code remis à zéro", f"{d.nom} a remis ton code à zéro : demande-lui ton code provisoire.", "#")
    return {"code_provisoire": {"qui": qui, "code": code}}


@route("/api/staff/renommer")
def renommer(d):
    """Corriger le nom d'un compte (faute de frappe) : il change partout."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = un_compte(d, comptes)
    nouveau, erreur = cd.nom_propre(texte(d.corps, "nouveau", 60, requis=True))
    if erreur:
        raise Refus(erreur)
    if nouveau == qui:
        return
    if cd.nom_pris(comptes, nouveau, sauf=qui):
        raise Refus("ce nom est déjà pris (ou trop proche d'un autre)")
    comptes = {(nouveau if n == qui else n): c for n, c in comptes.items()}
    cd.ecrire_comptes(comptes)
    for fonction in cd.RENOMMAGES:
        fonction(qui, nouveau)
    noter(d, "nom", nouveau, f"{qui} → {nouveau}")
    prevenir(d, nouveau, "Nom corrigé", f"{d.nom} a corrigé ton nom : tu t'appelles maintenant {nouveau}.")


@route("/api/staff/desactiver")
def desactiver(d):
    """Désactiver (`desactive`: true) ou réactiver un compte. Il n'est jamais supprimé : son historique reste."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = un_compte(d, comptes)
    desactive = bool(d.corps.get("desactive"))
    if comptes[qui]["desactive"] == desactive:
        return
    if desactive:
        if comptes[qui]["staff"] and cd.staffs_actifs(comptes) == [qui]:
            raise Refus("c'est le dernier staff : il ne peut pas être désactivé")
        if est_hebergeur(qui):
            raise Refus("c'est un hébergeur : désigne d'abord un autre hébergeur (Gîte et salle)")
    comptes[qui]["desactive"] = desactive
    cd.ecrire_comptes(comptes)
    if desactive:
        acces.revoquer(qui)
        notifications.oublier_compte(qui)
    noter(d, "desactive" if desactive else "reactive", qui)


@cd.renommage
def renommer_journal(ancien, nouveau):
    journal = lire_json(JOURNAL, [])
    for ligne in journal:
        for cle in ("par", "qui"):
            if ligne.get(cle) == ancien:
                ligne[cle] = nouveau
    ecrire_json(JOURNAL, journal)


def journal():
    return lire_json(JOURNAL, [])[:100]
