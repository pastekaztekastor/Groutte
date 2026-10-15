"""Module d'exemple : des notes avec titre, texte, images, image de fond et commentaires.

Il montre tout ce qu'un module fait ; copie-le pour en écrire un autre :
- ses données (un fichier data/notes.json, une fonction lire_ qui pose les valeurs par défaut) ;
- ce qu'il met dans l'état général (resumes : léger, sans les commentaires) ;
- le détail chargé à part (GET /api/note?id=, branché dans app.py) ;
- ses actions POST (@route), qui vérifient les droits puis écrivent ;
- son compteur de nouveautés (@compteur, lus.py) ;
- ses notifications (notifier, mentions @Nom).

data/notes.json : {"notes": [{"id", "auteur", "titre", "texte", "images": [médias], "couverture": média ou "",
                              "cree_le", "modifie_le", "commentaires": [{"id", "auteur", "texte", "images", "cree_le"}]}]}
"""
import medias
from lus import compteur
from notifications import extrait, mentionnes, notifier, notifier_mentions
from requetes import Refus, interdit, texte
from routes import route
from stockage import NOTES, ecrire_json, lire_json, maintenant, nouvel_id

MAX_NOTES = 500
MAX_COMMENTAIRES = 1000
MAX_IMAGES = 12


def lire_notes():
    donnees = lire_json(NOTES, {})
    donnees.setdefault("notes", [])
    for n in donnees["notes"]:   # champs ajoutés après coup : les anciennes données restent lisibles
        n.setdefault("couverture", "")
        n.setdefault("images", [])
        n.setdefault("commentaires", [])
    return donnees


def trouver(donnees, ident):
    note = next((n for n in donnees["notes"] if n["id"] == ident), None)
    if not note:
        raise Refus("note introuvable", "404 Not Found")
    return note


def images_valides(images, maxi):
    """Images déjà envoyées (POST /api/televerser?type=image) à joindre : des noms de médias existants."""
    if images is None:
        return []
    if not isinstance(images, list) or len(images) > maxi:
        raise Refus(f"{maxi} images au plus")
    for image in images:
        chemin = medias.chemin(image) if isinstance(image, str) else None
        if not chemin or chemin.suffix not in medias.TYPES_IMAGES:
            raise Refus("image introuvable")
    return list(dict.fromkeys(images))


def peut_gerer(d, note):
    if note["auteur"] != d.nom and not d.admin:
        raise interdit("seuls l'auteur et l'admin peuvent faire ça")


def lien(note):
    return "#notes/" + note["id"]


# --- Ce que la page reçoit ---------------------------------------------------------------

def resumes(donnees):
    """Pour l'état général : la liste, la plus récente d'abord, sans les commentaires (chargés avec le détail)."""
    return [dict({k: v for k, v in n.items() if k != "commentaires"}, nb_commentaires=len(n["commentaires"]),
                 extrait=extrait(n["texte"], 200), couverture=n["couverture"] or (n["images"][0] if n["images"] else ""))
            for n in sorted(donnees["notes"], key=lambda n: n["cree_le"], reverse=True)]


def detail(ident):
    """GET /api/note?id= : la note entière, commentaires compris."""
    return trouver(lire_notes(), ident)


@compteur("notes")
def nouveautes(nom, vu):
    """{id: nombre} : la note elle-même si elle est d'un autre, puis les commentaires des autres depuis ma dernière visite."""
    resultat = {}
    for n in lire_notes()["notes"]:
        seuil = vu("notes/" + n["id"])
        nombre = sum(1 for x in [n] + n["commentaires"] if x["auteur"] != nom and x["cree_le"] > seuil)
        if nombre:
            resultat[n["id"]] = nombre
    return resultat


# --- Actions -----------------------------------------------------------------------------

