"""Fichiers de données (data/*.json) et configuration (config.json).

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

ICI = Path(__file__).resolve().parent
CONFIG = ICI / "config.json"
DOSSIER_DONNEES = ICI / "data"
ROLES = ICI / "roles.json"                     # liste des rôles et leur type (dans le dépôt, modifiée par le webmaster)
COMPTES = DOSSIER_DONNEES / "comptes.json"    # les comptes : code, staff, rôles, muet, désactivé (comptes_donnees.py)
PROFILS = DOSSIER_DONNEES / "profils.json"    # ce que chacun règle lui-même (fiche, couleur, photo, préférences)
JOURNAL = DOSSIER_DONNEES / "journal-staff.json"
LUS = DOSSIER_DONNEES / "lus.json"
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
