"""Nouvel An à la Groutte : appli web installable (PWA), serveur WSGI, bibliothèque standard uniquement.

- en local : python3 app.py (PORT=9123 python3 app.py pour un autre port)
- sur un hébergement Passenger (O2Switch, cPanel) : passenger_wsgi.py importe `application`

Chaque compte a son code à 4 chiffres : la connexion remet un jeton à l'appareil (acces.py). Chaque requête dit
qui l'envoie (`nom`) avec ce jeton ; le serveur vérifie ce que ce compte a le droit de faire.

Organisation :
- stockage.py      fichiers data/*.json et config.json, verrou d'écriture
- requetes.py      lecture et validation des requêtes, refus
- routes.py        registre des actions POST (@route)
- comptes_donnees.py  comptes (data/comptes.json), codes hachés, rôles (roles.json), renommage
- acces.py         connexion, inscription, codes provisoires, jetons
- comptes.py       ma fiche, me rembourser, photo, notifications, annonces
- staff.py         Staff > Comptes : droits, codes, rôles, muet, noms, désactivation, journal
- notifications.py Web Push (seule dépendance : cryptography, facultative)
- lus.py           ce que chacun a vu : pastilles « nouveau »
- medias.py        fichiers envoyés, rangés dans data/medias/
- etat.py          ce que voit chaque compte
- static/          la page (index.html, tokens.css, style.css, js/)
"""
import json
import os
from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, quote
from wsgiref.simple_server import WSGIServer, make_server

import acces
import comptes  # noqa: F401  (routes /api/profil, /api/notifs/...)
import lus  # noqa: F401  (route /api/lu)
import medias
import staff  # noqa: F401  (routes /api/staff/...)
from etat import etat
from requetes import Demande, Refus, lire_corps
from routes import ROUTES
from stockage import ICI, lire_config, verrou


class ServeurMultiThread(ThreadingMixIn, WSGIServer):
    daemon_threads = True


STATIQUE = ICI / "static"
PAGE = STATIQUE / "index.html"
TYPES_STATIQUES = {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
}


