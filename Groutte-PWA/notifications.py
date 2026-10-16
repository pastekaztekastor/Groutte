"""Notifications push (Web Push) vers les téléphones et ordinateurs abonnés.

Seule dépendance hors bibliothèque standard du projet : `cryptography` (signature VAPID et
chiffrement des messages, RFC 8291/8292). Sans elle, le site marche normalement, sans notifications.

- data/vapid.json        clés du serveur, créées au premier besoin (à ne jamais perdre ni publier)
- data/abonnements.json  {nom: [abonnements du navigateur]}, un par appareil
- profils.json           préférences de chacun : profil["notifs"] = {categorie: bool}

Les catégories (ce que chacun peut couper dans Réglages > Notifications) viennent de config.json >
categories_notifications : {"cle": "Libellé"}. Un module notifie avec notifier(config, "cle", ...).
"""
import base64
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

import comptes_donnees as cd
from stockage import DOSSIER_DONNEES, PROFILS, ecrire_json, lire_json, verrou

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    DISPONIBLE = True
except BaseException as erreur:  # noqa: B036
    # Absent, ou installé mais inutilisable sur ce serveur (bibliothèque compilée incompatible : la
    # panique Rust de cryptography n'est pas une ImportError). Le site doit démarrer quand même.
    if isinstance(erreur, (KeyboardInterrupt, SystemExit)):
        raise
    print(f"notifications désactivées, cryptography inutilisable : {erreur!r}", file=sys.stderr)
    DISPONIBLE = False

VAPID = DOSSIER_DONNEES / "vapid.json"
ABONNEMENTS = DOSSIER_DONNEES / "abonnements.json"
CATEGORIES_DEFAUT = {"gite": "Gîte"}


def categories(config):
    cats = config.get("categories_notifications")
    return cats if isinstance(cats, dict) and cats else CATEGORIES_DEFAUT


def b64(octets):
    return base64.urlsafe_b64encode(octets).rstrip(b"=").decode()


def de_b64(texte):
    return base64.urlsafe_b64decode(texte + "=" * (-len(texte) % 4))


def point_public(cle_privee):
    return cle_privee.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)


def cles_vapid():
    """Clé privée du serveur et clé publique (base64url) donnée aux navigateurs. Créées une seule fois."""
    donnees = lire_json(VAPID, None)
    if donnees is None:
        cle = ec.generate_private_key(ec.SECP256R1())
        donnees = {"privee": cle.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                               serialization.NoEncryption()).decode()}
        DOSSIER_DONNEES.mkdir(exist_ok=True)
        ecrire_json(VAPID, donnees)
    cle = serialization.load_pem_private_key(donnees["privee"].encode(), password=None)
    return cle, b64(point_public(cle))


def cle_publique():
    if not DISPONIBLE:
        return None
    if not VAPID.exists():
        with verrou():  # plusieurs processus Passenger : une seule paire de clés doit naître
            return cles_vapid()[1]
    return cles_vapid()[1]


JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def date_lisible(jour):
    """« samedi 7 novembre » d'après « 2026-11-07 »."""
    d = datetime.strptime(jour, "%Y-%m-%d")
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]}"


def extrait(texte, longueur=120):
    texte = " ".join(texte.split())
    return texte if len(texte) <= longueur else texte[:longueur].rstrip() + "..."


def mentionnes(config, *textes):
    """Comptes actifs cités avec « @Nom » (majuscules et minuscules confondues) dans ces textes."""
    tout = "\n".join(t for t in textes if t)
    return [nom for nom in sorted(cd.noms_actifs(config))
            if re.search(r"(?<![\w@])@" + re.escape(nom) + r"(?!\w)", tout, re.IGNORECASE)]


def notifier_mentions(config, auteur, noms, titre, texte, lien):
    """« Untel t'a mentionné » : comme un ping, envoyé même si la personne a coupé la catégorie concernée."""
    noms = [n for n in noms if n != auteur]
    if noms:
        notifier(config, None, titre, texte, lien, destinataires=noms, sauf=auteur)


def preferences(config, profil):
    """Préférences de notification d'un profil : tout est activé par défaut."""
    reglees = profil.get("notifs", {})
    return {c: reglees.get(c, True) for c in categories(config)}


# --- Abonnements (appelés sous le verrou) ---------------------------------------------

def abonner(nom, abonnement):
    """Un appareil (endpoint) n'appartient qu'à un compte : s'il change de compte, il suit."""
    abonnements = lire_json(ABONNEMENTS, {})
    for liste in abonnements.values():
        liste[:] = [a for a in liste if a["endpoint"] != abonnement["endpoint"]]
    abonnements.setdefault(nom, []).append(dict(abonnement, cree_le=datetime.now().isoformat(timespec="seconds")))
    ecrire_json(ABONNEMENTS, {n: l for n, l in abonnements.items() if l})


