"""Staff > Annonces : une notification à des ploucs choisis à la main ou par des filtres (pas payé le gîte, là ce soir,
literie non renseignée...). Et dans l'autre sens, Contacter le staff : le message court d'un plouc à tout le staff.

data/annonces.json : {
    "annonces": [{"id", "par", "quand", "titre", "texte", "lien", "filtres": [ids], "combinaison": "ou" | "et",
                  "destinataires": [noms]}],
    "messages_staff": [{"de", "quand", "texte"}]}

- Les filtres sont calculés ici (filtres()), au moment où l'état part ; la page les combine (au moins un / tous), y ajoute
  ceux qu'elle calcule elle-même (présents à un créneau, un rôle, doit plus de X €), puis les ajouts et retraits à la
  main. Les destinataires partent tels que le staff les voit au moment de l'envoi.
- Une annonce est toujours reçue (catégorie None), et gardée dans les Pings reçus de chacun (genre « annonce »), même
  sans notifications. Le staff qui envoie la reçoit aussi s'il est dans la liste. Une annonce par heure et par staff.
- Un message au staff : 40 caractères, un par heure et par personne, même pour un membre muet. Toujours reçu par les
  staffs (sauf l'expéditeur) ; le toucher ouvre sa fiche du carnet, pour l'appeler.
"""
import re
from datetime import datetime, timedelta
from urllib.parse import quote

import comptes_donnees as cd
import gite_salle
import lits
from comptes import moyens_renseignes
from notifications import ABONNEMENTS, notifier
from requetes import Refus
from routes import route
from stockage import ANNONCES, ecrire_json, lire_json, maintenant, nouvel_id

TEXTE_MAX = 120
TITRE_MAX = 50
MESSAGE_STAFF_MAX = 40
INTERVALLE = timedelta(hours=1)
FILTRES = ("tous", "viennent", "staff", "tardifs", "gite", "salle", "sans_moyen",
           "presence", "lit", "literie", "fiche", "alcool", "presents", "role", "doit")


def lire():
    donnees = lire_json(ANNONCES, {})
    donnees.setdefault("annonces", [])
    donnees.setdefault("messages_staff", [])
    return donnees


def attente(horodatages):
    """Le moment où l'on pourra de nouveau envoyer (une fois par heure), ou "" si c'est possible maintenant."""
    if not horodatages:
        return ""
    prochain = datetime.fromisoformat(max(horodatages)) + INTERVALLE
    return prochain.isoformat(timespec="seconds") if prochain > datetime.now() else ""


def dans(prochain):
    minutes = max(1, round((datetime.fromisoformat(prochain) - datetime.now()).total_seconds() / 60))
    return f"dans {minutes} min"


