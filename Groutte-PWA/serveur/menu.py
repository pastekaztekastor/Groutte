"""Repas > Menu : ce qu'on va cuisiner pour le groupe, avec la réserve de la communauté (« Le premier soir, je fais un
pâté aux patates »). Chacun dit s'il en mange. C'est une note d'intention : il n'y a pas d'argent ici.

data/menus.json : {"menus": [{"id", "auteur", "date", "creneau", "plat", "convient": [régimes], "matos", "ingredients",
                              "inscrits": [noms], "cree", "modifie", "mouvements": [{"quand", "delta"}]}]}

- Menu et Mes repas parlent de la même chose : m'inscrire coche le repas (repas.poser), me désinscrire du dernier menu de
  ce repas le décoche, décocher le repas me désinscrit de tous ses menus (desinscrire_repas).
- On ne vise que les repas gérés par la communauté, et seulement ceux où l'on est présent. Mêmes heures que Mes repas.
- « mouvements » : les inscriptions (+1) et désinscriptions (-1), pour dire à l'auteur « 12 inscrits (+3) » depuis la
  dernière fois qu'il a ouvert son menu (lus.py, « menu/<id> »).
- Le rôle automatique Chef (roles.json, source « menu ») : celui qui a au moins un menu.
"""
import comptes_donnees as cd
import compta
import repas
import sejour
from fiche import regimes_proposes
from lus import compteur
from notifications import notifier
from requetes import Refus, interdit, texte
from routes import route
from donnees import MENUS
from stockage import LUS, ecrire_json, lire_json, maintenant, nouvel_id

MAX_MENUS = 300
MOUVEMENTS_MAX = 200
QUAND = {"matin": "au matin", "midi": "à midi", "soir": "au soir"}


def lire():
    donnees = lire_json(MENUS, {})
    donnees.setdefault("menus", [])
    for m in donnees["menus"]:
        for cle, valeur in (("convient", []), ("matos", ""), ("ingredients", ""), ("inscrits", []), ("mouvements", [])):
            m.setdefault(cle, valeur)
    return donnees


def trouver(donnees, ident):
    m = next((x for x in donnees["menus"] if x["id"] == ident), None)
    if not m:
        raise Refus("ce menu n'existe plus", "404 Not Found")
    return m


def chefs():
    """Ceux qui ont au moins un menu, passé ou à venir : le rôle automatique Chef."""
    return {m["auteur"] for m in lire()["menus"]}


def repas_lisible(m):
    return f"le {sejour.date_courte(m['date'])} {QUAND[m['creneau']]}"


def lien(m):
    return "#menu/" + m["id"]


def mouvement(m, delta):
    m["mouvements"] = (m["mouvements"] + [{"quand": maintenant(), "delta": delta}])[-MOUVEMENTS_MAX:]


def prevenir_auteur(config, m, sauf):
    """« Pâté aux patates : 12 inscrits (+3) », depuis la dernière fois que l'auteur a ouvert son menu. Le message remplace
    le précédent (même page)."""
    vus = lire_json(LUS, {}).get(m["auteur"], {})
    depuis = max(vus.get("menu/" + m["id"], ""), vus.get("_depuis", ""))
    delta = sum(x["delta"] for x in m["mouvements"] if x["quand"] > depuis)
    n = len(m["inscrits"])
    ecart = f" ({'+' if delta > 0 else ''}{delta})" if delta else ""
    notifier(config, "repas", "Menu", f"{m['plat']} : {n} inscrit{'s' if n > 1 else ''}{ecart}.", lien(m),
             destinataires={m["auteur"]}, sauf=sauf)


def contenu(d):
    """Les champs d'un menu reçus de la page."""
    regimes = d.corps.get("convient", [])
    proposes = regimes_proposes(d.config)
    if not isinstance(regimes, list) or any(r not in proposes for r in regimes):
        raise Refus("régime inconnu")
    return {"plat": texte(d.corps, "plat", 80, requis=True), "date": d.corps.get("date"), "creneau": d.corps.get("creneau"),
            "convient": [r for r in proposes if r in regimes],
            "matos": texte(d.corps, "matos", 300), "ingredients": texte(d.corps, "ingredients", 300)}


def verifier_repas(c, nom, jour, creneau, qui="tu"):
    if creneau not in sejour.REPAS or jour not in sejour.jours(c.config):
        raise Refus("ce repas n'est pas dans le séjour")
    if not c.regle_repas(jour, creneau)["gere"]:
        raise Refus("ce repas n'est pas géré par la communauté : on n'y propose pas de menu")
    if (jour, creneau) not in c.repas_possibles(nom):
        raise Refus(f"{qui} n'es pas là à ce repas : change d'abord tes dates dans Présence" if qui == "tu"
                    else f"{qui} n'est pas là à ce repas")
    if sejour.commence(c.config, jour, creneau):
        raise Refus("ce repas a déjà commencé")


