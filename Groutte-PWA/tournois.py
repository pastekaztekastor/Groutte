"""Tournois > Inscription : les tournois proposés (tournois.json, dans le dépôt, modifié par le webmaster) et qui s'y
inscrit (data/profils.json, « tournois » : [id]). Chaque tournoi donne un rôle à ses inscrits, comme Chef ou
Hébergeur : un rôle automatique, affiché dans le carnet d'adresses, sans aucun droit sur l'appli.
"""
import json

from requetes import Refus
from routes import route
from stockage import ICI, PROFILS, ecrire_json, lire_json

FICHIER = ICI / "tournois.json"


def lire():
    """[{"id", "nom", "role": {"id", "nom"}, "description", "prerequis": [..], "jeux": [{"nom", "steam"}]}] ; les
    entrées invalides sont ignorées, comme pour roles.json."""
    try:
        brut = json.loads(FICHIER.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return []
    tournois = []
    for t in brut.get("tournois", []) if isinstance(brut, dict) else []:
        role = t.get("role") if isinstance(t, dict) else None
        if not (isinstance(t.get("id"), str) and isinstance(t.get("nom"), str) and isinstance(role, dict)
                and isinstance(role.get("id"), str) and isinstance(role.get("nom"), str)):
            continue
        tournois.append({
            "id": t["id"], "nom": t["nom"], "role": {"id": role["id"], "nom": role["nom"]},
            "description": t.get("description", "") if isinstance(t.get("description"), str) else "",
            "prerequis": [p for p in t.get("prerequis", []) if isinstance(p, str)],
            "jeux": [{"nom": j["nom"], "steam": j.get("steam", "") if str(j.get("steam", "")).startswith("https://") else ""}
                     for j in t.get("jeux", []) if isinstance(j, dict) and isinstance(j.get("nom"), str)],
        })
    return tournois


def inscrits(profils, tournois=None):
    """{id du tournoi: [noms]}."""
    return {t["id"]: sorted(n for n, p in profils.items() if t["id"] in p.get("tournois", []))
            for t in (tournois if tournois is not None else lire())}


def roles(tournois=None):
    """Les rôles des tournois, au format de roles.json (automatiques)."""
    return [{"id": t["role"]["id"], "nom": t["role"]["nom"], "type": "automatique", "source": "tournois"}
            for t in (tournois if tournois is not None else lire())]


def automatiques(profils):
    """{id du rôle: noms des inscrits}, pour les cartes des comptes (etat.py)."""
    tournois = lire()
    par_tournoi = inscrits(profils, tournois)
    return {t["role"]["id"]: set(par_tournoi[t["id"]]) for t in tournois}


@route("/api/tournois/inscription")
def inscription(d):
    """Je m'inscris (`inscrit` : true) ou me désinscris d'un tournoi."""
    ident = d.corps.get("tournoi")
    if not any(t["id"] == ident for t in lire()):
        raise Refus("tournoi inconnu")
    profils = lire_json(PROFILS, {})
    profil = profils.setdefault(d.nom, {})
    miens = [x for x in profil.get("tournois", []) if x != ident]
    profil["tournois"] = miens + [ident] if d.corps.get("inscrit") else miens
    ecrire_json(PROFILS, profils)


def vue(profils):
    """Les tournois, chacun avec ses inscrits."""
    tournois = lire()
    par_tournoi = inscrits(profils, tournois)
    return [dict(t, inscrits=par_tournoi[t["id"]]) for t in tournois]
