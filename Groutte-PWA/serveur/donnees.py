"""Les fichiers de données propres à Groutte (data/*.json) et les réglages du forum (reglages/flairs.json, reactions.json).

Ceux du socle (comptes, profils, journal, lus, pings, annonces) sont dans socle/serveur/stockage.py, avec les dossiers,
verrou() et les outils de lecture et d'écriture.
"""
import json
import re

from stockage import DOSSIER_DONNEES, REGLAGES

FLAIRS = REGLAGES / "flairs.json"                 # flairs du forum (dans le dépôt, modifiés par le webmaster)
REACTIONS = REGLAGES / "reactions.json"           # réactions en texte du forum (dans le dépôt)
FORUM = DOSSIER_DONNEES / "forum.json"        # Communauté > Forum (forum.py)
PRESENCES = DOSSIER_DONNEES / "presences.json"   # Gîte > Présence : arrivée et départ de chacun (presence.py)
LITS = DOSSIER_DONNEES / "lits.json"          # Gîte > Lits : les réservations, nuit par nuit (lits.py)
REPAS = DOSSIER_DONNEES / "repas.json"        # Repas > Mes repas : les repas décochés (repas.py)
GITE_SALLE = DOSSIER_DONNEES / "gite-salle.json"   # Staff > Gîte et salle : montants, hébergeurs, lits... (gite_salle.py)
CREANCES = DOSSIER_DONNEES / "creances.json"  # Budget > Créances : paiements du gîte et de la salle, reports (creances.py)
DEPENSES = DOSSIER_DONNEES / "depenses.json"  # Budget > Dépenses (depenses.py)
CATEGORIES = DOSSIER_DONNEES / "categories.json"   # Staff > Réglages compta : catégories de dépenses (reglages_compta.py)
REGLAGES_COMPTA = DOSSIER_DONNEES / "reglages-compta.json"   # mode de remboursement, clôture
REMBOURSEMENTS = DOSSIER_DONNEES / "remboursements.json"     # Budget > Mes comptes : remboursements, grâces, relances
TACHES = DOSSIER_DONNEES / "taches.json"      # rappels datés : dernière vérification (taches.py)
MENUS = DOSSIER_DONNEES / "menus.json"        # Repas > Menu : les plats proposés et leurs inscrits (menu.py)
DETTES_MANUELLES = DOSSIER_DONNEES / "dettes-manuelles.json"   # Staff > Suivi des dépenses (suivi.py)
REGLAGES_LLM = DOSSIER_DONNEES / "reglages-llm.json"   # Staff > Réglages LLM : fournisseur actif, compteur (llm.py)


def lire_flairs():
    """Flairs du forum (flairs.json) : [{"nom", "couleur", "staff"}]. Les entrées invalides sont ignorées.
    `staff` : seul le staff peut publier avec ce flair."""
    try:
        liste = json.loads(FLAIRS.read_text(encoding="utf-8")).get("flairs", [])
    except (FileNotFoundError, ValueError, AttributeError):
        liste = []
    propres = []
    for f in liste:
        if (isinstance(f, dict) and isinstance(f.get("nom"), str) and 0 < len(f["nom"].strip()) <= 20
                and isinstance(f.get("couleur"), str) and re.fullmatch(r"#[0-9a-fA-F]{6}", f["couleur"])
                and f["nom"].strip() not in [p["nom"] for p in propres]):
            propres.append({"nom": f["nom"].strip(), "couleur": f["couleur"], "staff": f.get("staff") is True})
    return propres


def lire_reactions():
    """Réactions proposées sous les messages du forum (reactions.json), en texte. Les entrées invalides sont ignorées."""
    try:
        liste = json.loads(REACTIONS.read_text(encoding="utf-8")).get("reactions", [])
    except (FileNotFoundError, ValueError, AttributeError):
        liste = []
    propres = []
    for r in liste:
        if isinstance(r, str) and 0 < len(r.strip()) <= 8 and r.strip() not in propres:
            propres.append(r.strip())
    return propres or ["XD", "T_T", ":P", ">_<", ";)"]