@route("/api/menu/enregistrer")
def enregistrer(d):
    """Proposer un menu, ou modifier le sien (`id`). Le staff ne touche pas aux menus des autres."""
    c = compta.Compta(d.config)
    donnees = lire()
    champs = contenu(d)
    ident = d.corps.get("id")
    verifier_repas(c, d.nom, champs["date"], champs["creneau"])
    if not ident:
        if len(donnees["menus"]) >= MAX_MENUS:
            raise Refus("trop de menus")
        m = dict(champs, id=nouvel_id(), auteur=d.nom, inscrits=[], mouvements=[], cree=maintenant(), modifie="")
        donnees["menus"].append(m)
        ecrire_json(MENUS, donnees)
        venants = set(c.venants())
        notifier(d.config, "repas", "Menu", f"{d.nom} propose {champs['plat']} {repas_lisible(m)}.", lien(m),
                 destinataires=venants, sauf=d.nom)
        return {"menu": m["id"]}
    m = trouver(donnees, ident)
    if m["auteur"] != d.nom:
        raise interdit("seul l'auteur modifie son menu")
    if sejour.commence(d.config, m["date"], m["creneau"]):
        raise Refus("ce repas a déjà commencé : le menu ne se modifie plus")
    deplace = (m["date"], m["creneau"]) != (champs["date"], champs["creneau"])
    inscrits = [n for n in m["inscrits"] if n != d.nom]
    ancien = repas_lisible(m)
    m.update(champs, modifie=maintenant())
    if deplace:
        m["inscrits"] = []
        m["mouvements"] = []
    ecrire_json(MENUS, donnees)
    texte_notif = (f"{d.nom} déplace {m['plat']} ({ancien}) {repas_lisible(m)} : réinscris-toi si tu en manges." if deplace
                   else f"{d.nom} a modifié son menu : {m['plat']} {repas_lisible(m)}.")
    notifier(d.config, "repas", "Menu modifié", texte_notif, lien(m), destinataires=set(inscrits), sauf=d.nom)
    return {"menu": m["id"]}


@route("/api/menu/supprimer")
def supprimer(d):
    """L'auteur seul. Les repas des inscrits restent tels quels dans Mes repas."""
    donnees = lire()
    m = trouver(donnees, d.corps.get("id"))
    if m["auteur"] != d.nom:
        raise interdit("seul l'auteur supprime son menu")
    donnees["menus"].remove(m)
    ecrire_json(MENUS, donnees)
    notifier(d.config, "repas", "Menu supprimé", f"{d.nom} a retiré son menu : {m['plat']} {repas_lisible(m)}.", "#menu",
             destinataires=set(m["inscrits"]), sauf=d.nom)


@route("/api/menu/manger")
def manger(d):
    """`mange` : true, je m'inscris (et le repas est coché dans Mes repas) ; false, je me désinscris (et le repas est
    décoché si je n'ai plus aucun menu à ce repas)."""
    mange = d.corps.get("mange")
    if not isinstance(mange, bool):
        raise Refus("tu en manges, oui ou non ?")
    donnees = lire()
    m = trouver(donnees, d.corps.get("id"))
    c = compta.Compta(d.config)
    repas.verifier(c, d.nom, m["date"], m["creneau"])
    if mange == (d.nom in m["inscrits"]):
        return
    if mange:
        m["inscrits"].append(d.nom)
    else:
        m["inscrits"].remove(d.nom)
    mouvement(m, 1 if mange else -1)
    ecrire_json(MENUS, donnees)
    meme_repas = [x for x in donnees["menus"] if (x["date"], x["creneau"]) == (m["date"], m["creneau"])]
    if mange:
        repas.poser(d.nom, m["date"], m["creneau"], True)
    elif not any(d.nom in x["inscrits"] for x in meme_repas):
        repas.poser(d.nom, m["date"], m["creneau"], False)
    prevenir_auteur(d.config, m, d.nom)


def desinscrire_repas(config, nom, jour, creneau):
    """Sous le verrou : j'ai décoché ce repas dans Mes repas, je ne suis plus inscrit à aucun de ses menus."""
    donnees = lire()
    touches = [m for m in donnees["menus"] if (m["date"], m["creneau"]) == (jour, creneau) and nom in m["inscrits"]]
    if not touches:
        return
    for m in touches:
        m["inscrits"].remove(nom)
        mouvement(m, -1)
    ecrire_json(MENUS, donnees)
    for m in touches:
        prevenir_auteur(config, m, nom)


def apres_presence(config, nom, avant, apres):
    """Sous le verrou : mes dates ont changé. Mes inscriptions hors de mes nouvelles dates sont retirées ; si je ne suis
    plus là pour un de mes menus, ses inscrits sont prévenus (le menu reste : à moi de le supprimer ou de le déplacer)."""
    donnees = lire()
    change = False
    orphelins = []
    for m in donnees["menus"]:
        repas_du_menu = (m["date"], m["creneau"])
        if nom in m["inscrits"] and repas_du_menu not in apres:
            m["inscrits"].remove(nom)
            mouvement(m, -1)
            change = True
            prevenir_auteur(config, m, nom)
        if m["auteur"] == nom and repas_du_menu in avant and repas_du_menu not in apres:
            orphelins.append(m)
    if change:
        ecrire_json(MENUS, donnees)
    for m in orphelins:
        notifier(config, "repas", "Menu", f"{nom} n'est plus présent {repas_lisible(m)} : son menu {m['plat']} est en suspens.",
                 lien(m), destinataires=set(m["inscrits"]), sauf=nom)


@compteur("menu")
def nouveaux_menus(nom, vu):
    """Les menus des autres que je n'ai pas vus, et les mouvements sur les miens depuis que je les ai ouverts."""
    resultat = {}
    for m in lire()["menus"]:
        if m["auteur"] != nom:
            if m["cree"] > max(vu("menu"), vu("menu/" + m["id"])):
                resultat[m["id"]] = 1
        else:
            n = sum(1 for x in m["mouvements"] if x["quand"] > vu("menu/" + m["id"]))
            if n:
                resultat[m["id"]] = n
    return resultat


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(MENUS, ancien, nouveau, {"auteur", "inscrits"})


def vue():
    """Tous les menus (tout le monde les voit), dans l'ordre du repas visé, puis de création ; sans les mouvements."""
    ordre = {cr: i for i, cr in enumerate(sejour.REPAS)}
    menus = sorted(lire()["menus"], key=lambda m: (m["date"], ordre.get(m["creneau"], 9), m["cree"]))
    return [{cle: v for cle, v in m.items() if cle != "mouvements"} for m in menus]
