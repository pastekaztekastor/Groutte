"""Staff > Gîte et salle : l'argent du gîte et de la salle (montants, hébergeurs, dates limites, répartition de la
salle, exemptions, ouverture des paiements), les couchages (lits, plan, salle comme couchage) et les inscriptions
tardives. Les calculs des parts sont dans compta.py ; cette page ne fait que fournir les réglages.

data/gite-salle.json : {
    "limite_inscription": "AAAA-MM-JJ" ou "", "limite_paiement": "AAAA-MM-JJ" ou "",
    "gite":  {"montant": centimes, "hebergeur": nom, "ouverture": horodatage ou "", "instantane": {nom: nuits},
              "repartition": "nuits" | "egale"},
    "salle": {... la même chose},
    "exemptions": {nom: {"gite": bool, "salle": bool, "communaute": bool}},
    "lits": [{"lettre", "description", "places", "complet"}], "salle_couchage": bool, "plan": média ou "",
    "literie": {"matelas": n, "duvets": n}}

« complet » : le lit a sa couette (vrai par défaut) ; sinon celui qui y dort a besoin d'un duvet (Lits). « literie » : les
matelas d'appoint et les duvets fournis par le gîte, en plus des lits, valables pour toutes les nuits.

« instantane » : les nuits de chacun au moment de l'ouverture des paiements. Les parts sont figées sur ces nuits :
les changements de dates qui suivent font des retardataires (compta.py), pas de nouvelles parts.
"""
import re

import comptes_donnees as cd
import compta
import medias
from euros import euros
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import GITE_SALLE, PROFILS, ecrire_json, lire_json, maintenant

QUOI = ("gite", "salle")
NOMS = {"gite": "gîte", "salle": "salle"}
# Ce dont on peut être exempté : le gîte, la salle, et les dépenses pour la communauté (les courses de la réserve).
EXEMPTIONS = QUOI + ("communaute",)
NOMS_EXEMPTIONS = dict(NOMS, communaute="dépenses de la communauté")
# Répartition par défaut : le gîte au prorata des nuits, la salle à parts égales.
REPARTITION_DEFAUT = {"gite": "nuits", "salle": "egale"}
MONTANT_MAX = 10_000_000   # 100 000 € : une faute de frappe, sinon
LITS_MAX = 40


def lire():
    donnees = lire_json(GITE_SALLE, {})
    donnees.setdefault("limite_inscription", "")
    donnees.setdefault("limite_paiement", "")
    for quoi in QUOI:
        x = donnees.setdefault(quoi, {})
        for cle, valeur in (("montant", 0), ("hebergeur", ""), ("ouverture", ""), ("instantane", {})):
            x.setdefault(cle, valeur)
        x.setdefault("repartition", REPARTITION_DEFAUT[quoi])
    donnees.setdefault("exemptions", {})
    donnees.setdefault("lits", [])
    donnees.setdefault("salle_couchage", False)
    donnees.setdefault("plan", "")
    for lit in donnees["lits"]:
        lit.setdefault("complet", True)
    literie = donnees.setdefault("literie", {})
    literie.setdefault("matelas", 0)
    literie.setdefault("duvets", 0)
    return donnees


def hebergeurs(donnees=None):
    donnees = donnees or lire()
    return {quoi: donnees[quoi]["hebergeur"] for quoi in QUOI if donnees[quoi]["hebergeur"]}


def est_hebergeur(nom):
    return nom in hebergeurs().values()


def capacite(donnees):
    """La capacité du gîte : la somme des places de tous les lits, sans la salle."""
    return sum(l["places"] for l in donnees["lits"])


def est_tardif(config, nom, comptes=None, donnees=None):
    """Compte créé après la date limite d'inscription, et pas encore accepté : il ne peut pas saisir ses dates.
    Un staff n'est jamais en retard : c'est lui qui accepte les inscriptions."""
    comptes = comptes or cd.lire_comptes(config)
    donnees = donnees or lire()
    c = comptes.get(nom)
    limite = donnees["limite_inscription"]
    return bool(c and limite and not c["staff"] and c["cree"][:10] > limite and not c["inscription_acceptee"])


