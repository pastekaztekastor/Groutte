"""Repas > Mes repas : les repas que je prends sur la réserve communautaire (les courses du groupe).

Seuls les repas gérés par la communauté comptent (Réglages compta, reglages_compta.regle_repas) : un repas géré suit le
défaut de son créneau (coché ou non) tant que je n'ai rien choisi ; un repas Non géré ne compte jamais.

data/repas.json : {"choix": [{"nom", "date", "creneau", "pris": bool, "quand"}]} : les repas que j'ai cochés ou décochés
moi-même. (L'ancien format, {"decoches": [...]}, est relu comme des choix « pris : false ».) Un repas se modifie jusqu'à
ce qu'il commence (config.json > heures_repas), ensuite il est figé. La catégorie au prorata des repas (compta.py) et le
Menu (menu.py) s'en servent ; le Menu écrit aussi ici (poser).
"""
import comptes_donnees as cd
import compta
import sejour
from requetes import Refus
from routes import route
from stockage import REPAS, ecrire_json, lire_json, maintenant


def lire():
    donnees = lire_json(REPAS, {})
    choix = donnees.setdefault("choix", [])
    for r in donnees.pop("decoches", []):
        choix.append({"nom": r["nom"], "date": r["date"], "creneau": r["creneau"], "pris": False, "quand": r.get("quand", "")})
    return donnees


def choix_de(donnees):
    """{(nom, date, créneau): pris} : les choix explicites."""
    return {(r["nom"], r["date"], r["creneau"]): r["pris"] for r in donnees["choix"]}


def apres_presence(nom, possibles):
    """Mes dates ont changé : mes choix hors de mes nouvelles dates disparaissent avec elles."""
    donnees = lire()
    garde = [r for r in donnees["choix"] if r["nom"] != nom or (r["date"], r["creneau"]) in possibles]
    if len(garde) != len(donnees["choix"]):
        donnees["choix"] = garde
        ecrire_json(REPAS, donnees)


def verifier(c, nom, jour, creneau):
    """Le repas peut-il être coché ou décoché par `nom` maintenant ? Lève Refus sinon."""
    if c.cloture():
        raise Refus("les comptes sont clôturés")
    if (jour, creneau) not in c.repas_possibles(nom):
        raise Refus("ce repas n'est pas dans tes dates de présence")
    if not c.regle_repas(jour, creneau)["gere"]:
        raise Refus("ce repas n'est pas géré par la communauté : chacun se débrouille")
    if sejour.commence(c.config, jour, creneau):
        raise Refus("ce repas a déjà commencé : il est figé")


def poser(nom, jour, creneau, pris):
    """Enregistre mon choix pour ce repas (déjà vérifié)."""
    donnees = lire()
    donnees["choix"] = [r for r in donnees["choix"] if not (r["nom"] == nom and r["date"] == jour and r["creneau"] == creneau)]
    donnees["choix"].append({"nom": nom, "date": jour, "creneau": creneau, "pris": pris, "quand": maintenant()})
    ecrire_json(REPAS, donnees)


@route("/api/repas")
def cocher(d):
    """`pris` : true, je mange sur la réserve à ce repas ; false, je n'y mange pas (et je me désinscris de ses menus)."""
    jour, creneau, pris = d.corps.get("date"), d.corps.get("creneau"), d.corps.get("pris")
    if not isinstance(pris, bool):
        raise Refus("pris : oui ou non ?")
    verifier(compta.Compta(d.config), d.nom, jour, creneau)
    poser(d.nom, jour, creneau, pris)
    if not pris:
        import menu   # import ici : menu importe ce module
        menu.desinscrire_repas(d.config, d.nom, jour, creneau)


@cd.renommage
def renommer(ancien, nouveau):
    donnees = lire()
    ecrire_json(REPAS, cd.renommer_dans(donnees, ancien, nouveau, {"nom"}))
