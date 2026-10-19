"""Budget > Créances gîte et salle : ma part du gîte et de la salle, que je paie à l'hébergeur.

L'appli ne fait pas de virement : je paie avec un moyen de l'hébergeur (Me rembourser), je déclare « j'ai payé », il
confirme. Après la date limite, l'hébergeur (ou un staff) peut accepter de reporter le reste dans Mes comptes.

data/creances.json : {
    "paiements": [{"id", "nom", "quoi": "gite" | "salle", "montant", "quand", "etat": "declare" | "confirme" | "refuse",
                   "par", "le", "grace": true si le staff a effacé ce reste (Suivi des dépenses), "message"}],
    "reports":   [{"id", "nom", "quoi", "a": hébergeur, "montant", "par", "quand"}],
    "rappels":   {"<nom>/<quoi>": date du dernier rappel, "<nom>/<quoi>/limite": date}}

Les parts ne sont pas enregistrées : compta.py les recalcule à chaque affichage.
Les notifications de paiement ne se coupent pas (catégorie None), comme les annonces.
"""
from datetime import date

import comptes_donnees as cd
import compta
from euros import centimes, euros
from notifications import notifier
from requetes import Refus, interdit
from routes import route
from donnees import CREANCES
from stockage import aujourdhui, ecrire_json, lire_json, maintenant, nouvel_id

LIEU = {"gite": "du gîte", "salle": "de la salle"}


def lire():
    donnees = lire_json(CREANCES, {})
    donnees.setdefault("paiements", [])
    donnees.setdefault("reports", [])
    donnees.setdefault("rappels", {})
    return donnees


def quoi_valide(d):
    quoi = d.corps.get("quoi")
    if quoi not in LIEU:
        raise Refus("gîte ou salle ?")
    return quoi


@route("/api/creances/payer")
def payer(d):
    """Je déclare « j'ai payé X € » à l'hébergeur. Partiel accepté ; plus que le reste : le surplus devient un avoir."""
    quoi = quoi_valide(d)
    montant = centimes(d.corps.get("montant"))
    c = compta.Compta(d.config)
    if not c.ouvert(quoi):
        raise Refus("les paiements ne sont pas encore ouverts")
    if c.exempte(d.nom, quoi):
        raise Refus("tu es exempté")
    heb = c.hebergeur(quoi)
    if heb == d.nom:
        raise Refus("tu es l'hébergeur : ta part réduit simplement ce que tu as avancé")
    if not c.parts(quoi).get(d.nom):
        raise Refus("tu n'as pas de part à payer")
    donnees = lire()
    donnees["paiements"].append({"id": nouvel_id(), "nom": d.nom, "quoi": quoi, "montant": montant,
                                 "quand": maintenant(), "etat": "declare", "par": "", "le": ""})
    ecrire_json(CREANCES, donnees)
    notifier(d.config, None, "Paiement à confirmer", f"{d.nom} dit t'avoir payé {euros(montant)} pour {LIEU[quoi][3:]}. À confirmer.",
             "#creances", destinataires={heb}, sauf=d.nom)
    notifier(d.config, None, "Merci !", f"Ton paiement de {euros(montant)} est noté. {heb} va le confirmer.", "#creances",
             destinataires={d.nom})


@route("/api/creances/confirmer")
def confirmer(d):
    """L'hébergeur a reçu l'argent (`recu` : true), ou rien n'est arrivé (false : le paiement est annulé)."""
    donnees = lire()
    paiement = next((p for p in donnees["paiements"] if p["id"] == d.corps.get("id")), None)
    if not paiement:
        raise Refus("paiement introuvable")
    c = compta.Compta(d.config)
    if c.hebergeur(paiement["quoi"]) != d.nom:
        raise interdit("seul l'hébergeur confirme ses paiements")
    if paiement["etat"] != "declare":
        raise Refus("ce paiement est déjà traité")
    recu = bool(d.corps.get("recu"))
    paiement.update(etat="confirme" if recu else "refuse", par=d.nom, le=maintenant())
    ecrire_json(CREANCES, donnees)
    notifier(d.config, None, "Paiement confirmé" if recu else "Paiement refusé",
             f"{d.nom} confirme ton paiement de {euros(paiement['montant'])}. Merci !" if recu
             else f"{d.nom} n'a pas reçu ton paiement de {euros(paiement['montant'])} : il est annulé. Vérifie ton virement.",
             "#creances", destinataires={paiement["nom"]}, sauf=d.nom)