def manifeste():
    """Manifeste de l'appli installable (PWA), construit d'après config.json."""
    config = lire_config()
    titre = config.get("titre", "Appli")
    icones = "static/icones/"
    return {
        "name": titre,
        "short_name": config.get("nom_court", titre[:12]),
        "description": config.get("description", ""),
        "lang": "fr",
        "id": "./",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": "#f1f0ef",
        "theme_color": "#f1f0ef",
        "icons": [
            {"src": icones + "icone-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": icones + "icone-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": icones + "icone-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            {"src": icones + "icone.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"},
        ],
    }


def repondre(start_response, statut, corps, type_contenu="application/json; charset=utf-8", entetes=(),
             cache="no-store"):
    if not isinstance(corps, bytes):
        corps = json.dumps(corps, ensure_ascii=False).encode("utf-8")
    start_response(statut, [
        ("Content-Type", type_contenu),
        ("Content-Length", str(len(corps))),
        ("Cache-Control", cache),
        ("X-Robots-Tag", "noindex, nofollow"),
        ("X-Content-Type-Options", "nosniff"),
        *entetes,
    ])
    return [corps]


def repondre_media(start_response, chemin, nom_origine, telecharger=False):
    """/media/<nom stocké>?nom=<nom d'origine>. Les images s'affichent (sauf avec &telecharger=1), tout le reste
    se télécharge."""
    fichier = medias.chemin(chemin[len("/media/"):])
    if not fichier:
        raise Refus("fichier introuvable", "404 Not Found")
    # Un média ne change jamais (nouveau nom à chaque envoi) : le navigateur peut le garder.
    cache = "private, max-age=31536000, immutable"
    image = fichier.suffix in medias.TYPES_IMAGES
    if image and not telecharger:
        return repondre(start_response, "200 OK", fichier.read_bytes(), medias.TYPES_IMAGES[fichier.suffix], cache=cache)
    nom_origine = nom_origine or fichier.name
    if image and not nom_origine.lower().endswith(fichier.suffix):
        nom_origine = nom_origine.rsplit(".", 1)[0] + fichier.suffix
    ascii_seul = "".join(c if c.isascii() and c.isprintable() and c not in '"\\' else "_" for c in nom_origine)
    disposition = f"attachment; filename=\"{ascii_seul}\"; filename*=UTF-8''{quote(nom_origine)}"
    type_contenu = medias.TYPES_IMAGES[fichier.suffix] if image else "application/octet-stream"
    return repondre(start_response, "200 OK", fichier.read_bytes(), type_contenu,
                    (("Content-Disposition", disposition),), cache)


def televerser(environ, parametres):
    """POST /api/televerser?nom=&type=avatar|image|apercu&de=&nom_fichier= , le fichier brut en corps.

    `image` : une image à joindre ensuite à quelque chose ; elle est seulement rangée, et son nom est renvoyé
    (`televerse`) pour que la page l'envoie avec l'action (ex. /api/forum/creer). `apercu` : version légère d'une
    image déjà envoyée (`de`), faite par le navigateur, pour l'affichage dans les pages. `avatar` : photo de profil.
    Pour un autre genre (fichier joint à un élément...), ajoute-le ici. Renvoie (nom du compte, nom du fichier rangé).
    """
    config = lire_config()
    parametre = lambda cle: parametres.get(cle, [""])[0]  # noqa: E731
    demande = Demande(config, {"nom": parametre("nom")}, environ.get("HTTP_X_JETON", ""), "/api/televerser")
    genre = parametre("type")
    if genre not in ("avatar", "image", "apercu"):
        raise Refus("type invalide")
    if genre == "apercu":
        original = medias.chemin(parametre("de")) if "-a." not in parametre("de") else None
        if not original or original.suffix not in medias.TYPES_IMAGES:
            raise Refus("image d'origine introuvable")
    limite = int(config.get("taille_max_fichier_mo", 20)) * 1_000_000
    petit = genre in ("avatar", "apercu")
    temporaire, _taille = medias.recevoir(environ, min(limite, 2_000_000) if petit else limite)
    try:
        extension = medias.extension_image(temporaire)
        if not extension:
            raise Refus("image non reconnue (JPEG, PNG, WebP ou GIF)")
        if genre == "apercu":
            return demande.nom, medias.ranger_apercu(temporaire, original.name, extension)
        fichier = medias.ranger(temporaire, extension)
    except Refus:
        medias.supprimer_fichier(temporaire)
        raise
    if genre == "avatar":
        with verrou():
            comptes.changer_avatar(demande.nom, fichier)
    return demande.nom, fichier


def fichier_statique(chemin):
    """Fichier .css, .js, ou icône sous static/, ou None. Refuse tout ce qui sort du dossier (../)."""
    fichier = (ICI / chemin.lstrip("/")).resolve()
    try:
        fichier.relative_to(STATIQUE)
    except ValueError:
        return None
    if fichier.suffix not in TYPES_STATIQUES or not fichier.is_file():
        return None
    return fichier


def application(environ, start_response):
    chemin = environ.get("PATH_INFO", "/") or "/"
    methode = environ["REQUEST_METHOD"]
    parametres = parse_qs(environ.get("QUERY_STRING", ""))
    parametre = lambda cle: parametres.get(cle, [""])[0]  # noqa: E731
    jeton = environ.get("HTTP_X_JETON", "")   # jeton remis à la saisie du code (acces.py)
    try:
        if methode == "GET" and chemin in ("/", "/index.html"):
            return repondre(start_response, "200 OK", PAGE.read_bytes(), "text/html; charset=utf-8")
        if methode == "GET" and chemin == "/manifest.webmanifest":
            return repondre(start_response, "200 OK", manifeste(), "application/manifest+json; charset=utf-8")
        if methode == "GET" and chemin == "/sw.js":
            # Servi à la racine pour que le service worker couvre tout le site, pas seulement static/.
            return repondre(start_response, "200 OK", (STATIQUE / "sw.js").read_bytes(), TYPES_STATIQUES[".js"])
        if methode == "GET" and chemin.startswith("/static/"):
            fichier = fichier_statique(chemin)
            if fichier:
                return repondre(start_response, "200 OK", fichier.read_bytes(), TYPES_STATIQUES[fichier.suffix])
        if methode == "GET" and chemin == "/api/etat":
            nom = parametre("nom")
            vrai = acces.nom_du_jeton(jeton)
            if nom and vrai and vrai != nom:
                # Le staff a corrigé le nom de ce compte : l'appareil garde son jeton et prend le nouveau nom.
                return repondre(start_response, "200 OK", dict(etat(vrai), renomme=vrai))
            acces.exiger_jeton(lire_config(), nom, jeton)
            return repondre(start_response, "200 OK", etat(nom))
        # Détail chargé à part (trop lourd pour l'état général) : un GET par module qui en a besoin, ici.
        if methode == "POST" and chemin == "/api/connexion":
            corps = lire_corps(environ)
            return repondre(start_response, "200 OK", acces.connexion(lire_config(), corps.get("nom"), corps.get("code", "")))
        if methode == "POST" and chemin == "/api/inscription":
            corps = lire_corps(environ)
            return repondre(start_response, "200 OK", acces.inscription(lire_config(), corps.get("nom"), corps.get("code", "")))
        if methode == "POST" and chemin == "/api/deconnexion":
            acces.deconnexion(jeton)
            return repondre(start_response, "200 OK", {})
        if methode == "GET" and chemin.startswith("/media/"):
            return repondre_media(start_response, chemin, parametre("nom"), bool(parametre("telecharger")))
        if methode == "POST" and chemin == "/api/televerser":
            nom, fichier = televerser(environ, parametres)
            return repondre(start_response, "200 OK", dict(etat(nom), televerse=fichier))
        if methode == "POST" and chemin in ROUTES:
            corps = lire_corps(environ)
            with verrou():
                demande = Demande(lire_config(), corps, jeton, chemin)
                # Une action peut renvoyer un petit complément (ex. le code provisoire, montré une seule fois).
                complement = ROUTES[chemin](demande) or {}
            return repondre(start_response, "200 OK", dict(etat(demande.nom), **complement))
    except Refus as refus:
        return repondre(start_response, refus.statut, {"erreur": str(refus)})
    return repondre(start_response, "404 Not Found", {"erreur": "introuvable"})


if __name__ == "__main__":
    hote = os.environ.get("HOTE", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    print(f"Serveur sur http://{hote}:{port} (Ctrl+C pour arrêter)")
    # Un thread par connexion : une connexion ouverte à l'avance par un navigateur ne bloque pas les autres.
    serveur = make_server(hote, port, application, server_class=ServeurMultiThread)
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêté.")