def filtres(c):
    """{id: [noms]} des filtres calculés ici (None : grisé, par exemple avant l'ouverture des paiements). Les comptes
    désactivés ne sont dans aucun filtre."""
    actifs = sorted(c.actifs)
    venants = sorted(c.venants())
    tardifs = {n for n in actifs if gite_salle.est_tardif(c.config, n, c.comptes, c.gs)}
    soldes = c.soldes()
    hebergeurs = set(gite_salle.hebergeurs(c.gs).values())
    resultat = {
        "tous": actifs,
        "viennent": venants,
        "staff": sorted(cd.staffs_actifs(c.comptes)),
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


def lien_valide(lien):
    if not isinstance(lien, str) or not re.fullmatch(r"#[a-z-]*(/[\w%.-]*)?", lien):
        raise Refus("page invalide")
    return lien


@route("/api/annonces/envoyer")
def envoyer(d):
    d.exiger_staff()
    donnees = lire()
    prochain = attente([a["quand"] for a in donnees["annonces"] if a["par"] == d.nom])
    if prochain:
        raise Refus(f"une annonce par heure : tu pourras en envoyer une autre {dans(prochain)}")
    titre = d.corps.get("titre", "")
    texte = d.corps.get("texte", "")
    if not isinstance(titre, str) or not titre.strip() or not isinstance(texte, str) or not texte.strip():
        raise Refus("écris un titre et un texte")
    titre, texte = " ".join(titre.split()), texte.strip()
    if len(titre) > TITRE_MAX:
        raise Refus(f"titre trop long ({TITRE_MAX} caractères au plus)")
    if len(texte) > TEXTE_MAX:
        raise Refus(f"texte trop long ({TEXTE_MAX} caractères au plus)")
    lien = lien_valide(d.corps.get("lien") or "#pings")
    brut = d.corps.get("destinataires")
    actifs = cd.noms_actifs(d.config)
    if not isinstance(brut, list) or not brut:
        raise Refus("il n'y a aucun destinataire")
    if any(n not in actifs for n in brut):
        raise Refus("un destinataire n'est pas un compte actif")
    destinataires = sorted(set(brut))
    choisis = d.corps.get("filtres", [])
    combinaison = "et" if d.corps.get("combinaison") == "et" else "ou"
    annonce = {"id": nouvel_id(), "par": d.nom, "quand": maintenant(), "titre": titre, "texte": texte, "lien": lien,
               "filtres": [f for f in choisis if f in FILTRES] if isinstance(choisis, list) else [],
               "combinaison": combinaison, "destinataires": destinataires}
    donnees["annonces"].append(annonce)
    ecrire_json(ANNONCES, donnees)
    import staff   # import ici : staff importe gite_salle
    staff.noter(d, "annonce", detail=f"{titre} ({len(destinataires)} destinataire{'s' if len(destinataires) > 1 else ''})")
    notifier(d.config, None, titre, texte, lien, destinataires=set(destinataires), genre="annonce", de=d.nom)


@route("/api/contact/staff")
def prevenir_staff(d):
    """Contacter le staff : un message court, à tous les staffs. Un membre muet peut l'utiliser."""
    texte = d.corps.get("texte", "")
    if not isinstance(texte, str) or not texte.strip():
        raise Refus("écris ton message")
    texte = " ".join(texte.split())
    if len(texte) > MESSAGE_STAFF_MAX:
        raise Refus(f"{MESSAGE_STAFF_MAX} caractères au plus : c'est une notification, pas un roman")
    donnees = lire()
    prochain = attente([m["quand"] for m in donnees["messages_staff"] if m["de"] == d.nom])
    if prochain:
        raise Refus(f"un message au staff par heure : tu pourras en envoyer un autre {dans(prochain)}")
    staffs = set(cd.staffs_actifs(cd.lire_comptes(d.config))) - {d.nom}
    if not staffs:
        raise Refus("il n'y a pas d'autre staff à prévenir")
    seuil = (datetime.now() - INTERVALLE).isoformat(timespec="seconds")
    donnees["messages_staff"] = [m for m in donnees["messages_staff"] if m["quand"] > seuil] + [
        {"de": d.nom, "quand": maintenant(), "texte": texte}]
    ecrire_json(ANNONCES, donnees)
    notifier(d.config, None, f"{d.nom} au staff", texte, "#carnet/" + quote(d.nom), destinataires=staffs, sauf=d.nom, de=d.nom)


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(ANNONCES, ancien, nouveau, {"par", "destinataires", "de"})


def vue(c, nom, est_staff):
    """Pour tous : quand je pourrai de nouveau prévenir le staff. Pour le staff : les filtres, les soldes (filtre « doit
    plus de X € »), ceux qui n'ont pas les notifications, les annonces envoyées, et quand je pourrai en envoyer une."""
    donnees = lire()
    resultat = {"message_staff_prochain": attente([m["quand"] for m in donnees["messages_staff"] if m["de"] == nom])}
    if est_staff:
        abonnes = set(lire_json(ABONNEMENTS, {}))
        resultat.update({
            "filtres": filtres(c),
            "soldes": {n: s for n, s in c.soldes().items() if n in c.actifs},
            "sans_notifs": sorted(n for n in c.actifs if n not in abonnes),
            "envoyees": list(reversed(donnees["annonces"]))[:50],
            "prochaine": attente([a["quand"] for a in donnees["annonces"] if a["par"] == nom]),
        })
    return resultat