@route("/api/creances/reporter")
def accepter_report(d):
    """Après la date limite : l'hébergeur (ou un staff) accepte que le reste à payer passe dans Mes comptes."""
    quoi = quoi_valide(d)
    c = compta.Compta(d.config)
    qui = d.corps.get("qui")
    heb = c.hebergeur(quoi)
    if d.nom != heb and not d.staff:
        raise interdit("seuls l'hébergeur et le staff acceptent un report")
    if not isinstance(qui, str) or qui not in c.comptes:
        raise Refus("compte inconnu")
    if not c.limite_passee():
        raise Refus("la date limite de paiement n'est pas encore passée")
    reste = c.reste(qui, quoi)
    if reste <= 0:
        raise Refus("il n'y a rien à reporter")
    donnees = lire()
    donnees["reports"].append({"id": nouvel_id(), "nom": qui, "quoi": quoi, "a": heb, "montant": reste,
                               "par": d.nom, "quand": maintenant()})
    ecrire_json(CREANCES, donnees)
    import staff   # import ici : staff importe gite_salle, qui importe compta, qui importe ce module
    staff.noter(d, "creances-report", qui, f"{LIEU[quoi][3:]} : {euros(reste)}")
    notifier(d.config, None, "Report accepté",
             f"{d.nom} accepte de reporter ta part {LIEU[quoi]} : {euros(reste)} passent dans Mes comptes, à régler quand tu peux.",
             "#comptes", destinataires={qui}, sauf=d.nom)


# --- Rappels datés (taches.py) ---------------------------------------------------------------------

def rappeler(config):
    """Sous le verrou. Ceux qui n'ont pas tout payé : un rappel par semaine, un par jour la dernière semaine, et un
    message bienveillant le jour de la date limite. Chaque envoi est noté pour ne jamais partir deux fois."""
    c = compta.Compta(config)
    limite = c.gs["limite_paiement"]
    if not limite:
        return
    donnees = lire()
    rappels = donnees["rappels"]
    jour = aujourdhui()
    ecart = (date.fromisoformat(limite) - date.fromisoformat(jour)).days
    change = False
    for quoi in LIEU:
        if not c.ouvert(quoi):
            continue
        for nom in c.parts(quoi):
            reste = c.reste(nom, quoi)
            if reste <= 0 or nom not in c.actifs:
                continue
            cle = f"{nom}/{quoi}"
            if ecart <= 0:
                if not rappels.get(cle + "/limite"):
                    rappels[cle + "/limite"] = jour
                    change = True
                    notifier(config, None, "Date limite",
                             f"La date limite de paiement {LIEU[quoi]} est arrivée, et il te reste {euros(reste)}. Pas de panique : "
                             f"contacte {c.hebergeur(quoi)} pour trouver un arrangement.", "#contact", destinataires={nom})
                continue
            dernier = rappels.get(cle, "")
            delai = 1 if ecart <= 7 else 7
            if dernier and (date.fromisoformat(jour) - date.fromisoformat(dernier)).days < delai:
                continue
            if not dernier and c.gs[quoi]["ouverture"][:10] == jour:
                continue   # le jour de l'ouverture, « Tu peux payer ta part » suffit
            rappels[cle] = jour
            change = True
            notifier(config, None, "Rappel", f"Il te reste {euros(reste)} à payer pour {LIEU[quoi][3:]}, avant le "
                     f"{limite[8:10]}/{limite[5:7]}.", "#creances", destinataires={nom})
    if change:
        ecrire_json(CREANCES, donnees)


