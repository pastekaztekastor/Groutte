"""Tout ce que Groutte branche sur le socle (socle/serveur/extensions.py), au même endroit : ce que chaque compte voit
en plus, les cartes des comptes, les filtres d'annonce, la protection des hébergeurs et des soldes, les vérifications
après chaque action et au chargement, l'inscription tardive, et le détail d'un fil du forum.
"""
import comptes_donnees as cd
import compta
import creances
import depenses
import forum
import gite_salle
import lits
import llm
import menu
import mes_comptes
import reglages_compta
import sejour
import suivi
import taches
import tournois
from donnees import lire_flairs, lire_reactions
from euros import euros
from extensions import (apres_action, apres_inscription, au_chargement, cartes_comptes, partie_etat, protection_compte,
                        publics_annonce, route_get)
from fiche import moyens_renseignes, regimes_proposes
from notifications import notifier
from requetes import Refus
from stockage import PROFILS, lire_json

CHAMPS_FICHE = ("prenom", "pseudo", "discord", "telephone", "allergies")


# --- Ce que chaque compte voit ----------------------------------------------------------------------

@cartes_comptes
def completer_cartes(cartes, comptes, profils, config):
    """La fiche de chacun, et les rôles automatiques (Hébergeur de Gîte et salle, Chef du Menu, tournois)."""
    automatiques = {"hebergeur": set(gite_salle.hebergeurs().values()), "chef": menu.chefs(), **tournois.automatiques(profils)}
    for nom, carte in cartes.items():
        profil = profils.get(nom, {})
        carte.update({cle: profil.get(cle, "") for cle in CHAMPS_FICHE})
        carte["roles"] += [r for r, noms in automatiques.items() if nom in noms and r not in carte["roles"]]
        carte.update(regimes=profil.get("regimes", []), photo_ok=profil.get("photo_ok", True),
                     categories=profil.get("categories", []), tournois=profil.get("tournois", []),
                     matelas=profil.get("matelas"), duvets=profil.get("duvets"))


@partie_etat
def vue_groutte(nom, config, est_staff):
    profils = lire_json(PROFILS, {})
    resultat = {
        "moi": {"paiement": profils.get(nom, {}).get("paiement", {})},
        "roles": cd.lire_roles() + tournois.roles(),
        "regimes": regimes_proposes(config),
        "tournois": tournois.vue(profils),   # Tournois > Inscription : [{..., "inscrits": [noms]}]
        "discord_gestion": config.get("discord_gestion", ""),
        "forum": forum.resumes(forum.lire_forum(), nom),
        "flairs": lire_flairs(),
        "reactions": lire_reactions(),
    }
    resultat.update(etat_sejour(config, nom, est_staff))
    resultat.update(llm.vue(config, est_staff))
    return resultat


def etat_sejour(config, nom, est_staff):
    """Gîte, repas et budget : tout vient d'un seul calcul (compta.py)."""
    c = compta.Compta(config)
    debut, fin = sejour.bornes(config)
    presences = {}
    for n, p in c.presences.items():
        if n in c.actifs and "arrivee" in p:
            presences[n] = {"arrivee": p["arrivee"], "depart": p["depart"], "hors": sejour.hors_sejour(config, p),
                            "repas": [list(x) for x in c.repas_pris(n)]}
    # Les repas gérés par la communauté (« date/créneau »), chacun selon le réglage en vigueur quand il commence.
    geres = [f"{j}/{cr}" for j in sejour.jours(config) for cr in sejour.REPAS if c.regle_repas(j, cr)["gere"]]
    utilisees = {l.get("categorie") for dep in c.deps["depenses"] for l in dep["lignes"]}
    vue_compta = mes_comptes.vue(c, nom)
    # Les moyens de paiement de ceux que je dois payer : les hébergeurs (si j'ai une part) et mes créanciers.
    a_payer = {c.hebergeur(q) for q in gite_salle.QUOI if c.parts(q).get(nom)} | {l["nom"] for l in vue_compta["je_dois"]}
    a_payer.discard("")
    resultat = {
        "sejour": {"debut": debut, "fin": fin, "jours": sejour.jours(config), "nuits": sejour.nuits(config),
                   "heures_repas": {cr: sejour.heure_debut(config, debut, cr).strftime("%H:%M") for cr in sejour.REPAS},
                   "repas_geres": geres},
        "presences": presences,
        "ne_vient_pas": "ne_vient_pas" in c.presences.get(nom, {}),
        "gite": gite_salle.vue(c, nom, est_staff),
        "reservations": lits.vue(c, nom),
        "creances": creances.vue(c, nom, est_staff),
        "compta": vue_compta,
        "depenses": depenses.vue(c, nom, est_staff),
        "categories": reglages_compta.vue(utilisees, c.reglages),
        "paiements_de": {n: c.profils.get(n, {}).get("paiement", {}) for n in sorted(a_payer)},
        "literie": lits.bilan(c),
        "sans_literie": lits.sans_literie(c),
        "menus": menu.vue(),
    }
    if est_staff:
        resultat["suivi"] = suivi.vue(c)
        # Staff > Annonces, filtre « doit plus de X € » (calculé dans la page), et Staff > Comptes (désactivation).
        resultat["annonces"] = {"soldes": {n: s for n, s in c.soldes().items() if n in c.actifs}}
    return resultat


