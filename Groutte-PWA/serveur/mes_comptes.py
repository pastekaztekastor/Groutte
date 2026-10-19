"""Budget > Mes comptes : ce que je dois et à qui, ce qu'on me doit et qui me le doit. On y rembourse, on confirme les
remboursements reçus, on relance et on fait grâce. Les dettes elles-mêmes sont calculées par compta.py.

data/remboursements.json : {
    "remboursements": [{"id", "de", "a", "montant", "quand", "type": "remboursement" | "grace",
                        "etat": "declare" | "confirme" | "office" | "refuse", "le", "rappel",
                        "par_staff", "message", "ligne"}],   (une dette effacée par le staff : Suivi des dépenses)
    "relances": [{"de", "a", "quand"}]}

Un remboursement est un simple transfert d'argent entre deux personnes : il marche dans les deux modes. Seuls les
remboursements confirmés comptent. Sans réponse, celui qui reçoit a une dernière notification au bout de 7 jours,
et le remboursement est confirmé d'office 24 h plus tard (taches.py). Une grâce est un remboursement confirmé tout
de suite, sans argent qui circule.
"""
from datetime import datetime, timedelta

import comptes_donnees as cd
import compta
from euros import centimes, euros
from notifications import notifier
from requetes import Refus, interdit
from routes import route
from donnees import REMBOURSEMENTS
from stockage import ecrire_json, lire_json, maintenant, nouvel_id

SANS_REPONSE = timedelta(days=7)
DERNIER_DELAI = timedelta(hours=24)
RELANCE = timedelta(hours=24)


def lire():
    donnees = lire_json(REMBOURSEMENTS, {})
    donnees.setdefault("remboursements", [])
    donnees.setdefault("relances", [])
    for r in donnees["remboursements"]:
        r.setdefault("rappel", "")
    return donnees


def personne(d, cle):
    qui = d.corps.get(cle)
    if not isinstance(qui, str) or qui not in cd.noms_actifs(d.config):
        raise Refus("compte inconnu")
    if qui == d.nom:
        raise Refus("pas à toi-même")
    return qui


def phrase_reste(c, nom):
    """« il te reste 12,00 € à recevoir » d'après les dettes actives envers `nom`."""
    reste = sum(m for (de, a), m in c.dettes().items() if a == nom)
    return f"Il te reste {euros(reste)} à recevoir." if reste else "On ne te doit plus rien."


@route("/api/comptes/rembourser")
def rembourser(d):
    """Je déclare « j'ai remboursé X € ». En attente jusqu'à ce que la personne confirme."""
    a = personne(d, "a")
    montant = centimes(d.corps.get("montant"))
    c = compta.Compta(d.config)
    if c.dettes().get((d.nom, a), 0) <= 0:
        raise Refus(f"tu ne dois rien à {a}")
    donnees = lire()
    donnees["remboursements"].append({"id": nouvel_id(), "de": d.nom, "a": a, "montant": montant, "quand": maintenant(),
                                      "type": "remboursement", "etat": "declare", "le": "", "rappel": ""})
    ecrire_json(REMBOURSEMENTS, donnees)
    notifier(d.config, "comptes", "Remboursement", f"{d.nom} dit t'avoir remboursé {euros(montant)}, à confirmer.", "#comptes",
             destinataires={a}, sauf=d.nom)


@route("/api/comptes/confirmer")
def confirmer(d):
    """Celui qui reçoit : il a bien reçu l'argent (`recu`), ou rien n'est arrivé (le remboursement est annulé)."""
    donnees = lire()
    r = next((x for x in donnees["remboursements"] if x["id"] == d.corps.get("id")), None)
    if not r:
        raise Refus("remboursement introuvable")
    if r["a"] != d.nom:
        raise interdit("seul celui qui reçoit confirme")
    if r["etat"] != "declare":
        raise Refus("ce remboursement est déjà traité")
    recu = bool(d.corps.get("recu"))
    r.update(etat="confirme" if recu else "refuse", le=maintenant())
    ecrire_json(REMBOURSEMENTS, donnees)
    notifier(d.config, "comptes", "Remboursement confirmé" if recu else "Remboursement refusé",
             f"{d.nom} confirme avoir reçu tes {euros(r['montant'])}." if recu
             else f"{d.nom} n'a pas reçu tes {euros(r['montant'])} : le remboursement est annulé.", "#comptes",
             destinataires={r["de"]}, sauf=d.nom)


@route("/api/comptes/grace")
def faire_grace(d):
    """Celui à qui on doit renonce à tout ou partie : irréversible, et c'est lui qui absorbe le montant."""
    qui = personne(d, "qui")
    montant = centimes(d.corps.get("montant"))
    du = compta.Compta(d.config).dettes().get((qui, d.nom), 0)
    if du <= 0:
        raise Refus(f"{qui} ne te doit rien")
    if montant > du:
        raise Refus(f"{qui} ne te doit que {euros(du)}")
    donnees = lire()
    donnees["remboursements"].append({"id": nouvel_id(), "de": qui, "a": d.nom, "montant": montant, "quand": maintenant(),
                                      "type": "grace", "etat": "confirme", "le": maintenant(), "rappel": ""})
    ecrire_json(REMBOURSEMENTS, donnees)
    notifier(d.config, "comptes", "Grâce", f"{d.nom} t'a fait grâce de {euros(montant)}.", "#comptes", destinataires={qui}, sauf=d.nom)