@cd.renommage
def renommer(ancien, nouveau):
    donnees = lire()
    donnees = cd.renommer_dans(donnees, ancien, nouveau, {"nom", "par", "a"})
    donnees["rappels"] = {"/".join(nouveau if i == 0 and morceau == ancien else morceau for i, morceau in enumerate(cle.split("/"))): v
                          for cle, v in donnees["rappels"].items()}
    ecrire_json(CREANCES, donnees)


# --- Ce que la page reçoit -------------------------------------------------------------------------

def vue(c, nom, staff):
    """Ma part du gîte et de la salle, avec le calcul ; pour l'hébergeur (et le staff), le suivi de chacun."""
    resultat = {"total_nuitees": 0, "nb_ploucs": len(c.venants()), "mes_nuits": c.nuits(nom),
                "limite_passee": c.limite_passee()}
    for quoi in LIEU:
        heb = c.hebergeur(quoi)
        base = c.base(quoi)
        nuitees = sum(n for p, n in base.items() if not c.exempte(p, quoi))
        part = c.parts(quoi).get(nom, 0)
        mes = [p for p in c.cr["paiements"] if p["nom"] == nom and p["quoi"] == quoi and p["etat"] != "refuse"]
        bloc = {
            "part": part,
            "exempte": c.exempte(nom, quoi),
            "hebergeur": heb == nom,
            "confirme": sum(p["montant"] for p in mes if p["etat"] == "confirme" and not p.get("grace")),
            "efface": sum(p["montant"] for p in mes if p.get("grace")),
            "declare": sum(p["montant"] for p in mes if p["etat"] == "declare"),
            "reporte": sum(r["montant"] for r in c.cr["reports"] if r["nom"] == nom and r["quoi"] == quoi),
            "reste": c.reste(nom, quoi),
            "paiements": sorted(mes, key=lambda p: p["quand"], reverse=True),
            "nuitees": nuitees,
            "nb_parts": sum(1 for p in base if not c.exempte(p, quoi)),
            "retard": sum(r["montant"] for r in c.retards(quoi) if r["de"] == nom),
            "nuits_figees": c.gs[quoi]["instantane"].get(nom) if c.ouvert(quoi) else None,
        }
        if quoi == "gite":
            resultat["total_nuitees"] = nuitees
        if heb == nom or staff:
            parts = c.parts(quoi)
            suivi = []
            for p in sorted(set(parts) | {x["nom"] for x in c.cr["paiements"] if x["quoi"] == quoi}):
                lignes = [x for x in c.cr["paiements"] if x["nom"] == p and x["quoi"] == quoi]
                suivi.append({
                    "nom": p, "nuits": base.get(p, 0), "part": parts.get(p, 0),
                    "confirme": sum(x["montant"] for x in lignes if x["etat"] == "confirme" and not x.get("grace")),
                    "efface": sum(x["montant"] for x in lignes if x.get("grace")),
                    "declare": sum(x["montant"] for x in lignes if x["etat"] == "declare"),
                    "reporte": sum(r["montant"] for r in c.cr["reports"] if r["nom"] == p and r["quoi"] == quoi),
                    "reste": c.reste(p, quoi), "hebergeur": p == heb,
                })
            recu = sum(s["confirme"] for s in suivi)
            bloc["suivi"] = suivi
            bloc["avance"] = c.gs[quoi]["montant"]
            bloc["recu"] = recu
            bloc["a_confirmer"] = sorted((x for x in c.cr["paiements"] if x["quoi"] == quoi and x["etat"] == "declare"),
                                         key=lambda x: x["quand"]) if heb == nom else []
        resultat[quoi] = bloc
    return resultat
