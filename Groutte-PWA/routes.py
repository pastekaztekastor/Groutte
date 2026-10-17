"""Registre des actions POST : chaque module décore ses fonctions avec @route("/api/...").

Une action reçoit une `Demande` (requetes.py), est appelée sous le verrou, vérifie les droits, écrit ses
fichiers, et peut lever `Refus`. Elle ne renvoie rien : app.py répond avec l'état complet du compte, que la
page redessine. Un module n'est enregistré que s'il est importé par app.py.

Une action lente (un appel à un LLM, jusqu'à 30 s) se déclare avec `sans_verrou=True` : app.py l'appelle hors du
verrou, pour ne pas bloquer tout le monde pendant l'attente. Elle prend alors elle-même `verrou()` pour écrire.
"""
ROUTES = {}
SANS_VERROU = set()


def route(chemin, sans_verrou=False):
    def enregistrer(action):
        ROUTES[chemin] = action
        if sans_verrou:
            SANS_VERROU.add(chemin)
        return action
    return enregistrer