def oublier_compte(nom):
    """Sous le verrou : plus aucun appareil ne reçoit les notifications de `nom` (compte désactivé)."""
    abonnements = lire_json(ABONNEMENTS, {})
    if abonnements.pop(nom, None) is not None:
        ecrire_json(ABONNEMENTS, abonnements)


@cd.renommage
def renommer_abonnements(ancien, nouveau):
    cd.renommer_cle(ABONNEMENTS, ancien, nouveau)


def desabonner(endpoint):
    abonnements = lire_json(ABONNEMENTS, {})
    for liste in abonnements.values():
        liste[:] = [a for a in liste if a["endpoint"] != endpoint]
    ecrire_json(ABONNEMENTS, {n: l for n, l in abonnements.items() if l})


# --- Chiffrement et envoi --------------------------------------------------------------

def jeton_vapid(endpoint, cle, contact):
    """JWT ES256 qui prouve au service de push (Google, Apple, Mozilla) que l'envoi vient de ce serveur."""
    url = urllib.parse.urlsplit(endpoint)
    entete = b64(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(",", ":")).encode())
    corps = b64(json.dumps({"aud": f"{url.scheme}://{url.netloc}", "exp": int(time.time()) + 12 * 3600, "sub": contact},
                           separators=(",", ":")).encode())
    signature = cle.sign(f"{entete}.{corps}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(signature)
    return f"{entete}.{corps}.{b64(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))}"


def chiffrer(message, p256dh, auth):
    """Chiffrement « aes128gcm » de RFC 8291 : seul l'appareil abonné peut lire le message."""
    cle_appareil = de_b64(p256dh)
    secret = de_b64(auth)
    ephemere = ec.generate_private_key(ec.SECP256R1())
    publique = point_public(ephemere)
    partage = ephemere.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), cle_appareil))
    ikm = HKDF(hashes.SHA256(), 32, secret, b"WebPush: info\x00" + cle_appareil + publique).derive(partage)
    sel = os.urandom(16)
    cle = HKDF(hashes.SHA256(), 16, sel, b"Content-Encoding: aes128gcm\x00").derive(ikm)
    nonce = HKDF(hashes.SHA256(), 12, sel, b"Content-Encoding: nonce\x00").derive(ikm)
    chiffre = AESGCM(cle).encrypt(nonce, message + b"\x02", None)
    return sel + (4096).to_bytes(4, "big") + bytes([len(publique)]) + publique + chiffre


def pousser(abonnement, message, cle, contact):
    """Envoie à un appareil. Renvoie False si l'abonnement n'existe plus (à oublier)."""
    corps = chiffrer(message, abonnement["keys"]["p256dh"], abonnement["keys"]["auth"])
    requete = urllib.request.Request(abonnement["endpoint"], data=corps, method="POST", headers={
        "Authorization": f"vapid t={jeton_vapid(abonnement['endpoint'], cle, contact)}, k={b64(point_public(cle))}",
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "normal",
    })
    try:
        with urllib.request.urlopen(requete, timeout=10):
            return True
    except urllib.error.HTTPError as erreur:
        if erreur.code in (404, 410):  # désabonné, ou application désinstallée
            return False
        print(f"notification refusée ({erreur.code}) : {erreur.read()[:200]!r}")
    except OSError as erreur:
        print(f"notification impossible : {erreur}")
    return True


def envoyer_a(cibles, message, contact):
    """Envoi en arrière-plan : la requête de la page n'attend pas les services de push."""
    if not cibles:
        return

    def tache():
        cle, _ = cles_vapid()
        perimes = [a["endpoint"] for a in cibles if not pousser(a, message, cle, contact)]
        if perimes:
            with verrou():
                for endpoint in perimes:
                    desabonner(endpoint)

    threading.Thread(target=tache, daemon=True).start()


def notifier(config, categorie, titre, texte, lien, destinataires=None, sauf=None):
    """Prévient les comptes abonnés qui ont gardé cette catégorie (tout le monde par défaut, sauf l'auteur).

    `categorie` None : annonce, mention ou test, envoyé quelles que soient les préférences.
    `lien` : l'adresse de la page à ouvrir (« #notes/<id> ») ; elle sert aussi d'étiquette (une notification
    remplace la précédente de la même page).
    """
    if not DISPONIBLE or not config.get("notifications", True):
        return
    abonnements = lire_json(ABONNEMENTS, {})
    profils = lire_json(PROFILS, {})
    cibles = []
    for nom, liste in abonnements.items():
        if nom == sauf or (destinataires is not None and nom not in destinataires):
            continue
        if categorie and not preferences(config, profils.get(nom, {})).get(categorie, True):
            continue
        cibles.extend(liste)
    message = json.dumps({
        "titre": f"{config.get('prefixe_notifications', config.get('nom_court', 'Appli'))} - {titre}",
        "texte": texte[:240],
        "lien": lien,
        "tag": lien,  # une notif remplace la précédente sur la même page (ex. plusieurs photos d'un coup)
    }, ensure_ascii=False).encode()
    envoyer_a(cibles, message, config.get("contact_notifications", "mailto:admin@example.org"))
