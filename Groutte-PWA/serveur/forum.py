"""Communauté > Forum : le forum de NextSession (façon Reddit), copié tel quel, avec trois changements :
- les notifications : un nouveau post prévient tout le monde ; une réponse ou une réaction ne prévient que ceux qui
  suivent le fil. On suit un fil dès qu'on l'a publié, qu'on y a répondu ou réagi ; la cloche permet de le suivre
  sans y écrire, ou de ne plus le suivre ;
- les flairs (flairs.json), dont certains sont réservés au staff ;
- la modération, faite par le staff au lieu du MJ.

Des posts (texte ou lien, avec ou sans images) avec flair, votes « +1 » et commentaires en arbre. Supprimer un
commentaire qui a des réponses le remplace par « [supprimé] » sans casser le fil. Supprimer un post l'efface avec
ses commentaires et leurs images. Le staff épingle, verrouille (plus de commentaires ni de réactions) et retire.

data/forum.json : {"sujets": [{"id", "titre", "auteur", "cree_le", "type": "texte" | "lien", "lien", "flair", "texte",
    "images", "votes": [noms], "reactions": {réaction: [noms]}, "epingle", "verrouille", "modifie_le",
    "suiveurs": [noms], "plus_suivi": [noms],
    "commentaires": [{"id", "parent", "auteur", "texte", "images", "cree_le", "modifie_le", "votes", "reactions",
                      "supprime": false | "auteur" | "staff"}]}]}
"""
from urllib.parse import urlsplit

import comptes_donnees as cd
import medias
from lus import compteur
from notifications import extrait, mentionnes, notifier, notifier_mentions
from requetes import Refus, interdit, texte
from routes import route
from donnees import FORUM, lire_flairs, lire_reactions
from stockage import ecrire_json, lire_json, maintenant, nouvel_id

MAX_SUJETS = 500
MAX_COMMENTAIRES = 2000
MAX_IMAGES_POST = 10
MAX_IMAGES_COMMENTAIRE = 4
TYPES = ("texte", "lien")


def lire_forum():
    forum = lire_json(FORUM, {})
    forum.setdefault("sujets", [])
    for s in forum["sujets"]:
        for cle, valeur in (("images", []), ("type", "texte"), ("flair", ""), ("texte", ""), ("votes", []),
                            ("reactions", {}), ("commentaires", []), ("epingle", False), ("verrouille", False),
                            ("suiveurs", [s.get("auteur")]), ("plus_suivi", [])):
            s.setdefault(cle, valeur)
        for c in s["commentaires"]:
            for cle, valeur in (("images", []), ("parent", None), ("votes", []), ("reactions", {}), ("supprime", False)):
                c.setdefault(cle, valeur)
    return forum


def trouver_sujet(forum, ident):
    sujet = next((s for s in forum["sujets"] if s["id"] == ident), None)
    if not sujet:
        raise Refus("post introuvable", "404 Not Found")
    return sujet


def trouver_commentaire(sujet, ident):
    commentaire = next((c for c in sujet["commentaires"] if c["id"] == ident), None)
    if not commentaire:
        raise Refus("commentaire introuvable", "404 Not Found")
    return commentaire


def cible(sujet, corps):
    """Le post lui-même, ou l'un de ses commentaires si `commentaire` est donné."""
    return trouver_commentaire(sujet, corps["commentaire"]) if corps.get("commentaire") else sujet


def suivre(sujet, nom):
    """Je suis ce fil (je l'ai publié, j'y ai répondu ou réagi, ou j'ai touché la cloche)."""
    if nom not in sujet["suiveurs"]:
        sujet["suiveurs"].append(nom)
    if nom in sujet["plus_suivi"]:
        sujet["plus_suivi"].remove(nom)


def lien_sujet(sujet):
    return f"#forum/{sujet['id']}"


# --- Ce que la page reçoit ------------------------------------------------------------

