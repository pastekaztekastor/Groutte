"""Ce que la page affiche, vu par un compte donné : tout tient dans un seul objet JSON.

La page le reçoit à l'ouverture, toutes les 30 s, et en réponse à chaque action POST, puis redessine tout.
C'est ici qu'un module ajoute sa partie (ex. "notes": resumes(...)). Ce qu'un compte ne doit pas voir
(données privées d'un autre) n'est simplement pas envoyé : le filtrage se fait ici, jamais dans la page.
"""
import notifications
from acces import code_admin
from lus import non_lus
from notes import lire_notes, resumes as resumes_notes
from stockage import ICI, PROFILS, est_admin, lire_config, lire_json, lire_themes


def version_appli():
    """Change dès qu'un fichier du site change (code ou page) : une page restée ouverte propose alors la mise à jour."""
    fichiers = list(ICI.glob("*.py")) + [f for f in (ICI / "static").rglob("*") if f.is_file()]
    return str(int(max(f.stat().st_mtime for f in fichiers)))


def icones_dessinees():
    """Noms des icônes dessinées déposées dans static/icones/ui/ (<nom>.svg) : elles remplacent les pictogrammes."""
    dossier = ICI / "static" / "icones" / "ui"
    return sorted(f.stem for f in dossier.glob("*.svg")) if dossier.is_dir() else []


def etat(nom):
    config = lire_config()
    profils = lire_json(PROFILS, {})
    admin = est_admin(config, nom)
    comptes = []
    for c in config["comptes"]:
        profil = profils.get(c["nom"], {})
        comptes.append({
            "nom": c["nom"],
            "couleur": profil.get("couleur") or c.get("couleur", ""),
            "avatar": "media/" + profil["avatar"] if profil.get("avatar") else None,
            "admin": bool(c.get("admin")),
        })
    return {
        "titre": config.get("titre", "Appli"),
        "nom_court": config.get("nom_court", config.get("titre", "Appli")[:12]),
        "comptes": comptes,
        "themes": lire_themes(config),
        "notes": resumes_notes(lire_notes()),
        "non_lus": non_lus(nom) if nom else {},
        "notifs": {
            "disponible": notifications.DISPONIBLE and config.get("notifications", True),
            "cle": notifications.cle_publique(),
            "categories": notifications.categories(config),
            "prefs": notifications.preferences(config, profils.get(nom, {})),
            # Pour l'admin : qui a activé les notifications (les autres ne recevront pas ses annonces).
            "abonnes": sorted(lire_json(notifications.ABONNEMENTS, {})) if admin else [],
        },
        "icones": icones_dessinees(),
        "code_admin": bool(code_admin(config)),
        "version": version_appli(),
    }