@route_get("/api/forum")
def detail_forum(nom, parametre):
    """Communauté > Forum : un fil entier, commentaires compris."""
    return forum.detail(parametre("sujet"), nom)


# --- Staff > Annonces : les filtres de Groutte -------------------------------------------------------

@publics_annonce
def publics(config):
    """{id: [noms]} des filtres de Groutte (None : grisé, avant l'ouverture des paiements). Les comptes désactivés ne sont
    dans aucun filtre. « Présents », « Rôle » et « Doit plus de » sont calculés dans la page."""
    c = compta.Compta(config)
    actifs = sorted(c.actifs)
    venants = sorted(c.venants())
    tardifs = {n for n in actifs if gite_salle.est_tardif(c.config, n, c.comptes, c.gs)}
    soldes = c.soldes()
    hebergeurs = set(gite_salle.hebergeurs(c.gs).values())
    resultat = {
        "viennent": venants,
        "tardifs": sorted(tardifs),
        "sans_moyen": [n for n in actifs if not moyens_renseignes(c.profils.get(n, {}).get("paiement", {}))
                       and (soldes.get(n, 0) > 0 or n in hebergeurs)],
        "presence": [n for n in actifs if n not in c.venants() and n not in tardifs
                     and "ne_vient_pas" not in c.presences.get(n, {})],
        "literie": lits.sans_literie(c),
        "fiche": [n for n in actifs if not c.profils.get(n, {}).get("prenom") or not c.profils.get(n, {}).get("telephone")],
    }
    for quoi in ("gite", "salle"):
        if not c.ouvert(quoi):
            resultat[quoi] = None
            continue
        heb = c.hebergeur(quoi)
        declares = {}
        for p in c.cr["paiements"]:
            if p["quoi"] == quoi and p["etat"] == "declare":
                declares[p["nom"]] = declares.get(p["nom"], 0) + p["montant"]
        resultat[quoi] = sorted(n for n in c.parts(quoi) if n in c.actifs and n != heb and not c.exempte(n, quoi)
                                and c.reste(n, quoi) - declares.get(n, 0) > 0)
    # Lit : au moins une nuit sans réservation, alors qu'il restait un lit libre au gîte cette nuit-là.
    places = sum(l["places"] for l in c.gs["lits"])
    prises = {}
    reserve = set()
    for r in c.lits["reservations"]:
        reserve.add((r["nuit"], r["nom"]))
        if r["lit"] != lits.SALLE:
            prises[r["nuit"]] = prises.get(r["nuit"], 0) + 1
    resultat["lit"] = [n for n in venants if any((nuit, n) not in reserve and prises.get(nuit, 0) < places
                                                 for nuit in c.nuits_liste(n))]
    # Alcool : n'a pas coché une catégorie qui propose d'être SAM, pour le lui proposer.
    sam = [cat["id"] for cat in c.cats["categories"] if cat.get("sam") and not cat["supprimee"]]
    resultat["alcool"] = [n for n in venants if sam and not any(i in c.profils.get(n, {}).get("categories", []) for i in sam)]
    return resultat


# --- Staff > Comptes : hébergeurs et soldes -----------------------------------------------------------

@protection_compte
def proteger(d, qui, action):
    """Un hébergeur reste staff et actif pendant tout l'événement. Désactiver un compte dont le solde n'est pas nul :
    il faut retaper ce solde (`confirmation`, en centimes) ; toutes ses dettes sont alors effacées, dans les deux sens
    (réactiver ne les fait pas revenir), et les personnes touchées sont prévenues. Renvoie le détail pour le journal."""
    if gite_salle.est_hebergeur(qui):
        raise Refus("c'est un hébergeur : désigne d'abord un autre hébergeur (Gîte et salle)")
    if action != "desactive":
        return ""
    solde = compta.Compta(d.config).soldes().get(qui, 0)
    if solde and d.corps.get("confirmation") != abs(solde):
        raise Refus(f"le solde de {qui} n'est pas nul : retape {euros(abs(solde))} pour confirmer")
    touches = suivi.effacer_compte(d.config, d.nom, qui)
    for autre, montant, sens in touches:
        notifier(d.config, None, "Compte désactivé",
                 f"Le compte de {qui} est désactivé : ses {euros(montant)} envers toi sont effacés." if sens == "doit"
                 else f"Le compte de {qui} est désactivé : ta dette de {euros(montant)} envers lui est effacée.",
                 "#comptes", destinataires={autre}, sauf=d.nom)
    return ", ".join(f"{euros(m)} {'envers' if sens == 'doit' else 'de'} {autre}" for autre, m, sens in touches)


# --- Vérifications ------------------------------------------------------------------------------------

apres_action(lits.verifier_manques)            # une nuit en manque de matelas ou de duvets : le staff le sait
au_chargement(taches.verifier)                 # rappels datés (créances, remboursements)
apres_inscription(gite_salle.prevenir_inscription)   # une inscription tardive est à accepter par l'hébergeur
