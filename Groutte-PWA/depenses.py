"""Budget > Dépenses et Staff > Validation des dépenses : ce que j'ai payé pour le groupe, et entre qui ça se partage.

Brouillon --envoyer--> En attente --un staff valide--> Validée (définitif)
    ^                       |
    +----un staff refuse----+   (avec un motif)

data/depenses.json : {"depenses": [{
    "id", "auteur" (le payeur), "date" (du ticket), "saisie" (horodatage), "motif", "montant" (centimes), "ticket" (média ou ""),
    "mode": "egales" | "exacts" | "communaute",
    "concernes": [noms]                              (parts égales)
    "lignes": [{"nom", "montant"}]                   (montants exacts)
              [{"categorie", "nom_categorie", "montant"}]   (communauté)
    "parts": {nom: centimes}   calculées et figées à la validation (compta.py), pour tous les modes
    "etat": "brouillon" | "attente" | "validee", "refus": motif du dernier refus, "valide_le",
    "historique": [{"quand", "par", "action": "envoyee" | "validee" | "refusee", "detail"}],
    "lu_llm": horodatage de la lecture du ticket par le LLM, ou "" (une seule lecture par dépense : llm.py)}]}

Le gîte et la salle ne passent pas par ici (Créances). Un staff ne valide pas sa propre dépense, sauf s'il est seul.
Un staff voit aussi les brouillons des autres (Validation) : il peut les compléter et les valider d'un coup, pour un
plouc qui n'a laissé que la photo du ticket. L'auteur (le payeur) ne change pas.
"""
import re

import comptes_donnees as cd
import compta
import medias
import reglages_compta
from euros import euros
from notifications import notifier
from requetes import Refus, interdit, texte
from routes import route
from stockage import DEPENSES, aujourdhui, ecrire_json, lire_json, maintenant, nouvel_id

MODES = ("egales", "exacts", "communaute")
MAX_DEPENSES = 2000
MAX_LIGNES = 60


def lire():
    donnees = lire_json(DEPENSES, {})
    donnees.setdefault("depenses", [])
    for dep in donnees["depenses"]:
        for cle, valeur in (("ticket", ""), ("concernes", []), ("lignes", []), ("parts", {}), ("refus", ""),
                            ("valide_le", ""), ("historique", []), ("lu_llm", "")):
            dep.setdefault(cle, valeur)
    return donnees


def trouver(donnees, ident):
    dep = next((x for x in donnees["depenses"] if x["id"] == ident), None)
    if not dep:
        raise Refus("dépense introuvable", "404 Not Found")
    return dep


def exiger_modifiable(d, dep):
    """Un brouillon se modifie par son auteur, ou par un staff qui le complète pour lui."""
    if dep["auteur"] != d.nom and not d.staff:
        raise interdit("seul l'auteur modifie sa dépense")
    if dep["etat"] != "brouillon":
        raise Refus("cette dépense est envoyée : elle ne se modifie plus")


def lien(dep):
    return "#depenses/" + dep["id"]


def ticket_valide(valeur):
    if not valeur:
        return ""
    chemin = medias.chemin(valeur) if isinstance(valeur, str) else None
    if not chemin or chemin.suffix not in medias.TYPES_IMAGES:
        raise Refus("photo du ticket introuvable")
    return valeur


