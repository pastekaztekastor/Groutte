"""Ce que la page affiche, vu par un compte donné : tout tient dans un seul objet JSON.

La page le reçoit à l'ouverture, toutes les 30 s, et en réponse à chaque action POST, puis redessine tout.
C'est ici qu'un module ajoute sa partie. Ce qu'un compte ne doit pas voir (données privées d'un autre) n'est
simplement pas envoyé : le filtrage se fait ici, jamais dans la page.

Avant la connexion (`nom` vide), seul le nécessaire à l'écran « Qui es-tu ? » part : les noms et les photos.
"""
import comptes_donnees as cd
import notifications
import staff
from comptes import regimes_proposes
from lus import non_lus
from stockage import ICI, PROFILS, lire_config, lire_json, lire_themes

CHAMPS_FICHE = ("prenom", "pseudo", "discord", "telephone", "allergies")


def version_appli():
    """Change dès qu'un fichier du site change (code ou page) : une page restée ouverte propose alors la mise à jour."""
    fichiers = list(ICI.glob("*.py")) + list(ICI.glob("*.json")) + [f for f in (ICI / "static").rglob("*") if f.is_file()]
    return str(int(max(f.stat().st_mtime for f in fichiers)))


def icones_dessinees():
    """Noms des icônes dessinées déposées dans static/icones/ui/ (<nom>.svg) : elles remplacent les pictogrammes."""
    dossier = ICI / "static" / "icones" / "ui"
    return sorted(f.stem for f in dossier.glob("*.svg")) if dossier.is_dir() else []


def carte_compte(nom, c, profil, complete):
    """Un compte tel que les autres le voient. `complete` : connecté (la fiche) ; sinon le nom et la photo."""
    carte = {
        "nom": nom,
        "couleur": profil.get("couleur") or c.get("couleur", ""),
        "avatar": "media/" + profil["avatar"] if profil.get("avatar") else None,
    }
    if complete:
        carte.update({cle: profil.get(cle, "") for cle in CHAMPS_FICHE})
        carte.update(
            staff=c["staff"], roles=c["roles"], muet=c["muet"], desactive=c["desactive"],
            regimes=profil.get("regimes", []), photo_ok=profil.get("photo_ok", True),
            categories=profil.get("categories", []), tournois=profil.get("tournois", []),
        )
    return carte


def etat(nom):
    config = lire_config()
    profils = lire_json(PROFILS, {})
    comptes = cd.lire_comptes(config)
    moi = comptes.get(nom) if nom else None
    connecte = bool(moi and not moi["desactive"])
    est_staff = connecte and moi["staff"]
    cartes = [carte_compte(n, c, profils.get(n, {}), connecte)
              for n, c in sorted(comptes.items(), key=lambda x: cd.sans_accent(x[0]))
              if connecte or not c["desactive"]]
    resultat = {
        "titre": config.get("titre", "Appli"),
        "nom_court": config.get("nom_court", config.get("titre", "Appli")[:12]),
        "comptes": cartes,
        "themes": lire_themes(config),
        "icones": icones_dessinees(),
        "version": version_appli(),
        "notifs": {"disponible": notifications.DISPONIBLE and config.get("notifications", True)},
    }
    if not connecte:
        return resultat
    profil = profils.get(nom, {})
    resultat.update({
        "moi": {
            "code_provisoire": moi["code_provisoire"],
            "paiement": profil.get("paiement", {}),
        },
        "roles": cd.lire_roles(),
        "regimes": regimes_proposes(config),
        "categories_partage": [],   # Réglages compta (jalon 2) : [{"id", "nom", "type": obligatoire|facultative, "sam"}]
        "tournois": [],             # Tournois (jalon 4) : [{"id", "nom"}]
        "non_lus": non_lus(nom),
    })
    resultat["notifs"].update({
        "cle": notifications.cle_publique(),
        "categories": notifications.categories(config),
        "prefs": notifications.preferences(config, profil),
        # Pour le staff : qui a activé les notifications (les autres ne recevront pas ses annonces).
        "abonnes": sorted(lire_json(notifications.ABONNEMENTS, {})) if est_staff else [],
    })
    if est_staff:
        resultat["journal"] = staff.journal()
    return resultat
