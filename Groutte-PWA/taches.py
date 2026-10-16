"""Les rappels datés, sans tâche planifiée : vérifiés au chargement de l'état (GET /api/etat), sous le verrou, au plus
une fois toutes les 5 minutes. Chaque module note ce qu'il a envoyé, pour ne jamais l'envoyer deux fois.

- creances.rappeler : rappels de paiement du gîte et de la salle, et message de la date limite ;
- mes_comptes.rappeler : dernière notification avant la confirmation d'office d'un remboursement, puis la confirmation.

data/taches.json : {"derniere": horodatage}
"""
import sys
import traceback
from datetime import datetime, timedelta

import creances
import mes_comptes
from stockage import TACHES, ecrire_json, lire_json, maintenant, verrou

INTERVALLE = timedelta(minutes=5)


def verifier(config):
    derniere = lire_json(TACHES, {}).get("derniere", "")
    if derniere and datetime.now() - datetime.fromisoformat(derniere) < INTERVALLE:
        return
    with verrou():
        derniere = lire_json(TACHES, {}).get("derniere", "")
        if derniere and datetime.now() - datetime.fromisoformat(derniere) < INTERVALLE:
            return
        ecrire_json(TACHES, {"derniere": maintenant()})
        for rappeler in (creances.rappeler, mes_comptes.rappeler):
            try:
                rappeler(config)
            except Exception:   # un rappel raté ne doit jamais empêcher la page de s'afficher
                traceback.print_exc(file=sys.stderr)
