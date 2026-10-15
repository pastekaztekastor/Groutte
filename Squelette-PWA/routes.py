"""Registre des actions POST : chaque module décore ses fonctions avec @route("/api/...").

Une action reçoit une `Demande` (requetes.py), est appelée sous le verrou, vérifie les droits, écrit ses
fichiers, et peut lever `Refus`. Elle ne renvoie rien : app.py répond avec l'état complet du compte, que la
page redessine. Un module n'est enregistré que s'il est importé par app.py.
"""
ROUTES = {}


def route(chemin):
    def enregistrer(action):
        ROUTES[chemin] = action
        return action
    return enregistrer
