"""Staff > Réglages compta : les catégories de dépenses, le mode de remboursement, la page Dépenses visible ou non, les
repas gérés par la communauté et la clôture des comptes.

data/categories.json : {"categories": [{"id", "nom", "type": "obligatoire" | "facultative",
                                        "regle": "egale" | "repas" | "nuits", "sam": bool, "supprimee": date ou ""}]}
data/reglages-compta.json : {"mode": "direct" | "minimum", "cloture": horodatage ou "", "depenses_visibles": bool,
                             "repas": {"matin" | "midi" | "soir": {"gere": bool, "defaut": bool}},
                             "repas_historique": [{"depuis": horodatage, "repas": {...}}]}

Les repas gérés : un repas géré se coche dans Mes repas et compte dans les repas pris ; un repas Non géré ne compte
jamais. « defaut » : coché tant que la personne n'a rien choisi. Par défaut, seul le soir est géré, et coché.
Un changement ne vaut que pour les repas pas encore commencés : chaque réglage est daté (« repas_historique »), et un
repas suit le réglage en vigueur à l'heure où il commence (regle_repas).

Sans fichier, les catégories de base (Alimentaire, Monster, Alcool). « Non géré » n'est pas dans le fichier : elle est
toujours là, ne se modifie pas, et reste à la charge du payeur. Changer une catégorie ne vaut que pour les dépenses
validées ensuite : leurs parts sont figées à la validation (depenses.py).
La page Dépenses est cachée tant que le staff ne l'a pas ouverte (en général à l'arrivée au gîte) : sans elle, pas de
nouvelle dépense, sauf pour le staff, qui la voit toujours (pour les essais).
La clôture des comptes (irréversible) fige les dépenses, les présences, les catégories et les repas gérés.
"""
import sejour
from euros import euros
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import CATEGORIES, PROFILS, REGLAGES_COMPTA, ecrire_json, lire_json, maintenant, nouvel_id, sans_accent

NON_GERE = {"id": "non-gere", "nom": "Non géré", "type": "speciale", "regle": "payeur", "sam": False, "supprimee": ""}
DE_BASE = [
    {"id": "alimentaire", "nom": "Alimentaire", "type": "obligatoire", "regle": "repas", "sam": False, "supprimee": ""},
    {"id": "monster", "nom": "Monster", "type": "facultative", "regle": "nuits", "sam": False, "supprimee": ""},
    {"id": "alcool", "nom": "Alcool", "type": "facultative", "regle": "egale", "sam": True, "supprimee": ""},
]
TYPES = ("obligatoire", "facultative")
REGLES = {"egale": "à parts égales", "repas": "au prorata des repas", "nuits": "au prorata des nuits"}
MODES = {"direct": "Direct", "minimum": "Minimum de virements"}
REPAS_DEFAUT = {"matin": {"gere": False, "defaut": False}, "midi": {"gere": False, "defaut": False},
                "soir": {"gere": True, "defaut": True}}
MOT_CLOTURE = "CLÔTURER"


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
    donnees.setdefault("depenses_visibles", False)
    repas = donnees.setdefault("repas", {})
    for creneau, regle in REPAS_DEFAUT.items():
        repas.setdefault(creneau, dict(regle))
    donnees.setdefault("repas_historique", [])
    return donnees


def regle_repas(config, reglages, jour, creneau):
    """{"gere", "defaut"} du repas (jour, créneau) : le réglage en vigueur à l'heure où il commence."""
    debut = sejour.heure_debut(config, jour, creneau).isoformat(timespec="seconds")
    regle = REPAS_DEFAUT[creneau]
    for etape in reglages["repas_historique"]:
        if etape["depuis"] <= debut:
            regle = etape["repas"].get(creneau, regle)
    return regle


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


def exiger_depenses_visibles(d):
    if not d.staff and not lire_reglages()["depenses_visibles"]:
        raise Refus("la page Dépenses n'est pas encore ouverte")


