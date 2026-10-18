"""Fichiers envoyés (photos de profil, images, fichiers), rangés dans data/medias/.

Chaque fichier reçoit un nom aléatoire (16 caractères hexadécimaux + extension) : on ne
réutilise jamais le nom d'origine sur le disque, il ne sert qu'au téléchargement.

Les images sont gardées telles qu'envoyées (sans compression), avec à côté un
aperçu léger fait par le téléphone : <id>-a.jpg pour l'affichage dans les pages, l'original pour la
visionneuse et le téléchargement. Sans aperçu (images plus anciennes, GIF), on sert l'original.
"""
import re
import secrets
from pathlib import Path

from requetes import Refus
from stockage import DOSSIER_DONNEES

MEDIAS = DOSSIER_DONNEES / "medias"
NOM_MEDIA = re.compile(r"[0-9a-f]{16}(?:-a)?\.[a-z0-9]{1,8}")
TYPES_IMAGES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}


def recevoir(environ, limite_octets):
    """Écrit le corps de la requête dans un fichier temporaire, sans tout charger en mémoire."""
    try:
        taille = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        raise Refus("requête invalide")
    if taille <= 0:
        raise Refus("fichier vide")
    if taille > limite_octets:
        raise Refus(f"fichier trop gros ({limite_octets // 1_000_000} Mo max)", "413 Payload Too Large")
    MEDIAS.mkdir(parents=True, exist_ok=True)
    temporaire = MEDIAS / f".{secrets.token_hex(8)}.part"
    restant = taille
    with open(temporaire, "wb") as fichier:
        while restant:
            bloc = environ["wsgi.input"].read(min(65536, restant))
            if not bloc:
                break
            fichier.write(bloc)
            restant -= len(bloc)
    if restant:
        supprimer_fichier(temporaire)
        raise Refus("envoi interrompu")
    return temporaire, taille


def extension_image(chemin):
    """Extension d'après le contenu réel du fichier (pas d'après son nom), ou None si ce n'est pas une image."""
    with open(chemin, "rb") as fichier:
        debut = fichier.read(12)
    if debut.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if debut.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if debut.startswith(b"GIF8"):
        return ".gif"
    if debut[:4] == b"RIFF" and debut[8:12] == b"WEBP":
        return ".webp"
    return None


def extension_fichier(nom_original):
    extension = Path(nom_original).suffix.lower()
    return extension if re.fullmatch(r"\.[a-z0-9]{1,8}", extension) else ".bin"


def ranger(temporaire, extension):
    """Donne au fichier reçu son nom définitif et renvoie ce nom."""
    nom = secrets.token_hex(8) + extension
    temporaire.rename(MEDIAS / nom)
    return nom


def supprimer_fichier(chemin):
    try:
        chemin.unlink()
    except FileNotFoundError:
        pass


def supprimer(nom):
    """Supprime un média et son aperçu éventuel."""
    if nom and NOM_MEDIA.fullmatch(nom):
        supprimer_fichier(MEDIAS / nom)
        for apercu in MEDIAS.glob(nom.split(".")[0].split("-")[0] + "-a.*"):
            supprimer_fichier(apercu)


def ranger_apercu(temporaire, original, extension):
    """Range l'aperçu d'une image (remplace l'éventuel précédent) et renvoie son nom."""
    racine = original.split(".")[0]
    for ancien in MEDIAS.glob(racine + "-a.*"):
        supprimer_fichier(ancien)
    nom = f"{racine}-a{extension}"
    temporaire.rename(MEDIAS / nom)
    return nom


def chemin(nom):
    """Chemin d'un média existant d'après son nom stocké, ou None (refuse tout autre nom, dont ../)."""
    if not NOM_MEDIA.fullmatch(nom):
        return None
    fichier = MEDIAS / nom
    if fichier.is_file():
        return fichier
    if "-a." in nom:
        # Aperçu demandé (<id>-a.jpg) : l'aperçu réel, quelle que soit son extension, sinon l'original.
        racine = nom.split("-a.")[0]
        for candidat in sorted(MEDIAS.glob(racine + "-a.*")) + sorted(MEDIAS.glob(racine + ".*")):
            if candidat.suffix in TYPES_IMAGES:
                return candidat
    return None
