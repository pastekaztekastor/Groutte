"""Connexion : chaque compte a son code à 4 chiffres (data/comptes.json, haché).

On choisit son compte (« Qui es-tu ? »), puis on tape son code sur le pavé. Le serveur remet alors un jeton à
l'appareil (data/acces.json), que la page joint à chaque demande (en-tête X-Jeton). Sans jeton valable, rien ne se
fait ni ne se lit au nom d'un compte. Après 5 codes faux, le compte est bloqué 5 minutes.

- Un compte sans code (compte de départ sans code dans config.json) choisit son code à sa première connexion.
- Un code provisoire (remis à zéro par le staff, ou venu de config.json) doit être changé tout de suite :
  tant que ce n'est pas fait, seule la route /api/code/changer est acceptée.
- S'inscrire crée un compte, avec son code, et connecte l'appareil.
"""
import secrets
import time

import comptes_donnees as cd
from requetes import Refus
from stockage import DOSSIER_DONNEES, ecrire_json, lire_json, maintenant, verrou

ACCES = DOSSIER_DONNEES / "acces.json"
ESSAIS_MAX = 5
BLOCAGE_SECONDES = 300


def nom_du_jeton(jeton):
    return lire_json(ACCES, {}).get("jetons", {}).get(jeton) if jeton else None


def exiger_jeton(config, nom, jeton):
    """Refuse (401) une demande au nom d'un compte sans jeton valable pour ce compte. `nom` vide : visiteur
    pas encore connecté (il ne voit que l'écran « Qui es-tu ? »)."""
    if not nom:
        return
    if nom_du_jeton(jeton) != nom:
        raise Refus("code demandé", "401 Unauthorized")


def _nouveau_jeton(acces, nom):
    jeton = secrets.token_urlsafe(32)
    acces.setdefault("jetons", {})[jeton] = nom
    return jeton


def _verifier_blocage(acces, nom):
    echec = acces.setdefault("echecs", {}).get(nom, {"nombre": 0, "jusqua": 0})
    reste = int(echec["jusqua"] - time.time())
    if reste > 0:
        raise Refus(f"trop d'essais : réessaie dans {reste // 60 + 1} min", "429 Too Many Requests")
    return echec


def connexion(config, nom, code):
    """Vérifie le code et renvoie {"jeton", "changer_code"}. Un compte sans code prend celui-ci comme code
    provisoire, à confirmer aussitôt (changer_code)."""
    if not cd.code_valide(code):
        raise Refus("le code a 4 chiffres")
    with verrou():
        cd.assurer_comptes(config)
        comptes = cd.lire_comptes(config)
        compte = comptes.get(nom)
        if not compte or compte["desactive"]:
            raise Refus("compte inconnu")
        acces = lire_json(ACCES, {})
        echec = _verifier_blocage(acces, nom)
        if not compte["code"]:
            compte.update(code=cd.hacher(code), code_provisoire=True)
            cd.ecrire_comptes(comptes)
        elif not cd.code_correct(code, compte["code"]):
            nombre = echec["nombre"] + 1
            acces["echecs"][nom] = ({"nombre": 0, "jusqua": time.time() + BLOCAGE_SECONDES} if nombre >= ESSAIS_MAX
                                    else {"nombre": nombre, "jusqua": 0})
            ecrire_json(ACCES, acces)
            raise Refus("code incorrect", "401 Unauthorized")
        acces["echecs"].pop(nom, None)
        jeton = _nouveau_jeton(acces, nom)
        ecrire_json(ACCES, acces)
    return {"jeton": jeton, "changer_code": compte["code_provisoire"]}


def inscription(config, nom, code):
    """Crée un compte (participant) avec son code, et connecte l'appareil. Renvoie {"jeton", "nom"}."""
    nom, erreur = cd.nom_propre(nom if isinstance(nom, str) else "")
    if erreur:
        raise Refus(erreur)
    if not cd.code_valide(code):
        raise Refus("le code a 4 chiffres")
    with verrou():
        cd.assurer_comptes(config)
        comptes = cd.lire_comptes(config)
        if cd.nom_pris(comptes, nom):
            raise Refus("ce nom est déjà pris (ou trop proche d'un autre) : ajoute l'initiale de ton nom de famille")
        compte = cd._compte_vide()
        compte.update(code=cd.hacher(code), cree=maintenant())
        comptes[nom] = compte
        cd.ecrire_comptes(comptes)
        acces = lire_json(ACCES, {})
        jeton = _nouveau_jeton(acces, nom)
        ecrire_json(ACCES, acces)
        from notifications import notifier   # import ici : notifications importe stockage, pas l'inverse
        notifier(config, "gite", "Nouvelle inscription", f"{nom} vient de créer son compte.", "#staff",
                 destinataires=set(cd.staffs_actifs(comptes)), sauf=nom)
        import gite_salle   # import ici : gite_salle importe (de loin) ce module
        gite_salle.prevenir_inscription(config, nom)
    return {"jeton": jeton, "nom": nom}


def changer_code(config, nom, code):
    """Sous le verrou (route) : le compte choisit son nouveau code ; le code provisoire disparaît."""
    if not cd.code_valide(code):
        raise Refus("le code a 4 chiffres")
    comptes = cd.lire_comptes(config)
    comptes[nom].update(code=cd.hacher(code), code_provisoire=False)
    cd.ecrire_comptes(comptes)


def code_provisoire(config, nom):
    """Sous le verrou : un code provisoire pour `nom`, renvoyé une seule fois (au staff qui l'a demandé).
    Tous les appareils du compte sont déconnectés."""
    code = f"{secrets.randbelow(10000):04d}"
    comptes = cd.lire_comptes(config)
    comptes[nom].update(code=cd.hacher(code), code_provisoire=True)
    cd.ecrire_comptes(comptes)
    revoquer(nom)
    acces = lire_json(ACCES, {})
    if acces.get("echecs", {}).pop(nom, None) is not None:
        ecrire_json(ACCES, acces)
    return code


def revoquer(nom):
    """Sous le verrou : tous les appareils de `nom` sont déconnectés."""
    acces = lire_json(ACCES, {})
    jetons = acces.get("jetons", {})
    restants = {j: n for j, n in jetons.items() if n != nom}
    if len(restants) != len(jetons):
        acces["jetons"] = restants
        ecrire_json(ACCES, acces)


@cd.renommage
def renommer_acces(ancien, nouveau):
    acces = lire_json(ACCES, {})
    acces["jetons"] = {j: (nouveau if n == ancien else n) for j, n in acces.get("jetons", {}).items()}
    if ancien in acces.get("echecs", {}):
        acces["echecs"][nouveau] = acces["echecs"].pop(ancien)
    ecrire_json(ACCES, acces)


def deconnexion(jeton):
    """L'appareil oublie le compte : son jeton ne vaut plus rien."""
    if not jeton:
        return
    with verrou():
        acces = lire_json(ACCES, {})
        if acces.get("jetons", {}).pop(jeton, None) is not None:
            ecrire_json(ACCES, acces)
