"""Staff > Suivi des dépenses : toutes les dettes du groupe dans un seul tableau, et de quoi réparer les erreurs sans tout
casser (zone dangereuse) : effacer une dette, en créer une à la main.

- Le tableau montre toujours les dettes d'origine (le grand livre de compta.py, comme en mode direct), plus la part normale
  du gîte et de la salle pas encore payée à l'hébergeur (Créances). Une ligne = une dette d'origine entre deux personnes.
- Le reste d'une ligne vient de Compta.dettes_directes (remboursements de la plus ancienne à la plus récente, et les
  dettes effacées d'abord sur leur ligne). En mode minimum de virements, une ligne est aussi réglée dès que son débiteur
  est quitte.
- Effacer une dette : une grâce faite par le staff au nom du créancier (data/remboursements.json, avec « par_staff »,
  « message » et « ligne »). Pour la part du gîte ou de la salle, avant la clôture : un paiement confirmé marqué « grace »
  dans data/creances.json, que l'hébergeur absorbe (après la clôture, le reste est une ligne « manque » qui s'efface
  comme les autres). Créer une dette manuelle : data/dettes-manuelles.json,
  {"dettes": [{"id", "de", "a", "montant", "message", "par", "quand"}]}, qui entre dans le grand livre comme une dépense
  validée, libellée « Staff · <message> ».
- Tout est définitif, confirmé en retapant le montant, inscrit au journal du staff, et les deux personnes sont prévenues
  (notification toujours reçue).
"""
import comptes_donnees as cd
import compta
import creances
import mes_comptes
from euros import centimes, euros
from notifications import notifier
from requetes import Refus, texte
from routes import route
from stockage import CREANCES, DETTES_MANUELLES, REMBOURSEMENTS, ecrire_json, lire_json, maintenant, nouvel_id

ORIGINES = {"depense": "dépense", "report": "report", "avoir": "avoir", "manque": "manque", "retard": "retardataire",
            "manuelle": "dette manuelle", "gite": "gîte", "salle": "salle"}
LIEU = {"gite": "gîte", "salle": "salle"}


def lignes(c):
    """[{"de", "a", "montant", "reste", "origine", "cle", "ref", "date", "libelle", "declare", "action", "effacee"}] :
    toutes les dettes d'origine, les plus récentes d'abord."""
    resultat = []
    soldes = c.soldes()
    minimum = c.mode() == "minimum"
    effacees = {}
    for t in c.transferts():
        if t.get("ligne"):
            effacees[(t["de"], t["a"], t["ligne"])] = {"par": t.get("par_staff", ""), "message": t.get("message", "")}
    for (de, a), dette in c.dettes_directes().items():
        for e in dette["elements"]:
            reste = e["montant"] - e["rembourse"]
            if minimum and soldes.get(de, 0) >= 0:
                reste = 0
            resultat.append({"de": de, "a": a, "montant": e["montant"], "reste": reste, "origine": e["type"], "cle": e["cle"],
                             "ref": e["ref"], "date": e["date"], "libelle": e["libelle"], "declare": 0, "action": reste > 0,
                             "par": e.get("par", ""), "effacee": effacees.get((e["de"], e["a"], e["cle"]))})
    # La part normale du gîte et de la salle, payée dans Gîte et salle. Son reste s'efface ici jusqu'à la clôture.
    for quoi in LIEU:
        if not c.ouvert(quoi):
            continue
        heb = c.hebergeur(quoi)
        for nom, part in c.parts(quoi).items():
            if nom == heb or part <= 0:
                continue
            reste = max(0, c.reste(nom, quoi))
            declare = sum(p["montant"] for p in c.cr["paiements"] if p["nom"] == nom and p["quoi"] == quoi and p["etat"] == "declare")
            grace = next((p for p in reversed(c.cr["paiements"]) if p["nom"] == nom and p["quoi"] == quoi and p.get("grace")), None)
            resultat.append({"de": nom, "a": heb, "montant": part, "reste": reste, "origine": quoi, "cle": f"{quoi}:{nom}",
                             "ref": quoi, "date": c.gs[quoi]["ouverture"], "libelle": f"Part {'du gîte' if quoi == 'gite' else 'de la salle'}",
                             "declare": declare, "action": reste > 0 and not c.cloture(), "par": "",
                             "effacee": grace and {"par": grace["par"], "message": grace.get("message", "")}})
    return sorted(resultat, key=lambda l: l["date"], reverse=True)


def ligne(c, de, a, cle):
    return next((l for l in lignes(c) if (l["de"], l["a"], l["cle"]) == (de, a, cle)), None)


