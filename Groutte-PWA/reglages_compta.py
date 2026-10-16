"""Staff > Réglages compta : les catégories de dépenses et le mode de remboursement.

data/categories.json : {"categories": [{"id", "nom", "type": "obligatoire" | "facultative",
                                        "regle": "egale" | "repas" | "nuits", "sam": bool, "supprimee": date ou ""}]}
data/reglages-compta.json : {"mode": "direct" | "minimum", "cloture": horodatage ou ""}

Sans fichier, les catégories de base (Alimentaire, Monster, Alcool). « NON GÉRÉ » n'est pas dans le fichier : elle est
toujours là, ne se modifie pas, et reste à la charge du payeur. Changer une catégorie ne vaut que pour les dépenses
validées ensuite : leurs parts sont figées à la validation (depenses.py).
La clôture des comptes se fera depuis Suivi des dépenses (jalon 3) : ici, on ne fait que la respecter.
"""
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import CATEGORIES, PROFILS, REGLAGES_COMPTA, ecrire_json, lire_json, nouvel_id, sans_accent

NON_GERE = {"id": "non-gere", "nom": "NON GÉRÉ", "type": "speciale", "regle": "payeur", "sam": False, "supprimee": ""}
DE_BASE = [
    {"id": "alimentaire", "nom": "Alimentaire", "type": "obligatoire", "regle": "repas", "sam": False, "supprimee": ""},
    {"id": "monster", "nom": "Monster", "type": "facultative", "regle": "nuits", "sam": False, "supprimee": ""},
    {"id": "alcool", "nom": "Alcool", "type": "facultative", "regle": "egale", "sam": True, "supprimee": ""},
]
TYPES = ("obligatoire", "facultative")
REGLES = {"egale": "à parts égales", "repas": "au prorata des repas", "nuits": "au prorata des nuits"}
MODES = {"direct": "Direct", "minimum": "Minimum de virements"}


def lire_categories():
    donnees = lire_json(CATEGORIES, None)
    if donnees is None:
        donnees = {"categories": [dict(c) for c in DE_BASE]}
    for c in donnees["categories"]:
        c.setdefault("sam", False)
        c.setdefault("supprimee", "")
    return donnees


def lire_reglages():
    donnees = lire_json(REGLAGES_COMPTA, {})
    donnees.setdefault("mode", "direct")
    donnees.setdefault("cloture", "")
    return donnees


def categorie(ident, donnees=None):
    if ident == NON_GERE["id"]:
        return NON_GERE
    return next((c for c in (donnees or lire_categories())["categories"] if c["id"] == ident), None)


def exiger_ouvert(d):
    d.exiger_staff()
    if lire_reglages()["cloture"]:
        raise Refus("les comptes sont clôturés")


@route("/api/compta/mode")
def changer_mode(d):
    """Les soldes ne changent pas : seules les listes « Je dois » et « On me doit » sont recalculées."""
    d.exiger_staff()
    mode = d.corps.get("mode")
    if mode not in MODES:
        raise Refus("mode inconnu")
    reglages = lire_reglages()
    if reglages["mode"] == mode:
        return
    reglages["mode"] = mode
    ecrire_json(REGLAGES_COMPTA, reglages)
    import staff   # import ici : staff importe gite_salle, qui importe compta, qui importe ce module
    staff.noter(d, "compta-mode", detail=MODES[mode])
    notifier(d.config, "comptes", "Mode de remboursement",
             f"Le mode de remboursement passe à {MODES[mode]} : regarde qui tu dois rembourser.", "#comptes", sauf=d.nom)


@route("/api/compta/categorie")
def regler_categorie(d):
    """Ajouter une catégorie, ou modifier celle désignée par `id`."""
    exiger_ouvert(d)
    donnees = lire_categories()
    ident = d.corps.get("id")
    cat = categorie(ident, donnees) if ident else None
    if ident and not cat:
        raise Refus("catégorie introuvable")
    if cat is NON_GERE:
        raise Refus("NON GÉRÉ ne se modifie pas")
    nom = texte(d.corps, "libelle", 30, requis=True)   # pas « nom » : c'est toujours le compte qui agit
    genre, regle = d.corps.get("type"), d.corps.get("regle")
    if genre not in TYPES or regle not in REGLES:
        raise Refus("type ou règle inconnus")
    if sans_accent(nom) == sans_accent(NON_GERE["nom"]) or any(
            sans_accent(c["nom"]) == sans_accent(nom) and c is not cat for c in donnees["categories"]):
        raise Refus("ce nom est déjà pris")
    devient_obligatoire = genre == "obligatoire" and (not cat or cat["type"] != "obligatoire")
    if not cat:
        cat = {"id": nouvel_id(), "supprimee": ""}
        donnees["categories"].append(cat)
    cat.update(nom=nom, type=genre, regle=regle, sam=genre == "facultative" and bool(d.corps.get("sam")))
    ecrire_json(CATEGORIES, donnees)
    import staff
    staff.noter(d, "compta-categorie", detail=f"{nom} ({genre}, {REGLES[regle]})")
    if devient_obligatoire:
        notifier(d.config, "comptes", "Catégories", f"Tu participes maintenant aux dépenses {nom}.", "#fiche", sauf=d.nom)


@route("/api/compta/categorie/supprimer")
def supprimer_categorie(d):
    """Plus proposée dans les nouvelles dépenses. Gardée, pour mémoire, si des dépenses validées l'utilisent."""
    exiger_ouvert(d)
    import depenses   # import ici : depenses importe ce module
    donnees = lire_categories()
    cat = categorie(d.corps.get("id"), donnees)
    if not cat or cat["supprimee"]:
        raise Refus("catégorie introuvable")
    if cat is NON_GERE:
        raise Refus("NON GÉRÉ ne se supprime pas")
    utilisee = [dep for dep in depenses.lire()["depenses"]
                if dep["mode"] == "communaute" and any(l.get("categorie") == cat["id"] for l in dep["lignes"])]
    en_cours = [dep for dep in utilisee if dep["etat"] != "validee"]
    if en_cours:
        raise Refus(f"{cat['nom']} est utilisée par des dépenses pas encore validées : "
                    + ", ".join(f"« {dep['motif']} » de {dep['auteur']}" for dep in en_cours))
    from stockage import aujourdhui
    if utilisee:
        cat["supprimee"] = aujourdhui()
    else:
        donnees["categories"].remove(cat)
    ecrire_json(CATEGORIES, donnees)
    import staff
    staff.noter(d, "compta-categorie-supprimee", detail=cat["nom"])
    if cat["type"] == "facultative":
        profils = lire_json(PROFILS, {})
        cocheurs = {n for n, p in profils.items() if cat["id"] in p.get("categories", [])}
        notifier(d.config, "comptes", "Catégories", f"La catégorie {cat['nom']} est supprimée.", "#fiche",
                 destinataires=cocheurs, sauf=d.nom)


def vue(utilisees):
    """Pour l'état : les catégories proposées (NON GÉRÉ en dernier) et les supprimées encore utilisées.
    `utilisees` : les identifiants utilisés par au moins une dépense."""
    toutes = lire_categories()["categories"]
    return {
        "categories": [c for c in toutes if not c["supprimee"]] + [NON_GERE],
        "supprimees": [c for c in toutes if c["supprimee"] and c["id"] in utilisees],
    }