@route("/api/notes/creer")
def creer(d):
    donnees = lire_notes()
    if len(donnees["notes"]) >= MAX_NOTES:
        raise Refus("trop de notes")
    note = {
        "id": nouvel_id(), "auteur": d.nom, "titre": texte(d.corps, "titre", 150, requis=True),
        "texte": texte(d.corps, "texte", 20000), "images": images_valides(d.corps.get("images"), MAX_IMAGES),
        "couverture": "", "cree_le": maintenant(), "commentaires": [],
    }
    donnees["notes"].append(note)
    ecrire_json(NOTES, donnees)
    notifier(d.config, "notes", "Nouvelle note", f"{d.nom} : {note['titre']}", lien(note), sauf=d.nom)
    notifier_mentions(d.config, d.nom, mentionnes(d.config, note["texte"]), f"{d.nom} t'a mentionné", note["titre"], lien(note))


@route("/api/notes/modifier")
def modifier(d):
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    peut_gerer(d, note)
    note["titre"] = texte(d.corps, "titre", 150, requis=True)
    note["texte"] = texte(d.corps, "texte", 20000)
    note["modifie_le"] = maintenant()
    ecrire_json(NOTES, donnees)


@route("/api/notes/images")
def changer_images(d):
    """La liste entière des images (ajout et retrait) ; les images retirées sont effacées du disque."""
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    peut_gerer(d, note)
    images = images_valides(d.corps.get("images") or [], MAX_IMAGES)
    retirees = set(note["images"]) - set(images) - {note["couverture"]}
    note["images"] = images
    ecrire_json(NOTES, donnees)
    for image in retirees:
        medias.supprimer(image)


@route("/api/notes/couverture")
def changer_couverture(d):
    """L'image de fond (affiche de la liste et en-tête), ou "" pour la retirer."""
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    peut_gerer(d, note)
    image = d.corps.get("image") or ""
    if image:
        images_valides([image], 1)
    ancienne = note["couverture"]
    note["couverture"] = image
    ecrire_json(NOTES, donnees)
    if ancienne and ancienne != image and ancienne not in note["images"]:
        medias.supprimer(ancienne)


@route("/api/notes/supprimer")
def supprimer(d):
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    peut_gerer(d, note)
    donnees["notes"].remove(note)
    ecrire_json(NOTES, donnees)
    for image in {note["couverture"], *note["images"], *(i for c in note["commentaires"] for i in c["images"])}:
        medias.supprimer(image)


@route("/api/notes/commenter")
def commenter(d):
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    if len(note["commentaires"]) >= MAX_COMMENTAIRES:
        raise Refus("trop de commentaires")
    contenu = texte(d.corps, "texte", 10000)
    images = images_valides(d.corps.get("images"), 4)
    if not contenu and not images:
        raise Refus("commentaire vide")
    note["commentaires"].append({"id": nouvel_id(), "auteur": d.nom, "texte": contenu, "images": images, "cree_le": maintenant()})
    ecrire_json(NOTES, donnees)
    cites = mentionnes(d.config, contenu)
    notifier_mentions(d.config, d.nom, cites, f"{d.nom} t'a mentionné", extrait(contenu), lien(note))
    # L'auteur et ceux qui ont déjà commenté, sauf ceux qui viennent d'être mentionnés (ils ont déjà leur ping).
    concernes = {note["auteur"], *(c["auteur"] for c in note["commentaires"])} - set(cites)
    notifier(d.config, "notes", note["titre"], f"{d.nom} : {extrait(contenu) or 'une image'}", lien(note),
             destinataires=concernes, sauf=d.nom)


@route("/api/notes/commentaire/supprimer")
def supprimer_commentaire(d):
    donnees = lire_notes()
    note = trouver(donnees, d.corps.get("id"))
    commentaire = next((c for c in note["commentaires"] if c["id"] == d.corps.get("commentaire")), None)
    if not commentaire:
        raise Refus("commentaire introuvable", "404 Not Found")
    if commentaire["auteur"] != d.nom and not d.admin:
        raise interdit("seuls l'auteur et l'admin peuvent faire ça")
    note["commentaires"].remove(commentaire)
    ecrire_json(NOTES, donnees)
    for image in commentaire["images"]:
        medias.supprimer(image)