def prevenir_inscription(config, nom):
    """Appelé à l'inscription (acces.py) : une inscription tardive est à accepter par l'hébergeur (ou un staff)."""
    if not est_tardif(config, nom):
        return
    cibles = set(hebergeurs().values()) or set(cd.staffs_actifs(cd.lire_comptes(config)))
    notifier(config, None, "Inscription tardive", f"Inscription tardive de {nom}, à accepter.", "#gite-salle",
             destinataires=cibles, sauf=nom)


def noter(d, action, qui="", detail=""):
    import staff   # import ici : staff importe ce module
    staff.noter(d, action, qui, detail)


def date_valide(valeur):
    if valeur in ("", None):
        return ""
    if not isinstance(valeur, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valeur):
        raise Refus("date invalide")
    return valeur


def quoi_valide(d):
    quoi = d.corps.get("quoi")
    if quoi not in QUOI:
        raise Refus("gîte ou salle ?")
    return quoi


def parts_avant_apres(d, changer):
    """Applique `changer(donnees)`, enregistre, puis prévient ceux dont la part a changé après l'ouverture
    (« Ta part du gîte est passée de 140 € à 152 € »)."""
    avant = compta.Compta(d.config)
    donnees = lire()
    changer(donnees)
    ecrire_json(GITE_SALLE, donnees)
    apres = compta.Compta(d.config)
    for quoi in QUOI:
        if not donnees[quoi]["ouverture"]:
            continue
        p1, p2 = avant.parts(quoi), apres.parts(quoi)
        for nom in set(p1) | set(p2):
            if p1.get(nom, 0) != p2.get(nom, 0) and nom != donnees[quoi]["hebergeur"]:
                notifier(d.config, None, f"Part {'du gîte' if quoi == 'gite' else 'de la salle'}",
                         f"Ta part {'du gîte' if quoi == 'gite' else 'de la salle'} est passée de "
                         f"{euros(p1.get(nom, 0))} à {euros(p2.get(nom, 0))}.", "#creances", destinataires={nom})


# --- Dates limites ---------------------------------------------------------------------------------

@route("/api/gite/dates")
def regler_dates(d):
    d.exiger_staff()
    donnees = lire()
    for cle in ("limite_inscription", "limite_paiement"):
        if cle in d.corps:
            valeur = date_valide(d.corps[cle])
            if not valeur and cle == "limite_paiement" and any(donnees[q]["ouverture"] for q in QUOI):
                raise Refus("les paiements sont ouverts : la date limite de paiement reste fixée")
            donnees[cle] = valeur
            noter(d, "gite-date", detail=f"{'inscription' if cle == 'limite_inscription' else 'paiement'} : {valeur or 'aucune'}")
    ecrire_json(GITE_SALLE, donnees)


# --- Gîte et salle : montant, hébergeur, répartition, ouverture ------------------------------------

@route("/api/gite/montant")
def regler_montant(d):
    d.exiger_staff()
    quoi = quoi_valide(d)
    montant = d.corps.get("montant")
    if not isinstance(montant, int) or isinstance(montant, bool) or not 0 <= montant <= MONTANT_MAX:
        raise Refus("montant invalide")
    if not montant and lire()[quoi]["ouverture"]:
        raise Refus("les paiements sont ouverts : le montant ne peut plus être vide")

    def changer(donnees):
        donnees[quoi]["montant"] = montant
    parts_avant_apres(d, changer)
    noter(d, "gite-montant", detail=f"{NOMS[quoi]} : {euros(montant)}")


