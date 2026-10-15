"""Ce que chacun a déjà vu : les pastilles « nouveau » (panneau, listes, éléments).

Suivi par compte côté serveur (data/lus.json), pour que ce qui est lu sur le téléphone le soit aussi sur
l'ordinateur : {nom: {"_depuis": horodatage, "<type>": horodatage, "<type>/<id>": horodatage}}.
Seul ce que les autres ont fait compte comme nouveau.

Chaque module déclare son compteur :

    @compteur("notes")
    def nouvelles_notes(nom, vu):
        # vu("notes/<id>") : quand ce compte a ouvert cet élément pour la dernière fois ("" si jamais)
        return {id: nombre de nouveautés}      # ou un nombre, ou un booléen pour une page entière

L'état envoie non_lus = {"notes": {...}, ...} ; la page appelle /api/lu avec la clé de ce qu'elle ouvre.
"""
import re

from requetes import Refus
from routes import route
from stockage import LUS, ecrire_json, lire_json, maintenant

COMPTEURS = {}   # type -> fonction(nom, vu)


def compteur(genre):
    def enregistrer(fonction):
        COMPTEURS[genre] = fonction
        return fonction
    return enregistrer


def non_lus(nom):
    """{type: résultat de son compteur} pour le compte `nom`."""
    vus = lire_json(LUS, {}).get(nom)
    if vus is None:
        # Premier passage : rien n'est « nouveau » (tout serait plus récent que jamais) ; la page initialise le suivi.
        rien = lambda cle: "9999"  # noqa: E731
        return dict({genre: f(nom, rien) for genre, f in COMPTEURS.items()}, initialiser=True)
    depuis = vus.get("_depuis", "")
    vu = lambda cle: max(vus.get(cle, ""), depuis)  # noqa: E731
    return {genre: f(nom, vu) for genre, f in COMPTEURS.items()}


@route("/api/lu")
def marquer_lu(d):
    """`cle` : "<type>" ou "<type>/<id 8 hex>". Sans clé : tout est marqué comme lu (premier passage)."""
    lus = lire_json(LUS, {})
    vus = lus.setdefault(d.nom, {})
    cle = d.corps.get("cle")
    if cle is None:
        lus[d.nom] = {"_depuis": maintenant()}
    elif isinstance(cle, str) and re.fullmatch(r"[a-z]+(/[0-9a-f]{8})?", cle) and cle.split("/")[0] in COMPTEURS:
        vus[cle] = maintenant()
        vus.setdefault("_depuis", "")
    else:
        raise Refus("clé invalide")
    ecrire_json(LUS, lus)