@route("/api/compta/depenses-visibles")
def regler_depenses_visibles(d):
    """Ouvrir la page Dépenses à tout le monde (tout le monde est prévenu), ou la recacher."""
    d.exiger_staff()
    visibles = bool(d.corps.get("visibles"))
    reglages = lire_reglages()
    if reglages["depenses_visibles"] == visibles:
        return
    reglages["depenses_visibles"] = visibles
    ecrire_json(REGLAGES_COMPTA, reglages)
    import staff
    staff.noter(d, "compta-depenses", detail="visible" if visibles else "cachée")
    if visibles:
        notifier(d.config, "depenses", "Dépenses", "La page Dépenses est ouverte : note ce que tu paies pour le groupe.",
                 "#depenses", sauf=d.nom)


@route("/api/compta/repas")
def regler_repas(d):
    """Un créneau (matin, midi, soir) : géré par la communauté ou non, et coché par défaut ou non. Seuls les repas pas
    encore commencés changent (regle_repas)."""
    exiger_ouvert(d)
    creneau = d.corps.get("creneau")
    if creneau not in REPAS_DEFAUT:
        raise Refus("créneau inconnu")
    gere, defaut = bool(d.corps.get("gere")), bool(d.corps.get("defaut"))
    reglages = lire_reglages()
    regle = {"gere": gere, "defaut": defaut and gere}
    if reglages["repas"][creneau] == regle:
        return
    reglages["repas"][creneau] = regle
    reglages["repas_historique"].append({"depuis": maintenant(), "repas": {c: dict(r) for c, r in reglages["repas"].items()}})
    ecrire_json(REGLAGES_COMPTA, reglages)
    import staff
    staff.noter(d, "compta-repas", detail=f"{creneau} : {'géré' if gere else 'pas géré'}{', coché par défaut' if regle['defaut'] else ''}")


@route("/api/compta/cloturer")
def cloturer(d):
    """Irréversible, confirmé en retapant le mot. Chacun reçoit son plan final de virements."""
    d.exiger_staff()
    reglages = lire_reglages()
    if reglages["cloture"]:
        raise Refus("les comptes sont déjà clôturés")
    if str(d.corps.get("mot", "")).strip().upper() != MOT_CLOTURE:
        raise Refus(f"tape {MOT_CLOTURE} pour confirmer")
    reglages["cloture"] = maintenant()
    ecrire_json(REGLAGES_COMPTA, reglages)
    import staff
    import compta   # import ici : compta importe ce module
    staff.noter(d, "compta-cloture")
    c = compta.Compta(d.config)
    dettes = c.dettes()
    for nom in sorted(c.actifs):
        doit = [f"{euros(m)} à {a}" for (de, a), m in sorted(dettes.items()) if de == nom]
        recoit = [f"{euros(m)} de {de}" for (de, a), m in sorted(dettes.items()) if a == nom]
        texte = (("Tu dois " + ", ".join(doit) + ". ") if doit else "") + (("Tu dois recevoir " + ", ".join(recoit) + ".") if recoit else "")
        notifier(d.config, None, "Comptes clôturés", texte.strip() or "Tu es quitte : personne ne te doit rien, et tu ne dois rien.",
                 "#comptes", destinataires={nom})


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
        raise Refus("Non géré ne se modifie pas")
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
        raise Refus("Non géré ne se supprime pas")
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


def vue(utilisees, reglages):
    """Pour l'état : les catégories proposées (Non géré en dernier), les supprimées encore utilisées, et le réglage
    actuel des repas gérés. `utilisees` : les identifiants utilisés par au moins une dépense."""
    toutes = lire_categories()["categories"]
    return {
        "categories": [c for c in toutes if not c["supprimee"]] + [NON_GERE],
        "supprimees": [c for c in toutes if c["supprimee"] and c["id"] in utilisees],
        "repas": reglages["repas"],
    }