@route("/api/gite/hebergeur")
def choisir_hebergeur(d):
    """L'hébergeur avance la location : forcément un staff. Figé à l'ouverture des paiements."""
    d.exiger_staff()
    quoi = quoi_valide(d)
    donnees = lire()
    qui = d.corps.get("qui") or ""
    comptes = cd.lire_comptes(d.config)
    if qui and (qui not in comptes or comptes[qui]["desactive"] or not comptes[qui]["staff"]):
        raise Refus("l'hébergeur est forcément un staff")
    ancien = donnees[quoi]["hebergeur"]
    if qui == ancien:
        return
    if donnees[quoi]["ouverture"]:
        raise Refus("les paiements sont ouverts : l'hébergeur ne change plus")
    donnees[quoi]["hebergeur"] = qui
    ecrire_json(GITE_SALLE, donnees)
    noter(d, "gite-hebergeur", qui, f"{NOMS[quoi]}")
    lieu = "du gîte" if quoi == "gite" else "de la salle"
    if qui:
        notifier(d.config, None, "Hébergeur", f"{d.nom} t'a désigné hébergeur {lieu} : c'est toi qui recevras les paiements.",
                 "#creances", destinataires={qui}, sauf=d.nom)
    if ancien and ancien != qui:
        notifier(d.config, None, "Hébergeur", f"Tu n'es plus l'hébergeur {lieu}.", "#creances", destinataires={ancien}, sauf=d.nom)


@route("/api/gite/repartition")
def choisir_repartition(d):
    """Le gîte ou la salle : au prorata des nuits, ou à parts égales entre ceux qui viennent."""
    d.exiger_staff()
    quoi = d.corps.get("quoi", "salle")
    if quoi not in QUOI:
        raise Refus("gîte ou salle ?")
    repartition = d.corps.get("repartition")
    if repartition not in ("egale", "nuits"):
        raise Refus("répartition inconnue")

    def changer(donnees):
        donnees[quoi]["repartition"] = repartition
    parts_avant_apres(d, changer)
    noter(d, "gite-repartition", detail=f"{NOMS[quoi]} : {'parts égales' if repartition == 'egale' else 'au prorata des nuits'}")