def visible(element, nom):
    """Copie pour la page : score et « a voté » plutôt que la liste des votants ; contenu effacé si supprimé."""
    copie = {k: v for k, v in element.items() if k not in ("votes", "commentaires", "suiveurs", "plus_suivi")}
    copie["score"] = len(element["votes"])
    copie["a_vote"] = nom in element["votes"]
    if element.get("supprime"):
        copie.update(auteur=None, texte="", lien="", images=[], reactions={})
    if "suiveurs" in element:
        copie["suivi"] = nom in element["suiveurs"]
    return copie


def derniere_activite(sujet):
    return max([sujet["cree_le"]] + [c["cree_le"] for c in sujet["commentaires"]])


def resumes(forum, nom):
    """Liste des posts pour l'état de la page (sans les commentaires) ; la page les trie."""
    liste = []
    for s in forum["sujets"]:
        resume = visible(s, nom)
        resume.pop("texte", None)
        resume["nb"] = sum(1 for c in s["commentaires"] if not c["supprime"])
        resume["activite"] = derniere_activite(s)
        liste.append(resume)
    return sorted(liste, key=lambda s: s["activite"], reverse=True)


def detail(ident, nom):
    """GET /api/forum?sujet= : le post et ses commentaires."""
    sujet = trouver_sujet(lire_forum(), ident)
    return dict(visible(sujet, nom), commentaires=[visible(c, nom) for c in sujet["commentaires"]])


@compteur("forum")
def nouveautes(nom, vu):
    """{id: nombre} : le post lui-même s'il est d'un autre, puis les commentaires des autres depuis ma dernière visite."""
    resultat = {}
    for s in lire_forum()["sujets"]:
        seuil = vu("forum/" + s["id"])
        n = sum(1 for m in [s] + s["commentaires"] if not m.get("supprime") and m["auteur"] != nom and m["cree_le"] > seuil)
        if n:
            resultat[s["id"]] = n
    return resultat


# --- Actions -------------------------------------------------------------------------

def flair_valide(d, flair):
    if flair in ("", None):
        return ""
    f = next((x for x in lire_flairs() if x["nom"] == flair), None)
    if not f:
        raise Refus("flair inconnu")
    if f["staff"] and not d.staff:
        raise interdit(f"le flair {flair} est réservé au staff")
    return flair


def images_valides(images, maxi):
    """Images déjà envoyées (POST /api/televerser?type=image) à joindre à un post ou un commentaire."""
    if images is None:
        return []
    if not isinstance(images, list) or len(images) > maxi:
        raise Refus(f"{maxi} images au plus")
    for image in images:
        chemin = medias.chemin(image) if isinstance(image, str) else None
        if not chemin or chemin.suffix not in medias.TYPES_IMAGES:
            raise Refus("image introuvable")
    return list(dict.fromkeys(images))


def effacer_images(element):
    for image in element.get("images", []):
        medias.supprimer(image)
    element["images"] = []


def lien_valide(lien):
    if not isinstance(lien, str) or len(lien) > 1000:
        raise Refus("lien invalide")
    lien = lien.strip()
    url = urlsplit(lien)
    if url.scheme not in ("http", "https") or not url.netloc:
        raise Refus("le lien doit commencer par http:// ou https://")
    return lien


def prevenir_suiveurs(d, sujet, texte_notif, cites=()):
    """Ceux qui suivent le fil, sauf l'auteur de l'action et ceux qui viennent d'être mentionnés (ils ont leur ping).
    Le lien du fil sert d'étiquette : dix réponses d'affilée ne donnent qu'une notification."""
    destinataires = set(sujet["suiveurs"]) - set(sujet["plus_suivi"]) - set(cites) - {d.nom}
    if destinataires:
        notifier(d.config, "forum", sujet["titre"], texte_notif, lien_sujet(sujet), destinataires=destinataires, sauf=d.nom)


