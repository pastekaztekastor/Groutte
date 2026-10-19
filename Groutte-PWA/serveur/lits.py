"""Gîte > Lits : réserver un lit, nuit par nuit. Sans réservation, on dort par terre au gîte. Et la literie : assez de
matelas et de duvets, nuit par nuit, pour ceux qui dorment par terre ?

data/lits.json : {"reservations": [{"nuit": date du soir, "lit": lettre ou "salle", "nom", "quand"}],
                  "manques": ["<nuit>/matelas", "<nuit>/duvets"]}   (les manques déjà signalés au staff)
Les lits (lettre, description, places, complet), le plan, la salle comme couchage et la literie fournie par le gîte sont
réglés dans Gîte et salle ; ce que chacun apporte, dans Ma fiche (profil « matelas », « duvets » : absent = non renseigné).
Une personne a au plus une place par nuit. Premier arrivé, premier servi.

La literie (bilan) : le stock d'une nuit = ce qu'apportent les présents cette nuit-là + ce que fournit le gîte ; le besoin :
rien dans un lit complet, un duvet dans un lit incomplet, un matelas et un duvet par terre (au gîte ou en salle).
"""
import comptes_donnees as cd
import compta
import gite_salle
import sejour
from notifications import notifier
from requetes import Refus
from routes import route
from donnees import LITS
from stockage import ecrire_json, lire_json, maintenant

SALLE = "salle"


OBJETS = {"matelas": "matelas", "duvets": "duvet"}


def lire():
    donnees = lire_json(LITS, {})
    donnees.setdefault("reservations", [])
    donnees.setdefault("manques", [])
    return donnees


def bilan(c):
    """{nuit: {"matelas": reste, "duvets": reste}} : ce qui reste une fois servis ceux qui en ont besoin (négatif : il en
    manque). Ceux qui n'ont pas dit ce qu'ils apportent comptent pour zéro."""
    lits = {l["lettre"]: l for l in c.gs["lits"]}
    places = {(r["nuit"], r["nom"]): r["lit"] for r in c.lits["reservations"]}
    resultat = {}
    for nuit in sejour.nuits(c.config):
        reste = {objet: c.gs["literie"][objet] for objet in OBJETS}
        for nom in c.venants():
            if nuit not in c.nuits_liste(nom):
                continue
            profil = c.profils.get(nom, {})
            for objet in OBJETS:
                reste[objet] += profil.get(objet) or 0
            lit = lits.get(places.get((nuit, nom)))
            if lit and lit.get("complet", True):
                continue
            reste["duvets"] -= 1
            if not lit:   # par terre, au gîte ou en salle
                reste["matelas"] -= 1
        resultat[nuit] = reste
    return resultat


def sans_literie(c):
    """Ceux qui viennent et n'ont pas dit ce qu'ils apportent (matelas ou duvets « non renseigné »)."""
    return sorted(n for n in c.venants() if any(c.profils.get(n, {}).get(objet) is None for objet in OBJETS))


def verifier_manques(config):
    """Sous le verrou, après chaque action (app.py) : le staff apprend qu'une nuit passe en manque de matelas ou de
    duvets, une seule fois par nuit et par objet, jusqu'à ce que le manque disparaisse. Les nouveaux manques partent en
    un seul message. Rien tant que le staff n'a pas déclaré les lits : tout le monde serait par terre."""
    c = compta.Compta(config)
    manques = {}
    if c.gs["lits"]:
        for nuit, reste in bilan(c).items():
            for objet, n in reste.items():
                if n < 0:
                    manques[f"{nuit}/{objet}"] = -n
    donnees = lire()
    if set(donnees["manques"]) == set(manques):
        return
    nouveaux = sorted(cle for cle in manques if cle not in donnees["manques"])
    donnees["manques"] = sorted(manques)
    ecrire_json(LITS, donnees)
    if not nouveaux:
        return
    phrases = []
    for cle in nouveaux:
        nuit, objet = cle.split("/")
        n = manques[cle]
        phrases.append(f"{n} {OBJETS[objet]}{'s' if n > 1 and objet == 'duvets' else ''} la nuit du {sejour.date_courte(nuit)}")
    notifier(config, "gite", "Literie", "Il manque " + ", ".join(phrases) + ".", "#lits",
             destinataires=set(cd.staffs_actifs(c.comptes)))


def occupants(donnees, nuit, lit):
    return [r["nom"] for r in donnees["reservations"] if r["nuit"] == nuit and r["lit"] == lit]


def nom_lit(lit):
    return "la salle" if lit == SALLE else f"le lit {lit}"


def retirer(config, donnees, a_retirer, message):
    """Retire ces réservations, et prévient chaque personne concernée (« Ta place dans le lit C est libérée... »)."""
    if not a_retirer:
        return
    donnees["reservations"] = [r for r in donnees["reservations"] if r not in a_retirer]
    ecrire_json(LITS, donnees)
    for r in a_retirer:
        notifier(config, "gite", "Lits", message(r), "#lits", destinataires={r["nom"]})


