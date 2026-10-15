"""Code de l'admin (config.json > code_admin, 4 chiffres).

Les comptes n'ont pas de mot de passe : on choisit le sien. Le compte admin, lui, demande son code à la
connexion ; le serveur remet alors un jeton à l'appareil (data/acces.json), que la page joint à chaque demande
(en-tête X-Jeton). Sans jeton valable, rien ne se fait au nom de l'admin, pas même lire l'état.
Après 5 codes faux, le compte est bloqué 5 minutes. Sans code_admin dans la config, rien ne change.
"""
import hmac
import re
import secrets
import time

from requetes import Refus
from stockage import DOSSIER_DONNEES, ecrire_json, est_admin, lire_json, noms_comptes, verrou

ACCES = DOSSIER_DONNEES / "acces.json"
ESSAIS_MAX = 5
BLOCAGE_SECONDES = 300


def code_admin(config):
    """Le code configuré, ou "" s'il n'y en a pas (ou s'il n'a pas 4 chiffres)."""
    code = str(config.get("code_admin", "")).strip()
    return code if re.fullmatch(r"\d{4}", code) else ""


def exiger_jeton(config, nom, jeton):
    """Refuse (401) une demande au nom de l'admin sans jeton valable, quand un code est configuré."""
    if not code_admin(config) or not est_admin(config, nom):
        return
    if not jeton or lire_json(ACCES, {}).get("jetons", {}).get(jeton) != nom:
        raise Refus("code admin demandé", "401 Unauthorized")


def connexion(config, nom, code):
    """Vérifie le code de l'admin et renvoie un nouveau jeton ("" pour les autres comptes, qui n'en ont pas besoin)."""
    if nom not in noms_comptes(config):
        raise Refus("compte inconnu")
    attendu = code_admin(config)
    if not attendu or not est_admin(config, nom):
        return {"jeton": ""}
    with verrou():
        acces = lire_json(ACCES, {})
        echec = acces.setdefault("echecs", {}).get(nom, {"nombre": 0, "jusqua": 0})
        reste = int(echec["jusqua"] - time.time())
        if reste > 0:
            raise Refus(f"trop d'essais : réessaie dans {reste // 60 + 1} min", "429 Too Many Requests")
        if not hmac.compare_digest(str(code), attendu):
            nombre = echec["nombre"] + 1
            acces["echecs"][nom] = ({"nombre": 0, "jusqua": time.time() + BLOCAGE_SECONDES} if nombre >= ESSAIS_MAX
                                    else {"nombre": nombre, "jusqua": 0})
            ecrire_json(ACCES, acces)
            raise Refus("code incorrect", "401 Unauthorized")
        acces["echecs"].pop(nom, None)
        jeton = secrets.token_urlsafe(32)
        acces.setdefault("jetons", {})[jeton] = nom
        ecrire_json(ACCES, acces)
    return {"jeton": jeton}


def deconnexion(jeton):
    """L'appareil oublie le compte admin : son jeton ne vaut plus rien."""
    if not jeton:
        return
    with verrou():
        acces = lire_json(ACCES, {})
        if acces.get("jetons", {}).pop(jeton, None) is not None:
            ecrire_json(ACCES, acces)
