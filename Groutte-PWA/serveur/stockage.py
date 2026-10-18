"""Fichiers de données (data/*.json) et réglages (reglages/config.json, roles.json...).

L'appli est rangée en dossiers côte à côte (RACINE) : serveur/ (le code Python), reglages/ (ce que le webmaster
modifie, versionné), static/ (la page), et ceux que le serveur crée : data/ (les données) et secrets/ (les clés).

Toutes les données sont des fichiers JSON dans data/, lus à chaque requête et réécrits en entier (fichier
temporaire puis renommage : jamais de fichier à moitié écrit). Toutes les écritures passent par verrou().
Ajoute ici le chemin de chaque nouveau fichier de données.
"""
import fcntl
import json
import os
import re
import secrets
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path

SERVEUR = Path(__file__).resolve().parent     # serveur/ : ce code
RACINE = SERVEUR.parent                        # le dossier de l'appli : serveur/, reglages/, static/, data/, secrets/
REGLAGES = RACINE / "reglages"                 # config.json, roles.json, tournois.json... (versionnés)
STATIQUE = RACINE / "static"
CONFIG = REGLAGES / "config.json"
DOSSIER_DONNEES = RACINE / "data"
ROLES = REGLAGES / "roles.json"                   # liste des rôles et leur type (dans le dépôt, modifiée par le webmaster)
COMPTES = DOSSIER_DONNEES / "comptes.json"    # les comptes : code, staff, rôles, muet, désactivé (comptes_donnees.py)
PROFILS = DOSSIER_DONNEES / "profils.json"    # ce que chacun règle lui-même (fiche, couleur, photo, préférences)
JOURNAL = DOSSIER_DONNEES / "journal-staff.json"
LUS = DOSSIER_DONNEES / "lus.json"
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
PINGS = DOSSIER_DONNEES / "pings.json"        # Communauté > Pings reçus : chaque notification, par personne (pings.py)
ANNONCES = DOSSIER_DONNEES / "annonces.json"  # Staff > Annonces, et les messages courts au staff (annonces.py)
DETTES_MANUELLES = DOSSIER_DONNEES / "dettes-manuelles.json"   # Staff > Suivi des dépenses (suivi.py)
REGLAGES_LLM = DOSSIER_DONNEES / "reglages-llm.json"   # Staff > Réglages LLM : fournisseur actif, compteur (llm.py)
DOSSIER_SECRETS = RACINE / "secrets"           # hors de data/ et de git : les clés d'API des LLM (llm.py)
VERROU = DOSSIER_DONNEES / ".verrou"


def lire_json(chemin, defaut):
    try:
        return json.loads(chemin.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return defaut


def ecrire_json(chemin, donnees):
    temporaire = chemin.with_suffix(".tmp")
    temporaire.write_text(json.dumps(donnees, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    os.replace(temporaire, chemin)


@contextmanager
def verrou():
    """Toutes les écritures passent par ce verrou : Passenger peut lancer plusieurs processus."""
    DOSSIER_DONNEES.mkdir(exist_ok=True)
    with open(VERROU, "w") as fichier:
        fcntl.flock(fichier, fcntl.LOCK_EX)
        yield


def lire_config():
    return json.loads(CONFIG.read_text(encoding="utf-8"))


THEME_DEFAUT = {"nom": "Persian plum", "couleur": "#5c1f2e", "texte": "#fdfdfc"}


def lire_themes(config):
    """Thèmes de config.json : [{"nom", "couleur", "texte"}] en #rrggbb (« texte » : couleur du texte posé sur la
    couleur). Entrées invalides ignorées ; sans thème valide, un défaut."""
    hexa = lambda c: isinstance(c, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", c)  # noqa: E731
    propres = []
    for t in config.get("themes", []):
        if not isinstance(t, dict) or not isinstance(t.get("nom"), str) or not t["nom"].strip():
            continue
        texte = t.get("texte", "#fdfdfc")
        if hexa(t.get("couleur")) and hexa(texte):
            propres.append({"nom": t["nom"].strip(), "couleur": t["couleur"].lower(), "texte": texte.lower()})
    return propres or [THEME_DEFAUT]


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


def maintenant():
    """Horodatage des créations et lectures (comparables entre eux comme du texte)."""
    return datetime.now().isoformat(timespec="seconds")


def aujourdhui():
    return date.today().isoformat()


def nouvel_id():
    """8 caractères hexadécimaux : l'identifiant de tout ce qui est créé (lus.py s'y attend)."""
    return secrets.token_hex(4)


def sans_accent(texte):
    """Minuscules sans accents : pour comparer des noms (« Chloé » et « chloe » sont le même nom)."""
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", texte) if unicodedata.category(c) != "Mn").lower()