@route("/api/comptes/relancer")
def relancer(d):
    """« Petit rappel : tu dois X € à Alice. » Au cas par cas, une fois par 24 h au plus."""
    qui = personne(d, "qui")
    du = compta.Compta(d.config).dettes().get((qui, d.nom), 0)
    if du <= 0:
        raise Refus(f"{qui} ne te doit rien")
    donnees = lire()
    seuil = (datetime.now() - RELANCE).isoformat(timespec="seconds")
    if any(x["de"] == d.nom and x["a"] == qui and x["quand"] > seuil for x in donnees["relances"]):
        raise Refus(f"tu as déjà relancé {qui} : une relance par 24 h au plus")
    donnees["relances"] = [x for x in donnees["relances"] if x["quand"] > seuil] + [{"de": d.nom, "a": qui, "quand": maintenant()}]
    ecrire_json(REMBOURSEMENTS, donnees)
    # Gardée dans ses Pings reçus : sans notifications (ou catégorie coupée), il la verra à sa prochaine ouverture.
    notifier(d.config, "comptes", "Petit rappel", f"Petit rappel : tu dois {euros(du)} à {d.nom}.", "#comptes",
             destinataires={qui}, sauf=d.nom, genre="relance", de=d.nom)


def rappeler(config):
    """Sous le verrou (taches.py) : la dernière notification au bout de 7 jours, puis la confirmation d'office."""
    donnees = lire()
    instant = datetime.now()
    confirmes = []
    change = False
    for r in donnees["remboursements"]:
        if r["etat"] != "declare":
            continue
        if not r["rappel"] and instant - datetime.fromisoformat(r["quand"]) >= SANS_REPONSE:
            r["rappel"] = maintenant()
            change = True
            notifier(config, None, "Remboursement à confirmer",
                     f"Sans réponse de ta part d'ici demain, le remboursement de {r['de']} ({euros(r['montant'])}) sera considéré comme reçu.",
                     "#comptes", destinataires={r["a"]})
        elif r["rappel"] and instant - datetime.fromisoformat(r["rappel"]) >= DERNIER_DELAI:
            r.update(etat="office", le=maintenant())
            confirmes.append(r)
            change = True
    if not change:
        return
    ecrire_json(REMBOURSEMENTS, donnees)
    c = compta.Compta(config)
    for r in confirmes:
        notifier(config, None, "Remboursement confirmé d'office",
                 f"Le remboursement de {r['de']} ({euros(r['montant'])}) est confirmé d'office. {phrase_reste(c, r['a'])}",
                 "#comptes", destinataires={r["a"]})
        notifier(config, "comptes", "Remboursement confirmé",
                 f"Ton remboursement de {euros(r['montant'])} à {r['a']} est confirmé d'office.", "#comptes",
                 destinataires={r["de"]})


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(REMBOURSEMENTS, ancien, nouveau, {"de", "a", "par_staff"})


# --- Ce que la page reçoit -------------------------------------------------------------------------

def vue(c, nom):
    dettes = c.dettes()
    en_attente = [r for r in c.remb["remboursements"] if r["etat"] == "declare"]
    seuil = (datetime.now() - RELANCE).isoformat(timespec="seconds")
    relances = {x["a"] for x in c.remb["relances"] if x["de"] == nom and x["quand"] > seuil}
    directes = c.dettes_directes() if c.mode() == "direct" else {}
    je_dois = [{
        "nom": a, "montant": m,
        "attente": [r for r in en_attente if r["de"] == nom and r["a"] == a],
        "detail": directes.get((nom, a), {}).get("elements", []),
    } for (de, a), m in sorted(dettes.items(), key=lambda x: -x[1]) if de == nom]
    on_me_doit = [{
        "nom": de, "montant": m,
        "attente": [r for r in en_attente if r["de"] == de and r["a"] == nom],
        "relance": de not in relances,
        "detail": directes.get((de, nom), {}).get("elements", []),
    } for (de, a), m in sorted(dettes.items(), key=lambda x: -x[1]) if a == nom]
    # Un remboursement déclaré par quelqu'un qui ne me doit plus rien (la dette a changé) : toujours à confirmer.
    deja = {l["nom"] for l in on_me_doit}
    for r in en_attente:
        if r["a"] == nom and r["de"] not in deja:
            on_me_doit.append({"nom": r["de"], "montant": 0, "attente": [x for x in en_attente if x["de"] == r["de"] and x["a"] == nom],
                               "relance": False, "detail": []})
            deja.add(r["de"])
    return {
        "mode": c.mode(),
        "cloture": c.cloture(),
        "depenses_visibles": c.reglages["depenses_visibles"],
        "solde": c.soldes().get(nom, 0),
        "je_dois": je_dois,
        "on_me_doit": on_me_doit,
        "historique": c.historique(nom),
        "mes_declares": [r for r in en_attente if r["de"] == nom],
    }