@route("/api/forum/sujet")
def creer_sujet(d):
    d.exiger_parole()
    forum = lire_forum()
    if len(forum["sujets"]) >= MAX_SUJETS:
        raise Refus("trop de posts, le staff doit faire du ménage")
    genre = d.corps.get("type", "texte")
    if genre not in TYPES:
        raise Refus("type de post invalide")
    titre = texte(d.corps, "titre", 300, requis=True)
    images = images_valides(d.corps.get("images"), MAX_IMAGES_POST)
    sujet = {
        "id": nouvel_id(), "titre": titre, "auteur": d.nom, "cree_le": maintenant(), "type": genre,
        "flair": flair_valide(d, d.corps.get("flair", "")),
        "texte": texte(d.corps, "texte", 20000, requis=genre == "texte" and not images),
        "images": images, "votes": [], "reactions": {}, "commentaires": [], "epingle": False, "verrouille": False,
        "suiveurs": [d.nom], "plus_suivi": [],
    }
    if genre == "lien":
        sujet["lien"] = lien_valide(d.corps.get("lien"))
    forum["sujets"].append(sujet)
    ecrire_json(FORUM, forum)
    # Les personnes citées avec @ ont leur propre notification, à la place de « Nouveau post ».
    cites = mentionnes(d.config, titre, sujet["texte"])
    notifier_mentions(d.config, d.nom, cites, f"{d.nom} t'a mentionné", titre, lien_sujet(sujet))
    autres = cd.noms_actifs(d.config) - set(cites)
    notifier(d.config, "forum", "Nouveau post", f"Nouveau post de {d.nom} : {titre}", lien_sujet(sujet),
             destinataires=autres, sauf=d.nom)
    return {"sujet": sujet["id"]}


@route("/api/forum/commenter")
def commenter(d):
    """Commentaire sur le post, ou réponse à un commentaire (`parent`)."""
    d.exiger_parole()
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    if sujet["verrouille"]:
        raise interdit("ce fil est verrouillé par le staff")
    if len(sujet["commentaires"]) >= MAX_COMMENTAIRES:
        raise Refus("ce post a trop de commentaires")
    parent = trouver_commentaire(sujet, d.corps["parent"]) if d.corps.get("parent") else None
    images = images_valides(d.corps.get("images"), MAX_IMAGES_COMMENTAIRE)
    commentaire = {"id": nouvel_id(), "auteur": d.nom, "texte": texte(d.corps, "texte", 10000, requis=not images),
                   "cree_le": maintenant(), "parent": parent["id"] if parent else None, "images": images,
                   "votes": [], "reactions": {}, "supprime": False}
    sujet["commentaires"].append(commentaire)
    suivre(sujet, d.nom)
    ecrire_json(FORUM, forum)
    resume = extrait(commentaire["texte"]) or "une image"
    cites = mentionnes(d.config, commentaire["texte"])
    notifier_mentions(d.config, d.nom, cites, f"{d.nom} t'a mentionné : {sujet['titre']}", resume,
                      f"{lien_sujet(sujet)}/{commentaire['id']}")
    prevenir_suiveurs(d, sujet, f"{d.nom} a répondu dans {sujet['titre']} : {resume}", cites)


@route("/api/forum/modifier")
def modifier(d):
    """L'auteur modifie le texte de son post ou de son commentaire. Le flair d'un post : son auteur ou le staff."""
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    element = cible(sujet, d.corps)
    if element.get("supprime"):
        raise Refus("ce message a été supprimé")
    if "texte" in d.corps:
        if element["auteur"] != d.nom:
            raise interdit("seul l'auteur peut modifier ce message")
        d.exiger_parole()
        requis = not element["images"] and (element is not sujet or sujet["type"] == "texte")
        element["texte"] = texte(d.corps, "texte", 20000 if element is sujet else 10000, requis=requis)
        element["modifie_le"] = maintenant()
    if "flair" in d.corps and element is sujet:
        if sujet["auteur"] != d.nom and not d.staff:
            raise interdit("seuls l'auteur et le staff peuvent changer le flair")
        sujet["flair"] = flair_valide(d, d.corps["flair"])
    ecrire_json(FORUM, forum)


