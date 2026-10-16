"""Gîte > Présence : quand j'arrive et quand je pars. Mes dates donnent mes nuits et mes repas, qui servent partout :
le prix du gîte (compta.py), les lits (lits.py), mes repas (repas.py).

data/presences.json : {nom: {"arrivee": {"date", "creneau"}, "depart": {"date", "creneau"}, "modifie": horodatage}}.
Un compte absent de ce fichier ne vient pas. Personne ne saisit les dates d'un autre, pas même le staff.
"""
import comptes_donnees as cd
import compta
import gite_salle
import lits
import repas
import sejour
from euros import euros
from notifications import notifier
from requetes import Refus
from routes import route
from stockage import PRESENCES, ecrire_json, lire_json, maintenant


def lire():
    return lire_json(PRESENCES, {})


def valider(config, corps):
    """L'arrivée et le départ reçus de la page, vérifiés (voir les cas limites de la fiche Présence)."""
    arrivee, depart = sejour.point_valide(config, corps.get("arrivee")), sejour.point_valide(config, corps.get("depart"))
    if not arrivee or not depart:
        raise Refus("indique ton arrivée et ton départ")
    jours = sejour.jours(config)
    for point in (arrivee, depart):
        if point["date"] not in jours:
            raise Refus(f"le séjour va du {sejour.date_courte(jours[0])} au {sejour.date_courte(jours[-1])}")
        if point["date"] == jours[-1] and point["creneau"] == "nuit":
            raise Refus("il n'y a pas de nuitée le dernier soir : on repart")
    if sejour.rang(depart) < sejour.rang(arrivee):
        raise Refus("le départ est avant l'arrivée")
    return {"arrivee": arrivee, "depart": depart}


def enregistrer(d, nouvelle):
    """Nouvelles dates (ou None : je ne viens pas), puis tout ce qui en dépend : lits, repas, notifications."""
    avant = compta.Compta(d.config)
    if avant.cloture():
        raise Refus("les comptes sont clôturés : les présences ne changent plus")
    if gite_salle.est_tardif(d.config, d.nom, avant.comptes, avant.gs):
        raise Refus("ton inscription est arrivée après la date limite : l'hébergeur doit d'abord l'accepter")
    presences = lire()
    if nouvelle:
        presences[d.nom] = dict(nouvelle, modifie=maintenant())
    elif d.nom in presences:
        del presences[d.nom]
    else:
        return
    ecrire_json(PRESENCES, presences)
    apres = compta.Compta(d.config)
    lits.apres_presence(d.config, d.nom, apres.nuits_liste(d.nom))
    repas.apres_presence(d.nom, apres.repas_possibles(d.nom))
    prevenir(d, avant, apres)


def prevenir(d, avant, apres):
    nom = d.nom
    n1, n2 = avant.nuits(nom), apres.nuits(nom)
    # Après l'ouverture des paiements : les hébergeurs suivent les changements de dates.
    ouverts = [q for q in gite_salle.QUOI if apres.ouvert(q)]
    if ouverts and (n1 != n2 or (nom in avant.venants()) != (nom in apres.venants())):
        texte = (f"{nom} ne vient plus." if nom not in apres.venants()
                 else f"{nom} a changé ses dates : {n2} nuit{'s' if n2 > 1 else ''} au lieu de {n1}.")
        notifier(d.config, "gite", "Présence", texte, "#presence",
                 destinataires={apres.hebergeur(q) for q in ouverts}, sauf=nom)
    # Un retardataire : ceux qui ont payé le gîte apprennent ce qu'il leur doit.
    du_avant, du_apres = avant.retard_du_par(nom), apres.retard_du_par(nom)
    for creancier, montant in du_apres.items():
        if montant > du_avant.get(creancier, 0):
            notifier(d.config, "gite", "Nuits en plus", f"{nom} te doit {euros(montant)} pour ses nuits en plus.",
                     "#comptes", destinataires={creancier}, sauf=nom)
    # Le staff : une nuit vient de passer au-dessus de la capacité du gîte.
    capacite = gite_salle.capacite(apres.gs)
    if capacite:
        c1, c2 = avant.presents_par_nuit(), apres.presents_par_nuit()
        depassees = [n for n in sejour.nuits(d.config) if c1.get(n, 0) <= capacite < c2.get(n, 0)]
        if depassees:
            nuit = depassees[0]
            notifier(d.config, "gite", "Capacité du gîte",
                     f"Nuit du {sejour.date_courte(nuit)} : {c2[nuit]} personnes pour {capacite} couchages.", "#presence",
                     destinataires=set(cd.staffs_actifs(apres.comptes)), sauf=nom)


@route("/api/presence")
def saisir_dates(d):
    enregistrer(d, valider(d.config, d.corps))


@route("/api/presence/absent")
def je_ne_viens_pas(d):
    enregistrer(d, None)


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_cle(PRESENCES, ancien, nouveau)
