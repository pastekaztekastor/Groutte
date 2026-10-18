"""Ce que la page affiche, vu par un compte donné : tout tient dans un seul objet JSON.

La page le reçoit à l'ouverture, toutes les 30 s, et en réponse à chaque action POST, puis redessine tout.
C'est ici qu'un module ajoute sa partie. Ce qu'un compte ne doit pas voir (données privées d'un autre) n'est
simplement pas envoyé : le filtrage se fait ici, jamais dans la page.

Avant la connexion (`nom` vide), seul le nécessaire à l'écran « Qui es-tu ? » part : les noms et les photos.
"""
import annonces
import comptes_donnees as cd
import compta
import creances
import depenses
import forum
import gite_salle
import lits
import llm
import menu
import mes_comptes
import notifications
import pings
import reglages_compta
import sejour
import staff
import suivi
import tournois
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


def carte_compte(nom, c, profil, complete, automatiques=None, abonnes=()):
    """Un compte tel que les autres le voient. `complete` : connecté (la fiche) ; sinon le nom et la photo.
    Les rôles automatiques (Hébergeur de Gîte et salle, Chef du Menu) s'ajoutent à ses rôles : `automatiques`,
    {id du rôle: noms}. `notifs` : il a au moins un appareil abonné (sinon, prévenir aussi autrement)."""
    carte = {
        "nom": nom,
        "couleur": profil.get("couleur") or c.get("couleur", ""),
        "avatar": "media/" + profil["avatar"] if profil.get("avatar") else None,
    }
    if complete:
        carte.update({cle: profil.get(cle, "") for cle in CHAMPS_FICHE})
        carte.update(
            staff=c["staff"], muet=c["muet"], desactive=c["desactive"],
            roles=c["roles"] + [r for r, noms in (automatiques or {}).items() if nom in noms and r not in c["roles"]],
            regimes=profil.get("regimes", []), photo_ok=profil.get("photo_ok", True),
            categories=profil.get("categories", []), tournois=profil.get("tournois", []),
            matelas=profil.get("matelas"), duvets=profil.get("duvets"), notifs=nom in abonnes,
        )
    return carte


def etat(nom):
    config = lire_config()
    profils = lire_json(PROFILS, {})
    comptes = cd.lire_comptes(config)
    moi = comptes.get(nom) if nom else None
    connecte = bool(moi and not moi["desactive"])
    est_staff = connecte and moi["staff"]
    automatiques = {"hebergeur": set(gite_salle.hebergeurs().values()), "chef": menu.chefs(), **tournois.automatiques(profils)} if connecte else {}
    abonnes = set(lire_json(notifications.ABONNEMENTS, {})) if connecte else set()
    cartes = [carte_compte(n, c, profils.get(n, {}), connecte, automatiques, abonnes)
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
            "guide_vu": bool(profil.get("guide_vu")),
            "paiement": profil.get("paiement", {}),
        },
        "pings": pings.vue(nom),
        "roles": cd.lire_roles() + tournois.roles(),
        "regimes": regimes_proposes(config),
        "tournois": tournois.vue(profils),   # Tournois > Inscription : [{..., "inscrits": [noms]}]
        "non_lus": non_lus(nom),
        "discord_gestion": config.get("discord_gestion", ""),
        "forum": forum.resumes(forum.lire_forum(), nom),
        "flairs": lire_flairs(),
        "reactions": lire_reactions(),
    })
    resultat.update(etat_sejour(config, nom, est_staff))
    resultat.update(llm.vue(config, est_staff))
    resultat["notifs"].update({
        "cle": notifications.cle_publique(),
        "categories": notifications.categories(config),
        "prefs": notifications.preferences(config, profil),
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
        if n in c.actifs and "arrivee" in p:
            presences[n] = {"arrivee": p["arrivee"], "depart": p["depart"], "hors": sejour.hors_sejour(config, p),
                            "repas": [list(x) for x in c.repas_pris(n)]}
    # Les repas gérés par la communauté (« date/créneau »), chacun selon le réglage en vigueur quand il commence.
    geres = [f"{j}/{cr}" for j in sejour.jours(config) for cr in sejour.REPAS if c.regle_repas(j, cr)["gere"]]
    utilisees = {l.get("categorie") for dep in c.deps["depenses"] for l in dep["lignes"]}
    vue_compta = mes_comptes.vue(c, nom)
    # Les moyens de paiement de ceux que je dois payer : les hébergeurs (si j'ai une part) et mes créanciers.
    a_payer = {c.hebergeur(q) for q in gite_salle.QUOI if c.parts(q).get(nom)} | {l["nom"] for l in vue_compta["je_dois"]}
    a_payer.discard("")
    resultat = {
        "sejour": {"debut": debut, "fin": fin, "jours": sejour.jours(config), "nuits": sejour.nuits(config),
                   "heures_repas": {cr: sejour.heure_debut(config, debut, cr).strftime("%H:%M") for cr in sejour.REPAS},
                   "repas_geres": geres},
        "presences": presences,
        "ne_vient_pas": "ne_vient_pas" in c.presences.get(nom, {}),
        "gite": gite_salle.vue(c, nom, est_staff),
        "reservations": lits.vue(c, nom),
        "creances": creances.vue(c, nom, est_staff),
        "compta": vue_compta,
        "depenses": depenses.vue(c, nom, est_staff),
        "categories": reglages_compta.vue(utilisees, c.reglages),
        "paiements_de": {n: c.profils.get(n, {}).get("paiement", {}) for n in sorted(a_payer)},
        "literie": lits.bilan(c),
        "sans_literie": lits.sans_literie(c),
        "menus": menu.vue(),
        "annonces": annonces.vue(c, nom, est_staff),
    }
    if est_staff:
        resultat["suivi"] = suivi.vue(c)
    return resultat