def confirmation(d, montant):
    """Le montant retapé par le staff doit être le bon."""
    if d.corps.get("confirmation") != montant:
        raise Refus(f"retape le montant exact ({euros(montant)}) pour confirmer")


def effacer_grace(config, de, a, montant, par, message, cle=""):
    """Sous le verrou : la grâce faite par le staff au nom du créancier `a`. `cle` vide : toute la dette de la paire."""
    donnees = mes_comptes.lire()
    donnees["remboursements"].append({"id": nouvel_id(), "de": de, "a": a, "montant": montant, "quand": maintenant(),
                                      "type": "grace", "etat": "confirme", "le": maintenant(), "rappel": "",
                                      "par_staff": par, "message": message, "ligne": cle})
    ecrire_json(REMBOURSEMENTS, donnees)


@route("/api/suivi/effacer")
def effacer(d):
    """Effacer le reste d'une ligne : c'est le créancier qui l'absorbe. Message facultatif."""
    d.exiger_staff()
    import staff   # import ici : staff importe gite_salle, qui importe compta
    de, a, cle = d.corps.get("de"), d.corps.get("a"), d.corps.get("cle")
    message = texte(d.corps, "message", 120)
    c = compta.Compta(d.config)
    l = ligne(c, de, a, cle) if isinstance(cle, str) else None
    if not l:
        raise Refus("cette dette n'existe plus")
    if not l["action"]:
        if l["effacee"]:
            raise Refus(f"cette dette vient d'être effacée par {l['effacee']['par']}")
        raise Refus("cette dette est déjà réglée" if l["reste"] <= 0 else "après la clôture, efface plutôt la ligne « manque »")
    confirmation(d, l["reste"])
    if l["origine"] in LIEU:
        donnees = creances.lire()
        donnees["paiements"].append({"id": nouvel_id(), "nom": de, "quoi": l["origine"], "montant": l["reste"], "quand": maintenant(),
                                     "etat": "confirme", "par": d.nom, "le": maintenant(), "grace": True, "message": message})
        ecrire_json(CREANCES, donnees)
    else:
        effacer_grace(d.config, de, a, l["reste"], d.nom, message, cle)
    staff.noter(d, "suivi-effacer", de, f"{l['libelle']} : {euros(l['reste'])} envers {a}{' · ' + message if message else ''}")
    texte_notif = f"{d.nom} (staff) a effacé la part de {de} dans « {l['libelle']} » ({euros(l['reste'])}){' : ' + message if message else ''}."
    notifier(d.config, None, "Dette effacée", texte_notif, "#comptes", destinataires={de, a}, sauf=d.nom)


@route("/api/suivi/dette")
def creer_dette(d):
    """Une dette manuelle : de qui, à qui, combien, et pourquoi (le libellé, obligatoire)."""
    d.exiger_staff()
    import staff
    actifs = cd.noms_actifs(d.config)
    de, a = d.corps.get("de"), d.corps.get("a")
    if de not in actifs or a not in actifs:
        raise Refus("choisis deux comptes actifs")
    if de == a:
        raise Refus("une dette va d'une personne à une autre")
    montant = centimes(d.corps.get("montant"))
    message = texte(d.corps, "message", 100, requis=True)
    confirmation(d, montant)
    donnees = lire_json(DETTES_MANUELLES, {})
    donnees.setdefault("dettes", []).append({"id": nouvel_id(), "de": de, "a": a, "montant": montant, "message": message,
                                             "par": d.nom, "quand": maintenant()})
    ecrire_json(DETTES_MANUELLES, donnees)
    staff.noter(d, "suivi-dette", de, f"{euros(montant)} envers {a} · {message}")
    notifier(d.config, None, "Dette créée par le staff", f"Staff · {message} : {de} doit {euros(montant)} à {a}.", "#comptes",
             destinataires={de, a}, sauf=d.nom)


def effacer_compte(config, par, nom):
    """Sous le verrou, à la désactivation d'un compte (staff.py) : toutes ses dettes, dans les deux sens, sont effacées.
    Renvoie [(autre, montant, sens)] : sens « doit » si `nom` devait à `autre`."""
    c = compta.Compta(config)
    touches = []
    for (de, a), dette in c.dettes_directes().items():
        if nom in (de, a) and dette["montant"] > 0:
            effacer_grace(config, de, a, dette["montant"], par, "Compte désactivé")
            touches.append((a if de == nom else de, dette["montant"], "doit" if de == nom else "du"))
    return touches


@cd.renommage
def renommer(ancien, nouveau):
    cd.renommer_fichier(DETTES_MANUELLES, ancien, nouveau, {"de", "a", "par"})


def vue(c):
    return {"lignes": lignes(c), "origines": ORIGINES}
