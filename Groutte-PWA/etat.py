"""Ce que la page affiche, vu par un compte donné : tout tient dans un seul objet JSON.

La page le reçoit à l'ouverture, toutes les 30 s, et en réponse à chaque action POST, puis redessine tout.
C'est ici qu'un module ajoute sa partie. Ce qu'un compte ne doit pas voir (données privées d'un autre) n'est
simplement pas envoyé : le filtrage se fait ici, jamais dans la page.

Avant la connexion (`nom` vide), seul le nécessaire à l'écran « Qui es-tu ? » part : les noms et les photos.
"""
import comptes_donnees as cd
import compta
import creances
import depenses
import forum
import gite_salle
import lits
import mes_comptes
import notifications
import reglages_compta
import sejour
import staff
from comptes import regimes_proposes
from lus import non_lus
from stockage import ICI, PROFILS, lire_config, lire_flairs, lire_json, lire_reactions, lire_themes

CHAMPS_FICHE = ("prenom", "pseudo", "discord", "telephone", "allergies")


def version_appli():
    """Change dès qu'un fichier du site change (code ou page) : une page restée ouverte propose alors la mise à jour."""
    fichiers = list(ICI.glob("*.py")) + list(ICI.glob("*.json")) + [f for f in (ICI / "static").rglob("*") if f.is_file()]
    return str(int(max(f.stat().st_mtime for f in fichiers)))


def icones_dessinees():
    """Noms des icônes dessinées déposées dans static/icones/ui/ (<nom>.svg) : elles remplacent les pictogrammes."""
    dossier = ICI / "static" / "icones" / "ui"
    return sorted(f.stem for f in dossier.glob("*.svg")) if dossier.is_dir() else []


def carte_compte(nom, c, profil, complete, hebergeurs=()):
    """Un compte tel que les autres le voient. `complete` : connecté (la fiche) ; sinon le nom et la photo.
    Le rôle automatique Hébergeur (Gîte et salle) s'ajoute à ses rôles."""
    carte = {
        "nom": nom,
        "couleur": profil.get("couleur") or c.get("couleur", ""),
        "avatar": "media/" + profil["avatar"] if profil.get("avatar") else None,
    }
    if complete:
        carte.update({cle: profil.get(cle, "") for cle in CHAMPS_FICHE})
        carte.update(
            staff=c["staff"], muet=c["muet"], desactive=c["desactive"],
            roles=c["roles"] + (["hebergeur"] if nom in hebergeurs and "hebergeur" not in c["roles"] else []),
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
    hebergeurs = set(gite_salle.hebergeurs().values()) if connecte else set()
    cartes = [carte_compte(n, c, profils.get(n, {}), connecte, hebergeurs)
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
        "tournois": [],             # Tournois (jalon 4) : [{"id", "nom"}]
        "non_lus": non_lus(nom),
        "discord_gestion": config.get("discord_gestion", ""),
        "forum": forum.resumes(forum.lire_forum(), nom),
        "flairs": lire_flairs(),
        "reactions": lire_reactions(),
    })
    resultat.update(etat_sejour(config, nom, est_staff))
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


def etat_sejour(config, nom, est_staff):
    """Gîte, repas et budget : tout vient d'un seul calcul (compta.py)."""
    c = compta.Compta(config)
    debut, fin = sejour.bornes(config)
    presences = {}
    for n, p in c.presences.items():
        if n in c.actifs:
            presences[n] = {"arrivee": p["arrivee"], "depart": p["depart"], "hors": sejour.hors_sejour(config, p),
                            "decoches": [[r["date"], r["creneau"]] for r in c.repas["decoches"] if r["nom"] == n]}
    utilisees = {l.get("categorie") for dep in c.deps["depenses"] for l in dep["lignes"]}
    vue_compta = mes_comptes.vue(c, nom)
    # Les moyens de paiement de ceux que je dois payer : les hébergeurs (si j'ai une part) et mes créanciers.
    a_payer = {c.hebergeur(q) for q in gite_salle.QUOI if c.parts(q).get(nom)} | {l["nom"] for l in vue_compta["je_dois"]}
    a_payer.discard("")
    return {
        "sejour": {"debut": debut, "fin": fin, "jours": sejour.jours(config), "nuits": sejour.nuits(config),
                   "heures_repas": {cr: sejour.heure_debut(config, debut, cr).strftime("%H:%M") for cr in sejour.REPAS}},
        "presences": presences,
        "gite": gite_salle.vue(c, nom, est_staff),
        "reservations": lits.vue(c, nom),
        "creances": creances.vue(c, nom, est_staff),
        "compta": vue_compta,
        "depenses": depenses.vue(c, nom, est_staff),
        "categories": reglages_compta.vue(utilisees),
        "paiements_de": {n: c.profils.get(n, {}).get("paiement", {}) for n in sorted(a_payer)},
    }