@route("/api/gite/exemption")
def regler_exemption(d):
    """Exempter quelqu'un du gîte, de la salle, des dépenses de la communauté, ou de plusieurs. Tout à non :
    l'exemption est retirée. L'exemption de la communauté ne vaut que pour les dépenses validées ensuite."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = d.corps.get("qui")
    if not isinstance(qui, str) or qui not in comptes:
        raise Refus("compte inconnu")
    choix = {quoi: bool(d.corps.get(quoi)) for quoi in EXEMPTIONS}
    avant = lire()["exemptions"].get(qui, {})
    if all(avant.get(q, False) == choix[q] for q in EXEMPTIONS):
        return

    def changer(donnees):
        if any(choix.values()):
            donnees["exemptions"][qui] = choix
        else:
            donnees["exemptions"].pop(qui, None)
    parts_avant_apres(d, changer)
    detail = ", ".join(NOMS_EXEMPTIONS[q] for q in EXEMPTIONS if choix[q]) or "aucune"
    noter(d, "gite-exemption", qui, detail)
    notifier(d.config, None, "Exemption",
             f"Tu es exempté : {detail}." if any(choix.values()) else "Ton exemption est retirée : tu as de nouveau une part à payer.",
             "#creances", destinataires={qui}, sauf=d.nom)


@route("/api/gite/ouvrir")
def ouvrir_paiements(d):
    """Définitif : les parts sont figées sur les nuits de chacun à cet instant, et le bouton Payer apparaît."""
    d.exiger_staff()
    quoi = quoi_valide(d)
    donnees = lire()
    x = donnees[quoi]
    if x["ouverture"]:
        raise Refus("les paiements sont déjà ouverts")
    if not x["montant"]:
        raise Refus("indique d'abord le montant")
    if not x["hebergeur"]:
        raise Refus("choisis d'abord l'hébergeur")
    if not donnees["limite_paiement"]:
        raise Refus("fixe d'abord la date limite de paiement")
    paiement = lire_json(PROFILS, {}).get(x["hebergeur"], {}).get("paiement", {})
    from comptes import moyens_renseignes   # import ici : comptes importe acces, qui importe ce module
    if not moyens_renseignes(paiement):
        notifier(d.config, None, "Me rembourser", "Ajoute un moyen de paiement pour qu'on puisse te payer.", "#rembourser",
                 destinataires={x["hebergeur"]})
        raise Refus(f"{x['hebergeur']} n'a aucun moyen de paiement dans Me rembourser : il vient d'être prévenu")
    c = compta.Compta(d.config)
    x["instantane"] = {nom: c.nuits(nom) for nom in c.venants()}
    x["ouverture"] = maintenant()
    ecrire_json(GITE_SALLE, donnees)
    noter(d, "gite-ouverture", detail=NOMS[quoi])
    apres = compta.Compta(d.config)
    for nom, part in apres.parts(quoi).items():
        if nom != x["hebergeur"] and part > 0:
            notifier(d.config, None, "Paiements ouverts",
                     f"Tu peux payer ta part {'du gîte' if quoi == 'gite' else 'de la salle'} : {euros(part)}.",
                     "#creances", destinataires={nom})


# --- Couchages -------------------------------------------------------------------------------------

def lettre_valide(valeur):
    lettre = (valeur or "").strip().upper() if isinstance(valeur, str) else ""
    if not re.fullmatch(r"[A-Z0-9]{1,3}", lettre):
        raise Refus("la lettre du lit : 1 à 3 lettres ou chiffres (A, B, C1...)")
    return lettre


@route("/api/gite/lit")
def regler_lit(d):
    """Ajouter un lit, ou modifier celui désigné par `ancienne` (sa lettre actuelle)."""
    d.exiger_staff()
    import lits   # import ici : lits importe ce module
    donnees = lire()
    lettre = lettre_valide(d.corps.get("lettre"))
    description = texte(d.corps, "description", 80)
    places = d.corps.get("places")
    if not isinstance(places, int) or isinstance(places, bool) or not 1 <= places <= 20:
        raise Refus("un lit a au moins une place")
    ancienne = d.corps.get("ancienne")
    lit = next((l for l in donnees["lits"] if l["lettre"] == ancienne), None) if ancienne else None
    if ancienne and not lit:
        raise Refus("lit introuvable")
    if any(l["lettre"] == lettre and l is not lit for l in donnees["lits"]):
        raise Refus(f"la lettre {lettre} est déjà prise")
    if not lit:
        if len(donnees["lits"]) >= LITS_MAX:
            raise Refus("trop de lits")
        lit = {}
        donnees["lits"].append(lit)
    lit.update(lettre=lettre, description=description, places=places, complet=d.corps.get("complet", True) is not False)
    donnees["lits"].sort(key=lambda l: l["lettre"])
    ecrire_json(GITE_SALLE, donnees)
    if ancienne and ancienne != lettre:
        lits.renommer_lit(ancienne, lettre)
    lits.ajuster(d.config, donnees, f"le lit {lettre} a changé")
    noter(d, "gite-lit", detail=f"{lettre} ({places} place{'s' if places > 1 else ''}{'' if lit['complet'] else ', incomplet'})")


@route("/api/gite/literie")
def regler_literie(d):
    """La literie fournie par le gîte : des matelas d'appoint et des duvets (couettes, couvertures)."""
    d.exiger_staff()
    donnees = lire()
    for objet in ("matelas", "duvets"):
        if objet in d.corps:
            n = d.corps[objet]
            if not isinstance(n, int) or isinstance(n, bool) or not 0 <= n <= 200:
                raise Refus(f"nombre de {objet} invalide")
            donnees["literie"][objet] = n
    ecrire_json(GITE_SALLE, donnees)
    noter(d, "gite-literie", detail=f"{donnees['literie']['matelas']} matelas, {donnees['literie']['duvets']} duvets")


@route("/api/gite/lit/supprimer")
def supprimer_lit(d):
    d.exiger_staff()
    import lits
    donnees = lire()
    lettre = d.corps.get("lettre")
    if not any(l["lettre"] == lettre for l in donnees["lits"]):
        raise Refus("lit introuvable")
    donnees["lits"] = [l for l in donnees["lits"] if l["lettre"] != lettre]
    ecrire_json(GITE_SALLE, donnees)
    lits.ajuster(d.config, donnees, f"le lit {lettre} a été retiré")
    noter(d, "gite-lit-supprime", detail=lettre)