@route("/api/forum/supprimer")
def supprimer(d):
    """Par l'auteur ou le staff. Un post disparaît avec ses commentaires. Un commentaire sans réponse disparaît ;
    avec des réponses, il devient « [supprimé] » et le fil reste."""
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    element = cible(sujet, d.corps)
    if element["auteur"] != d.nom and not d.staff:
        raise interdit("seuls l'auteur et le staff peuvent supprimer ce message")
    if element is sujet:
        forum["sujets"].remove(sujet)
        for c in sujet["commentaires"]:
            effacer_images(c)
    elif any(c["parent"] == element["id"] for c in sujet["commentaires"]):
        element.update(supprime="auteur" if element["auteur"] == d.nom else "staff", texte="")
    else:
        sujet["commentaires"].remove(element)
    effacer_images(element)
    ecrire_json(FORUM, forum)


@route("/api/forum/voter")
def voter(d):
    """Vote « +1 » sur le post ou un commentaire ; revoter retire le vote. Pas de notification (comme Reddit)."""
    forum = lire_forum()
    element = cible(trouver_sujet(forum, d.corps.get("sujet")), d.corps)
    if element.get("supprime"):
        raise Refus("ce message a été supprimé")
    if d.nom in element["votes"]:
        element["votes"].remove(d.nom)
    else:
        element["votes"].append(d.nom)
    ecrire_json(FORUM, forum)


@route("/api/forum/reagir")
def reagir(d):
    """Une réaction en texte (reactions.json), ou la retirer. Réagir fait suivre le fil."""
    d.exiger_parole()
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    if sujet["verrouille"]:
        raise interdit("ce fil est verrouillé par le staff")
    element = cible(sujet, d.corps)
    if element.get("supprime"):
        raise Refus("ce message a été supprimé")
    reaction = d.corps.get("reaction")
    if reaction not in lire_reactions():
        raise Refus("réaction inconnue")
    noms = element.setdefault("reactions", {}).setdefault(reaction, [])
    ajoutee = d.nom not in noms
    if ajoutee:
        noms.append(d.nom)
        suivre(sujet, d.nom)
    else:
        noms.remove(d.nom)
    if not noms:
        del element["reactions"][reaction]
    ecrire_json(FORUM, forum)
    if ajoutee:
        prevenir_suiveurs(d, sujet, f"{d.nom} a réagi {reaction} dans {sujet['titre']}")


@route("/api/forum/suivre")
def suivre_fil(d):
    """La cloche : suivre (`suivre` : true) un fil sans y écrire, ou ne plus le suivre (plus aucune notification)."""
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    if d.corps.get("suivre"):
        suivre(sujet, d.nom)
    else:
        if d.nom in sujet["suiveurs"]:
            sujet["suiveurs"].remove(d.nom)
        if d.nom not in sujet["plus_suivi"]:
            sujet["plus_suivi"].append(d.nom)
    ecrire_json(FORUM, forum)


@route("/api/forum/moderer")
def moderer(d):
    """Staff : épingler un post en haut de la liste, ou le verrouiller (plus de commentaires ni de réactions). Bascule."""
    d.exiger_staff()
    forum = lire_forum()
    sujet = trouver_sujet(forum, d.corps.get("sujet"))
    action = d.corps.get("action")
    if action not in ("epingle", "verrouille"):
        raise Refus("action inconnue")
    sujet[action] = not sujet[action]
    ecrire_json(FORUM, forum)


@cd.renommage
def renommer(ancien, nouveau):
    forum = lire_forum()
    for s in forum["sujets"]:
        for element in [s] + s["commentaires"]:
            element["reactions"] = {r: [nouveau if n == ancien else n for n in noms] for r, noms in element["reactions"].items()}
    ecrire_json(FORUM, cd.renommer_dans(forum, ancien, nouveau, {"auteur", "votes", "suiveurs", "plus_suivi"}))