def apres_presence(config, nom, nuits):
    """Mes dates ont changé : mes réservations sur les nuits que je n'ai plus sont retirées."""
    donnees = lire()
    retirer(config, donnees, [r for r in donnees["reservations"] if r["nom"] == nom and r["nuit"] not in nuits],
            lambda r: f"Ta place dans {nom_lit(r['lit'])} est libérée pour la nuit du {sejour.date_courte(r['nuit'])}.")


def ajuster(config, gs, raison):
    """Le staff a changé les lits ou la salle : les réservations en trop sont retirées, les plus récentes d'abord."""
    donnees = lire()
    places = {l["lettre"]: l["places"] for l in gs["lits"]}
    a_retirer = []
    for r in sorted(donnees["reservations"], key=lambda r: r["quand"]):
        if r["lit"] == SALLE:
            if not gs["salle_couchage"]:
                a_retirer.append(r)
        elif r["lit"] not in places:
            a_retirer.append(r)
    garde = [r for r in donnees["reservations"] if r not in a_retirer]
    par_place = {}
    for r in sorted(garde, key=lambda r: r["quand"]):
        if r["lit"] == SALLE:
            continue
        cle = (r["nuit"], r["lit"])
        par_place[cle] = par_place.get(cle, 0) + 1
        if par_place[cle] > places[r["lit"]]:
            a_retirer.append(r)
    retirer(config, donnees, a_retirer,
            lambda r: f"Ta place dans {nom_lit(r['lit'])} pour la nuit du {sejour.date_courte(r['nuit'])} est retirée : {raison}.")


def renommer_lit(ancienne, nouvelle):
    donnees = lire()
    for r in donnees["reservations"]:
        if r["lit"] == ancienne:
            r["lit"] = nouvelle
    ecrire_json(LITS, donnees)


def verifier_lit(gs, lit):
    if lit == SALLE:
        if not gs["salle_couchage"]:
            raise Refus("la salle ne sert pas de couchage")
        return None
    places = next((l["places"] for l in gs["lits"] if l["lettre"] == lit), None)
    if places is None:
        raise Refus("lit introuvable")
    return places


def poser(d, donnees, gs, nuit, lit):
    """Me met dans `lit` la nuit `nuit` (à la place de ma réservation de cette nuit-là, s'il y en a une)."""
    places = verifier_lit(gs, lit)
    deja = occupants(donnees, nuit, lit)
    if d.nom in deja:
        return True
    if places is not None and len(deja) >= places:
        return False
    donnees["reservations"] = [r for r in donnees["reservations"] if not (r["nom"] == d.nom and r["nuit"] == nuit)]
    donnees["reservations"].append({"nuit": nuit, "lit": lit, "nom": d.nom, "quand": maintenant()})
    if lit != SALLE:
        for voisin in deja:
            notifier(d.config, "gite", "Lits", f"{d.nom} dormira avec toi la nuit du {sejour.date_courte(nuit)} (lit {lit}).",
                     "#lits", destinataires={voisin}, sauf=d.nom)
    return True


def mes_nuits(d):
    return compta.Compta(d.config).nuits_liste(d.nom)


@route("/api/lits/reserver")
def reserver(d):
    nuit, lit = d.corps.get("nuit"), d.corps.get("lit")
    if nuit not in sejour.nuits(d.config):
        raise Refus("cette nuit n'est pas dans le séjour")
    if nuit not in mes_nuits(d):
        raise Refus("tu n'es pas là cette nuit-là : change d'abord tes dates dans Présence")
    donnees, gs = lire(), gite_salle.lire()
    if not poser(d, donnees, gs, nuit, lit):
        raise Refus("ce lit vient d'être pris")
    ecrire_json(LITS, donnees)


@route("/api/lits/liberer")
def liberer(d):
    nuit = d.corps.get("nuit")
    donnees = lire()
    donnees["reservations"] = [r for r in donnees["reservations"] if not (r["nom"] == d.nom and r["nuit"] == nuit)]
    ecrire_json(LITS, donnees)


@route("/api/lits/tout")
def tout_reserver(d):
    """Ce lit pour toutes mes nuits où il a encore de la place. Renvoie les nuits où il était plein."""
    lit = d.corps.get("lit")
    donnees, gs = lire(), gite_salle.lire()
    verifier_lit(gs, lit)
    nuits = mes_nuits(d)
    if not nuits:
        raise Refus("tu n'as pas de nuit au gîte : saisis d'abord tes dates dans Présence")
    pleines = [n for n in nuits if not poser(d, donnees, gs, n, lit)]
    ecrire_json(LITS, donnees)
    return {"lits_pleins": pleines}


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(LITS, ancien, nouveau, {"nom"})


def vue(c, nom):
    return [{"nuit": r["nuit"], "lit": r["lit"], "nom": r["nom"]} for r in c.lits["reservations"]]
