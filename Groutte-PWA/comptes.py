"""Ce que chacun règle sur son compte : sa fiche, ses moyens d'être remboursé, son thème, sa photo, ses notifications,
son code. (Les annonces du staff sont dans annonces.py.)

data/profils.json : {nom: {
    "couleur", "avatar", "notifs": {categorie: bool},
    "prenom", "pseudo", "discord", "telephone", "regimes": [..], "allergies", "photo_ok": bool,
    "categories": [id], "tournois": [id], "matelas": n, "duvets": n (absents : non renseigné),
    "paiement": {"titulaire", "iban", "paypal", "revolut", "lydia", "wero", "especes", "prefere"}}}
Les rôles, eux, sont dans data/comptes.json (comptes_donnees.py).
"""
import re

import acces
import comptes_donnees as cd
import medias
import notifications
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import PROFILS, ecrire_json, lire_json

MOYENS = ("virement", "wero", "paypal", "lydia", "revolut", "especes")


def regimes_proposes(config):
    regimes = config.get("regimes", [])
    return [r for r in regimes if isinstance(r, str) and r.strip()]


# --- Ma fiche ------------------------------------------------------------------------------------

def telephone_valide(valeur):
    if valeur and not re.fullmatch(r"\+?[\d ]{6,20}", valeur):
        raise Refus("téléphone invalide : seulement des chiffres, des espaces et un + au début")
    return valeur


