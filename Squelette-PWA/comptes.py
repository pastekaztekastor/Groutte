"""Ce que chacun règle sur son compte : couleur de thème, photo, notifications ; et les annonces de l'admin.

data/profils.json : {nom: {"couleur": "#rrggbb", "avatar": "<média>", "notifs": {categorie: bool}}}
"""
import re

import medias
import notifications
from notifications import notifier
from requetes import Refus, compte, texte
from routes import route
from stockage import PROFILS, ecrire_json, lire_json


@route("/api/profil")
def modifier_profil(d):
    """Chacun ne modifie que son profil. Seules les clés envoyées sont changées."""
    profils = lire_json(PROFILS, {})
    profil = profils.setdefault(d.nom, {})
    if "couleur" in d.corps:
        couleur = d.corps["couleur"]
        if not isinstance(couleur, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", couleur):
            raise Refus("couleur invalide")
        profil["couleur"] = couleur.lower()
    ecrire_json(PROFILS, profils)


def changer_avatar(nom, fichier):
    """Appelé sous le verrou après l'envoi d'une photo de profil (app.py, televerser) : remplace l'ancienne."""
    profils = lire_json(PROFILS, {})
    profil = profils.setdefault(nom, {})
    ancien = profil.get("avatar")
    profil["avatar"] = fichier
    ecrire_json(PROFILS, profils)
    medias.supprimer(ancien)


@route("/api/avatar/supprimer")
def supprimer_avatar(d):
    profils = lire_json(PROFILS, {})
    ancien = profils.get(d.nom, {}).pop("avatar", None)
    ecrire_json(PROFILS, profils)
    medias.supprimer(ancien)


# --- Notifications --------------------------------------------------------------------

def exiger_notifications():
    if not notifications.DISPONIBLE:
        raise Refus("notifications indisponibles sur ce serveur (module cryptography manquant)")


@route("/api/notifs/abonner")
def abonner(d):
    """Enregistre l'appareil (abonnement du navigateur) de ce compte."""
    exiger_notifications()
    abonnement = d.corps.get("abonnement")
    try:
        endpoint, cles = abonnement["endpoint"], abonnement["keys"]
        propre = {"endpoint": endpoint, "keys": {"p256dh": cles["p256dh"], "auth": cles["auth"]}}
        valide = endpoint.startswith("https://") and len(endpoint) < 1000 and all(
            isinstance(v, str) and 0 < len(v) < 200 for v in propre["keys"].values())
    except (TypeError, KeyError, AttributeError):
        valide = False
    if not valide:
        raise Refus("abonnement invalide")
    notifications.abonner(d.nom, propre)


@route("/api/notifs/desabonner")
def desabonner(d):
    endpoint = d.corps.get("endpoint")
    if isinstance(endpoint, str):
        notifications.desabonner(endpoint)


@route("/api/notifs/prefs")
def regler_notifications(d):
    prefs = d.corps.get("prefs")
    if not isinstance(prefs, dict):
        raise Refus("préférences invalides")
    profils = lire_json(PROFILS, {})
    reglees = profils.setdefault(d.nom, {}).setdefault("notifs", {})
    for categorie in notifications.categories(d.config):
        if categorie in prefs:
            reglees[categorie] = bool(prefs[categorie])
    ecrire_json(PROFILS, profils)


@route("/api/notifs/test")
def tester_notifications(d):
    exiger_notifications()
    notifier(d.config, None, "Test", "Les notifications marchent sur cet appareil.", "#notifications", destinataires=[d.nom])


@route("/api/notifs/annonce")
def annoncer(d):
    """Annonce de l'admin, quelles que soient les préférences : à tous, ou aux comptes choisis (`destinataires`)."""
    d.exiger_admin()
    exiger_notifications()
    destinataires = d.corps.get("destinataires")
    if destinataires is not None:
        if not isinstance(destinataires, list) or not destinataires:
            raise Refus("choisis au moins un destinataire")
        destinataires = {compte(d.config, {"nom": nom}, "nom") for nom in destinataires}
    notifier(d.config, None, "Annonce", texte(d.corps, "texte", 240, requis=True), "#",
             destinataires=destinataires, sauf=d.nom)
