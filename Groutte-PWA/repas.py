"""Repas > Mes repas : les repas que je prends sur la réserve communautaire (les courses du groupe).

data/repas.json : {"decoches": [{"nom", "date", "creneau", "quand"}]} : seulement les repas décochés. Tout repas de
ma présence qui n'y figure pas est pris : par défaut, on mange sur la réserve. Un repas se modifie jusqu'à ce qu'il
commence (config.json > heures_repas), ensuite il est figé. La catégorie au prorata des repas (compta.py) s'en sert.
"""
import comptes_donnees as cd
import compta
import sejour
from requetes import Refus
from routes import route
from stockage import REPAS, ecrire_json, lire_json, maintenant


def lire():
    donnees = lire_json(REPAS, {})
    donnees.setdefault("decoches", [])
    return donnees


def apres_presence(nom, possibles):
    """Mes dates ont changé : les repas décochés hors de mes nouvelles dates disparaissent avec elles."""
    donnees = lire()
    garde = [r for r in donnees["decoches"] if r["nom"] != nom or (r["date"], r["creneau"]) in possibles]
    if len(garde) != len(donnees["decoches"]):
        donnees["decoches"] = garde
        ecrire_json(REPAS, donnees)


@route("/api/repas")
def cocher(d):
    """`pris` : true, je mange sur la réserve à ce repas ; false, je n'y mange pas."""
    jour, creneau, pris = d.corps.get("date"), d.corps.get("creneau"), d.corps.get("pris")
    if not isinstance(pris, bool):
        raise Refus("pris : oui ou non ?")
    c = compta.Compta(d.config)
    if c.cloture():
        raise Refus("les comptes sont clôturés")
    if (jour, creneau) not in c.repas_possibles(d.nom):
        raise Refus("ce repas n'est pas dans tes dates de présence")
    if sejour.commence(d.config, jour, creneau):
        raise Refus("ce repas a déjà commencé : il est figé")
    donnees = lire()
    donnees["decoches"] = [r for r in donnees["decoches"] if not (r["nom"] == d.nom and r["date"] == jour and r["creneau"] == creneau)]
    if not pris:
        donnees["decoches"].append({"nom": d.nom, "date": jour, "creneau": creneau, "quand": maintenant()})
    ecrire_json(REPAS, donnees)


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(REPAS, ancien, nouveau, {"nom"})
