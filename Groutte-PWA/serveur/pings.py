"""Communauté > Pings reçus : toutes les notifications qu'on m'a envoyées, même balayées, ou jamais reçues parce que mes
notifications sont coupées. Personne ne rate une annonce du staff ou une relance.

data/pings.json : {nom: [{"id", "quand", "genre": "annonce" | "relance" | "autre", "titre", "texte", "lien", "de", "lu"}]},
les plus anciens d'abord, PAR_PERSONNE au plus par compte.

Ce module n'écrit rien de lui-même : notifications.notifier() appelle garder() pour chaque notification, qu'elle parte
ou non (pas d'appareil abonné, catégorie coupée). C'est donc appelé sous le verrou, comme notifier().
"""
import comptes_donnees as cd
from requetes import Refus
from routes import route
from stockage import PINGS, ecrire_json, lire_json, maintenant, nouvel_id

PAR_PERSONNE = 300
GENRES = ("annonce", "relance", "autre")


def lire():
    return lire_json(PINGS, {})


def garder(config, noms, titre, texte, lien, genre="autre", de=None):
    """Range une notification dans les pings de chacun de `noms` (des comptes actifs)."""
    actifs = cd.noms_actifs(config)
    noms = [n for n in noms if n in actifs]
    if not noms:
        return
    pings = lire()
    quand = maintenant()
    for nom in noms:
        liste = pings.setdefault(nom, [])
        liste.append({"id": nouvel_id(), "quand": quand, "genre": genre if genre in GENRES else "autre",
                      "titre": titre, "texte": texte[:240], "lien": lien or "#", "de": de or "", "lu": False})
        del liste[:-PAR_PERSONNE]
    ecrire_json(PINGS, pings)


@route("/api/pings/lu")
def marquer_lus(d):
    """`ids` : ces pings passent en lu ; `tout` : tous mes pings."""
    pings = lire()
    miens = pings.get(d.nom, [])
    if d.corps.get("tout"):
        cibles = None
    else:
        ids = d.corps.get("ids")
        if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
            raise Refus("pings invalides")
        cibles = set(ids)
    change = False
    for p in miens:
        if not p["lu"] and (cibles is None or p["id"] in cibles):
            p["lu"] = True
            change = True
    if change:
        ecrire_json(PINGS, pings)


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(PINGS, ancien, nouveau, {"de"})


def vue(nom):
    """Mes pings, les plus récents d'abord."""
    return list(reversed(lire().get(nom, [])))[:150]