@route("/api/gite/salle-couchage")
def salle_couchage(d):
    d.exiger_staff()
    import lits
    donnees = lire()
    actif = bool(d.corps.get("actif"))
    if donnees["salle_couchage"] == actif:
        return
    donnees["salle_couchage"] = actif
    ecrire_json(GITE_SALLE, donnees)
    lits.ajuster(d.config, donnees, "la salle ne sert plus de couchage")
    noter(d, "gite-salle-couchage", detail="oui" if actif else "non")


@route("/api/gite/plan")
def changer_plan(d):
    """Le plan du gîte : une image où les lettres des lits sont dessinées ("" : retirer)."""
    d.exiger_staff()
    donnees = lire()
    image = d.corps.get("image") or ""
    if image:
        chemin = medias.chemin(image) if isinstance(image, str) else None
        if not chemin or chemin.suffix not in medias.TYPES_IMAGES:
            raise Refus("image introuvable")
    ancien = donnees["plan"]
    donnees["plan"] = image
    ecrire_json(GITE_SALLE, donnees)
    if ancien and ancien != image:
        medias.supprimer(ancien)
    noter(d, "gite-plan")


# --- Inscriptions tardives -------------------------------------------------------------------------

@route("/api/gite/accepter")
def accepter_inscription(d):
    """Le compte, créé après la date limite d'inscription, peut alors saisir ses dates (Présence)."""
    d.exiger_staff()
    comptes = cd.lire_comptes(d.config)
    qui = d.corps.get("qui")
    if not isinstance(qui, str) or qui not in comptes:
        raise Refus("compte inconnu")
    if comptes[qui]["inscription_acceptee"]:
        return
    comptes[qui]["inscription_acceptee"] = {"par": d.nom, "quand": maintenant()}
    cd.ecrire_comptes(comptes)
    noter(d, "gite-inscription", qui)
    notifier(d.config, None, "Inscription acceptée", "Ton inscription est acceptée : tu peux maintenant saisir tes dates.",
             "#presence", destinataires={qui}, sauf=d.nom)


@cd.renommage
def renommer(ancien, nouveau):
    donnees = cd.renommer_dans(lire(), ancien, nouveau, {"hebergeur"})
    ecrire_json(GITE_SALLE, donnees)


# --- Ce que la page reçoit -------------------------------------------------------------------------

def vue(c, nom, staff):
    """La partie « gite » de l'état : réglages publics, et pour le staff les noms des exemptés et le suivi."""
    donnees = c.gs
    resultat = {
        "limite_inscription": donnees["limite_inscription"],
        "limite_paiement": donnees["limite_paiement"],
        "lits": donnees["lits"],
        "capacite": capacite(donnees),
        "salle_couchage": donnees["salle_couchage"],
        "plan": donnees["plan"],
        "literie": donnees["literie"],
        "tardif": est_tardif(c.config, nom, c.comptes, donnees),
        "nb_exemptes": {quoi: sum(1 for e in donnees["exemptions"].values() if e.get(quoi)) for quoi in EXEMPTIONS},
        "exempte_communaute": bool(donnees["exemptions"].get(nom, {}).get("communaute")),
    }
    for quoi in QUOI:
        x = donnees[quoi]
        resultat[quoi] = {"montant": x["montant"], "hebergeur": x["hebergeur"], "ouverture": x["ouverture"],
                          "repartition": x["repartition"]}
    if staff:
        from comptes import moyens_renseignes
        resultat["exemptions"] = donnees["exemptions"]
        resultat["sans_moyen"] = sorted(n for n in cd.staffs_actifs(c.comptes)
                                        if not moyens_renseignes(c.profils.get(n, {}).get("paiement", {})))
        resultat["tardifs"] = sorted(
            ({"nom": n, "cree": cpt["cree"]} for n, cpt in c.comptes.items()
             if not cpt["desactive"] and est_tardif(c.config, n, c.comptes, donnees)),
            key=lambda t: t["cree"])
    return resultat