@route("/api/profil")
def modifier_profil(d):
    """Chacun ne modifie que son profil. Seules les clés envoyées sont changées (un champ à la fois depuis Ma fiche)."""
    profils = lire_json(PROFILS, {})
    profil = profils.setdefault(d.nom, {})
    corps = d.corps
    if "couleur" in corps:
        couleur = corps["couleur"]
        if not isinstance(couleur, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", couleur):
            raise Refus("couleur invalide")
        profil["couleur"] = couleur.lower()
    for cle, maxi in (("prenom", 40), ("pseudo", 40), ("discord", 40), ("allergies", 300)):
        if cle in corps:
            profil[cle] = texte(corps, cle, maxi)
    if "telephone" in corps:
        profil["telephone"] = telephone_valide(texte(corps, "telephone", 20))
    if "photo_ok" in corps:
        if not isinstance(corps["photo_ok"], bool):
            raise Refus("consentement invalide")
        profil["photo_ok"] = corps["photo_ok"]
    if "categories" in corps:
        profil["categories"] = categories_cochees(corps["categories"], profil.get("categories", []))
    for objet in ("matelas", "duvets"):   # Couchage : un nombre, ou None (« non renseigné »)
        if objet in corps:
            n = corps[objet]
            if n is not None and (not isinstance(n, int) or isinstance(n, bool) or not 0 <= n <= 20):
                raise Refus(f"nombre de {objet} invalide")
            if n is None:
                profil.pop(objet, None)
            else:
                profil[objet] = n
    if "regimes" in corps:
        regimes = corps["regimes"]
        proposes = regimes_proposes(d.config)
        if not isinstance(regimes, list) or any(r not in proposes for r in regimes):
            raise Refus("régime inconnu")
        profil["regimes"] = [r for r in proposes if r in regimes]
    ecrire_json(PROFILS, profils)


def categories_cochees(demandees, actuelles):
    """Les catégories facultatives que je coche (Ce que je partage). Une catégorie supprimée garde sa coche : elle
    reste affichée, pour que chacun voie pourquoi il a payé."""
    import reglages_compta   # import ici : reglages_compta importe (de loin) ce module
    if not isinstance(demandees, list):
        raise Refus("catégories invalides")
    categories = reglages_compta.lire_categories()["categories"]
    proposees = {c["id"] for c in categories if c["type"] == "facultative" and not c["supprimee"]}
    if any(ident not in proposees for ident in demandees):
        raise Refus("catégorie inconnue")
    gardees = [i for i in actuelles if any(c["id"] == i and c["supprimee"] for c in categories)]
    return list(dict.fromkeys(gardees + demandees))


@route("/api/roles/miens")
def mes_roles(d):
    """Cocher ou décocher un de ses rôles `libre` (roles.json). Les autres rôles ne changent pas ici."""
    ident = d.corps.get("role")
    r = cd.role(ident) if isinstance(ident, str) else None
    if not r or r["type"] != "libre":
        raise Refus("ce rôle ne se coche pas ici")
    comptes = cd.lire_comptes(d.config)
    roles = comptes[d.nom]["roles"]
    if d.corps.get("actif"):
        if ident not in roles:
            roles.append(ident)
    elif ident in roles:
        roles.remove(ident)
    cd.ecrire_comptes(comptes)


@route("/api/code/changer")
def changer_code(d):
    """Choisir son nouveau code (après un code provisoire, ou quand on veut)."""
    acces.changer_code(d.config, d.nom, d.corps.get("code"))


# --- Me rembourser -------------------------------------------------------------------------------

def iban_valide(valeur):
    iban = re.sub(r"\s", "", valeur).upper()
    if not iban:
        return ""
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{11,30}", iban):
        raise Refus("IBAN invalide")
    chiffres = "".join(str(int(c, 36)) for c in iban[4:] + iban[:4])
    if int(chiffres) % 97 != 1:
        raise Refus("IBAN invalide (clé de contrôle fausse, vérifie les chiffres)")
    return iban


def identifiant(valeur, domaine, nom):
    """« paypal.me/jean », « https://revolut.me/jean », « @jean » ou « jean » -> « jean »."""
    propre = re.sub(rf"^(https?://)?(www\.)?{re.escape(domaine)}/", "", valeur.strip(), flags=re.I).lstrip("@").strip("/")
    if propre and not re.fullmatch(r"[A-Za-z0-9._-]{1,40}", propre):
        raise Refus(f"identifiant {nom} invalide")
    return propre


@route("/api/paiement")
def regler_paiement(d):
    """Me rembourser : seules les clés envoyées changent. Vide = retiré."""
    corps = d.corps
    profils = lire_json(PROFILS, {})
    paiement = profils.setdefault(d.nom, {}).setdefault("paiement", {})
    if "titulaire" in corps:
        paiement["titulaire"] = texte(corps, "titulaire", 70)
    if "iban" in corps:
        paiement["iban"] = iban_valide(texte(corps, "iban", 50))
    if "paypal" in corps:
        paiement["paypal"] = identifiant(texte(corps, "paypal", 100), "paypal.me", "PayPal")
    if "revolut" in corps:
        paiement["revolut"] = identifiant(texte(corps, "revolut", 100), "revolut.me", "Revolut")
    if "lydia" in corps:
        lydia = texte(corps, "lydia", 300)
        if lydia and not re.fullmatch(r"https://\S+", lydia):
            raise Refus("lien Lydia/Sumeria invalide (il commence par https://)")
        paiement["lydia"] = lydia
    if "wero" in corps:
        wero = texte(corps, "wero", 100)
        if wero and not (re.fullmatch(r"\+?[\d ]{6,20}", wero) or re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", wero)):
            raise Refus("Wero : indique un numéro de téléphone ou une adresse mail")
        paiement["wero"] = wero
    if "especes" in corps:
        paiement["especes"] = bool(corps["especes"])
    if "prefere" in corps:
        if corps["prefere"] not in MOYENS + ("",):
            raise Refus("moyen inconnu")
        paiement["prefere"] = corps["prefere"]
    if paiement.get("iban") and not paiement.get("titulaire"):
        raise Refus("indique le titulaire du compte avec l'IBAN")
    for cle in [k for k, v in paiement.items() if v in ("", None, False)]:
        del paiement[cle]
    # Le moyen préféré retiré : la préférence passe au premier moyen restant.
    if paiement.get("prefere") and paiement["prefere"] not in moyens_renseignes(paiement):
        restants = moyens_renseignes(paiement)
        paiement["prefere"] = restants[0] if restants else ""
        if not paiement["prefere"]:
            del paiement["prefere"]
    ecrire_json(PROFILS, profils)


def moyens_renseignes(paiement):
    """Les moyens remplis, dans l'ordre de MOYENS."""
    return [m for m in MOYENS if (paiement.get("iban") if m == "virement" else paiement.get(m))]


# --- Photo ---------------------------------------------------------------------------------------

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


@cd.renommage
def renommer_profil(ancien, nouveau):
    cd.renommer_cle(PROFILS, ancien, nouveau)


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
    notifier(d.config, None, "Test", "Les notifications marchent sur cet appareil.", "#notifications", destinataires=[d.nom],
             garder=False)
