"""Squelette d'appli web installable (PWA) : serveur WSGI, bibliothèque standard uniquement.

- en local : python3 app.py (PORT=9123 python3 app.py pour un autre port)
- sur un hébergement Passenger (O2Switch, cPanel) : passenger_wsgi.py importe `application`

Pas de mot de passe : chaque requête dit qui l'envoie (`nom`), le serveur vérifie seulement ce que ce compte a
le droit de faire. Seul le compte admin peut être protégé par un code (acces.py).

Organisation :
- stockage.py      fichiers data/*.json et config.json, verrou d'écriture
- requetes.py      lecture et validation des requêtes, refus
- routes.py        registre des actions POST (@route)
- acces.py         code de l'admin, jetons
- comptes.py       profil, photo, notifications, annonces
- notifications.py Web Push (seule dépendance : cryptography, facultative)
- lus.py           ce que chacun a vu : pastilles « nouveau »
- medias.py        fichiers envoyés, rangés dans data/medias/
- etat.py          ce que voit chaque compte
- environnement.py production, test ou local : nom et icônes de l'appli hors production
- notes.py         module d'exemple
- static/          la page (index.html, tokens.css, style.css, js/)
"""
import json
import os
import re
from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, quote
from wsgiref.simple_server import WSGIServer, make_server

import acces
import comptes  # noqa: F401  (routes /api/profil, /api/notifs/...)
import lus  # noqa: F401  (route /api/lu)
import medias
import notes
from environnement import environnement
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


def manifeste(env):
    """Manifeste de l'appli installable (PWA), construit d'après config.json. Hors production, le nom et
    l'icône disent où l'on est (environnement.py)."""
    config = lire_config()
    titre = config.get("titre", "Appli")
    nom_court = config.get("nom_court", titre[:12])
    icones = "static/icones/"
    if env:
        titre = f"{titre} ({env['nom'].lower()})"
        nom_court = f"{nom_court} {env['nom'].lower()}"
        icones += env["id"] + "/"
    return {
        "name": titre,
        "short_name": nom_court,
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


def page(env):
    """index.html. Hors production : l'environnement sur <html> (lu par bandeau-test.js et commun.js), les
    icônes de static/icones/<id>/ et le nom sous l'icône sur iPhone."""
    html = PAGE.read_text(encoding="utf-8")
    if env:
        html = (html
                .replace('<html lang="fr">', f'<html lang="fr" data-environnement="{env["id"]}">', 1)
                .replace('href="static/icones/', f'href="static/icones/{env["id"]}/'))
        html = re.sub(r'(<meta name="apple-mobile-web-app-title" content="[^"]*)"', rf'\1 {env["nom"].lower()}"', html, count=1)
    return html.encode("utf-8")


def service_worker(env):
    """sw.js, avec l'environnement (pour l'icône et le titre des notifications)."""
    js = (STATIQUE / "sw.js").read_text(encoding="utf-8")
    if env:
        js = js.replace('const ENVIRONNEMENT = null;', f'const ENVIRONNEMENT = {json.dumps(env, ensure_ascii=False)};', 1)
    return js.encode("utf-8")


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
    (`televerse`) pour que la page l'envoie avec l'action (ex. /api/notes/creer). `apercu` : version légère d'une
    image déjà envoyée (`de`), faite par le navigateur, pour l'affichage dans les pages. `avatar` : photo de profil.
    Pour un autre genre (fichier joint à un élément...), ajoute-le ici. Renvoie (nom du compte, nom du fichier rangé).
    """
    config = lire_config()
    parametre = lambda cle: parametres.get(cle, [""])[0]  # noqa: E731
    demande = Demande(config, {"nom": parametre("nom")}, environ.get("HTTP_X_JETON", ""))
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
    jeton = environ.get("HTTP_X_JETON", "")   # compte admin : jeton remis à la saisie de son code (acces.py)
    env = environnement(environ)   # None en production
    try:
        if methode == "GET" and chemin in ("/", "/index.html"):
            return repondre(start_response, "200 OK", page(env), "text/html; charset=utf-8")
        if methode == "GET" and chemin == "/manifest.webmanifest":
            return repondre(start_response, "200 OK", manifeste(env), "application/manifest+json; charset=utf-8")
        if methode == "GET" and chemin == "/sw.js":
            # Servi à la racine pour que le service worker couvre tout le site, pas seulement static/.
            return repondre(start_response, "200 OK", service_worker(env), TYPES_STATIQUES[".js"])
        if methode == "GET" and chemin.startswith("/static/"):
            fichier = fichier_statique(chemin)
            if fichier:
                return repondre(start_response, "200 OK", fichier.read_bytes(), TYPES_STATIQUES[fichier.suffix])
        if methode == "GET" and chemin == "/api/etat":
            acces.exiger_jeton(lire_config(), parametre("nom"), jeton)
            return repondre(start_response, "200 OK", etat(parametre("nom")))
        # Détail chargé à part (trop lourd pour l'état général) : un GET par module qui en a besoin.
        if methode == "GET" and chemin == "/api/note":
            acces.exiger_jeton(lire_config(), parametre("nom"), jeton)
            return repondre(start_response, "200 OK", notes.detail(parametre("id")))
        if methode == "POST" and chemin == "/api/connexion":
            corps = lire_corps(environ)
            return repondre(start_response, "200 OK", acces.connexion(lire_config(), corps.get("nom"), corps.get("code", "")))
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
                demande = Demande(lire_config(), corps, jeton)
                ROUTES[chemin](demande)
            return repondre(start_response, "200 OK", etat(demande.nom))
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