def lire_contenu(d, dep):
    """Les champs d'une dépense, reçus de la page. Vérifiés seulement dans leur forme : l'envoi vérifie le reste."""
    corps = d.corps
    jour = corps.get("date") or aujourdhui()
    if not isinstance(jour, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", jour):
        raise Refus("date invalide")
    mode = corps.get("mode")
    if mode not in MODES:
        raise Refus("mode de répartition inconnu")
    montant = corps.get("montant", 0)
    if not isinstance(montant, int) or isinstance(montant, bool) or not 0 <= montant <= 10_000_000:
        raise Refus("montant invalide")
    noms = cd.lire_comptes(d.config)
    lignes, concernes = [], []
    if mode == "egales":
        brut = corps.get("concernes")
        if not isinstance(brut, list) or len(brut) > MAX_LIGNES:
            raise Refus("personnes concernées invalides")
        concernes = list(dict.fromkeys(n for n in brut if isinstance(n, str)))
    else:
        brut = corps.get("lignes")
        if not isinstance(brut, list) or len(brut) > MAX_LIGNES:
            raise Refus("lignes invalides")
        categories = reglages_compta.lire_categories()
        for l in brut:
            if not isinstance(l, dict) or not isinstance(l.get("montant"), int) or isinstance(l.get("montant"), bool) \
                    or not 0 <= l["montant"] <= 10_000_000:
                raise Refus("montant d'une ligne invalide")
            if mode == "exacts":
                if not isinstance(l.get("nom"), str):
                    raise Refus("personne invalide")
                lignes.append({"nom": l["nom"], "montant": l["montant"]})
            else:
                cat = reglages_compta.categorie(l.get("categorie"), categories)
                if not cat or (cat["supprimee"] and not any(x.get("categorie") == cat["id"] for x in dep.get("lignes", []))):
                    raise Refus("catégorie inconnue")
                lignes.append({"categorie": cat["id"], "nom_categorie": cat["nom"], "montant": l["montant"]})
    inconnus = [n for n in concernes + [l["nom"] for l in lignes if "nom" in l] if n not in noms]
    if inconnus:
        raise Refus(f"{inconnus[0]} n'existe pas")
    return {"date": jour, "motif": texte(corps, "motif", 120), "montant": montant, "mode": mode,
            "concernes": concernes, "lignes": lignes}


def verifier_envoi(c, dep):
    """Tout ce qui doit être juste avant l'envoi. Renvoie les parts telles qu'elles seraient figées maintenant."""
    if not dep["motif"]:
        raise Refus("indique le motif")
    if dep["montant"] <= 0:
        raise Refus("le montant doit être plus grand que zéro")
    if dep["mode"] == "egales" and not dep["concernes"]:
        raise Refus("ajoute au moins une personne concernée")
    if dep["mode"] != "egales":
        if not dep["lignes"]:
            raise Refus("ajoute au moins une ligne")
        somme = sum(l["montant"] for l in dep["lignes"])
        if somme != dep["montant"]:
            raise Refus(f"les lignes font {euros(somme)}, pour un total de {euros(dep['montant'])}")
    inactifs = [n for n in dep["concernes"] + [l["nom"] for l in dep["lignes"] if "nom" in l] if n not in c.actifs]
    if inactifs:
        raise Refus(f"le compte de {inactifs[0]} est désactivé")
    return c.parts_depense(dep)


@route("/api/depenses/enregistrer")
def enregistrer(d):
    """Créer ou modifier un brouillon (`id`) ; `envoyer` : le passer En attente, et prévenir le staff. `valider` (staff,
    sur le brouillon d'un autre) : le valider directement, sans passer par En attente."""
    reglages_compta.exiger_depenses_visibles(d)
    c = compta.Compta(d.config)
    if c.cloture():
        raise Refus("les comptes sont clôturés : plus de nouvelle dépense")
    donnees = lire()
    ident = d.corps.get("id")
    if ident:
        dep = trouver(donnees, ident)
        exiger_modifiable(d, dep)
    else:
        if len(donnees["depenses"]) >= MAX_DEPENSES:
            raise Refus("trop de dépenses")
        dep = {"id": nouvel_id(), "auteur": d.nom, "saisie": maintenant(), "ticket": "", "etat": "brouillon",
               "parts": {}, "refus": "", "valide_le": "", "historique": [], "lu_llm": ""}
        donnees["depenses"].append(dep)
    dep.update(lire_contenu(d, dep))
    ancien, dep["ticket"] = dep.get("ticket", ""), ticket_valide(d.corps.get("ticket"))
    if d.corps.get("valider"):
        if dep["auteur"] == d.nom:
            raise Refus("ta propre dépense s'envoie, un autre staff la valide")
        figer(d, c, dep, "complétée par le staff")
    elif d.corps.get("envoyer"):
        verifier_envoi(c, dep)
        dep["etat"] = "attente"
        dep["historique"].append({"quand": maintenant(), "par": d.nom, "action": "envoyee", "detail": ""})
    ecrire_json(DEPENSES, donnees)
    if ancien and ancien != dep["ticket"]:
        medias.supprimer(ancien)
    if dep["etat"] == "validee":
        prevenir_validation(d, dep)
    elif dep["etat"] == "attente":
        notifier(d.config, "depenses", "Dépense à valider", f"{d.nom} : {dep['motif']}, {euros(dep['montant'])}.",
                 "#validation/" + dep["id"], destinataires=set(cd.staffs_actifs(c.comptes)), sauf=d.nom)
    return {"depense": dep["id"]}


@route("/api/depenses/supprimer")
def supprimer(d):
    """Un brouillon seulement : une dépense envoyée ne se retire pas (seul un refus du staff la remet en brouillon)."""
    donnees = lire()
    dep = trouver(donnees, d.corps.get("id"))
    if dep["auteur"] != d.nom:
        raise interdit("seul l'auteur supprime sa dépense")
    if dep["etat"] != "brouillon":
        raise Refus("une dépense envoyée ne se retire pas")
    donnees["depenses"].remove(dep)
    ecrire_json(DEPENSES, donnees)
    medias.supprimer(dep["ticket"])


def exiger_attente(dep):
    """Deux staffs en même temps : la première action enregistrée l'emporte."""
    if dep["etat"] != "attente":
        derniere = next((h for h in reversed(dep["historique"]) if h["action"] in ("validee", "refusee")), None)
        if derniere:
            raise Refus(f"cette dépense vient d'être {'validée' if derniere['action'] == 'validee' else 'refusée'} par {derniere['par']}")
        raise Refus("cette dépense n'est pas en attente")


@route("/api/depenses/valider")
def valider(d):
    d.exiger_staff()
    c = compta.Compta(d.config)
    if c.cloture():
        raise Refus("les comptes sont clôturés : plus aucune dépense ne se valide")
    donnees = lire()
    dep = trouver(donnees, d.corps.get("id"))
    exiger_attente(dep)
    if dep["auteur"] == d.nom and len(cd.staffs_actifs(c.comptes)) > 1:
        raise interdit("un autre staff doit la valider")
    figer(d, c, dep)
    ecrire_json(DEPENSES, donnees)
    prevenir_validation(d, dep)


def figer(d, c, dep, detail=""):
    """Valider : les parts sont calculées et figées. Définitif."""
    d.exiger_staff()
    dep["parts"] = verifier_envoi(c, dep)
    dep.update(etat="validee", valide_le=maintenant(), refus="")
    dep["historique"].append({"quand": maintenant(), "par": d.nom, "action": "validee", "detail": detail})


def prevenir_validation(d, dep):
    notifier(d.config, "depenses", "Dépense validée", f"Ta dépense « {dep['motif']} » est validée par {d.nom}.", lien(dep),
             destinataires={dep["auteur"]}, sauf=d.nom)
    soldes = compta.Compta(d.config).soldes()
    for nom in dep["parts"]:
        if nom == dep["auteur"]:
            continue
        solde = soldes.get(nom, 0)
        etat = (f"tu dois maintenant {euros(-solde)}" if solde < 0 else f"on te doit maintenant {euros(solde)}" if solde > 0
                else "tu es quitte")
        notifier(d.config, "comptes", "Mes comptes", f"Ton solde a changé ({dep['motif']}) : {etat}.", "#comptes",
                 destinataires={nom})


@route("/api/depenses/refuser")
def refuser(d):
    """La dépense revient en brouillon chez son auteur, avec un motif obligatoire."""
    d.exiger_staff()
    donnees = lire()
    dep = trouver(donnees, d.corps.get("id"))
    exiger_attente(dep)
    motif = texte(d.corps, "motif", 300, requis=True)
    dep.update(etat="brouillon", refus=motif)
    dep["historique"].append({"quand": maintenant(), "par": d.nom, "action": "refusee", "detail": motif})
    ecrire_json(DEPENSES, donnees)
    notifier(d.config, "depenses", "Dépense refusée", f"{d.nom} te renvoie « {dep['motif']} » : {motif}", lien(dep),
             destinataires={dep["auteur"]}, sauf=d.nom)


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(DEPENSES, ancien, nouveau, {"auteur", "concernes", "nom", "par"})


# --- Ce que la page reçoit -------------------------------------------------------------------------

def vue(c, nom, staff):
    """Mes dépenses (tous les états), celles validées qui me concernent, et pour le staff toutes (brouillons compris).
    Les dépenses en attente portent les parts telles qu'elles seraient figées maintenant (`apercu`)."""
    resultat = []
    for dep in c.deps["depenses"]:
        moi_auteur = dep["auteur"] == nom
        concerne = dep["etat"] == "validee" and nom in dep["parts"]
        if not (moi_auteur or concerne or staff):
            continue
        copie = dict(dep)
        if dep["etat"] == "attente" and staff:
            try:
                copie["apercu"] = c.parts_depense(dep)
            except Refus as refus:
                copie["apercu_erreur"] = str(refus)
        etat = c.etat_remboursement(dep["id"]) if dep["etat"] == "validee" else None
        if etat:
            copie["remboursement"] = etat
        resultat.append(copie)
    return sorted(resultat, key=lambda x: (x["date"], x["saisie"]), reverse=True)
