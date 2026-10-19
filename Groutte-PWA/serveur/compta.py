"""Le calcul de l'argent : parts du gîte et de la salle, retardataires, parts des dépenses, soldes et dettes.

Rien n'est enregistré ici : tout est recalculé à chaque affichage à partir des fichiers de données, lus une seule fois
par `Compta(config)`. Tout se compte en centimes (des entiers).

Les règles viennent des fiches Créances, Dépenses et Mes comptes :
- Gîte et salle, chacun selon son réglage : au prorata des nuits (prix d'une nuitée = montant / total des nuitées des
  non-exemptés ; ma part = prix × mes nuits), ou à parts égales entre les ploucs non exemptés qui viennent.
  Par défaut, le gîte au prorata des nuits, la salle à parts égales.
  Les centimes en trop vont à l'hébergeur (comme le reste au payeur d'une dépense).
- Avant l'ouverture des paiements, les parts suivent les présences en direct. À l'ouverture, les nuits de chacun sont
  figées (« instantane », gite_salle.py) : un changement de montant, d'exemption ou de répartition recalcule les parts,
  un changement de dates non. Des nuits en plus font un retardataire, qui doit sa part à ceux qui ont une part.
- Les dettes entre ploucs (le « grand livre ») : parts des dépenses validées, reports, avoirs (trop-payés), manques
  (après la clôture), dettes des retardataires et dettes manuelles du staff (Suivi des dépenses). Un remboursement confirmé (ou une grâce) de A à B compte comme une
  dette de B envers A : il annule d'autant ce que A devait. Une dette effacée par le staff est une grâce qui vise une
  ligne précise du grand livre (« ligne ») : elle est imputée sur cette ligne avant les autres.
- Mode direct : chaque paire de personnes a ses dettes, qui ne se compensent pas, sauf celles des retardataires
  (le « tampon » : elles se compensent d'abord avec ce que l'autre lui doit). Mode minimum de virements : le plan de
  virements est tiré des soldes nets, le plus gros débiteur payant le plus gros créancier, jusqu'à ce que tout soit quitte.
"""
from collections import defaultdict

import comptes_donnees as cd
import creances
import depenses
import gite_salle
import lits
import mes_comptes
import presence
import reglages_compta
import repas
import sejour
from requetes import Refus
from donnees import DETTES_MANUELLES
from stockage import PROFILS, aujourdhui, lire_json

QUOI = ("gite", "salle")
LIEU = {"gite": "du gîte", "salle": "de la salle"}


def repartir(total, poids, prioritaire=None):
    """Répartit `total` centimes selon `poids` ({nom: poids}). Les centimes en trop vont à `prioritaire` (le payeur,
    l'hébergeur), ou, s'il n'est pas concerné, aux plus gros restes. Exemple : 1000 à 3 donne 333 + 333 + 334."""
    poids = {n: p for n, p in poids.items() if p > 0}
    if not poids or total <= 0:
        return {}
    somme = sum(poids.values())
    parts = {n: total * p // somme for n, p in poids.items()}
    reste = total - sum(parts.values())
    if reste:
        if prioritaire in parts:
            parts[prioritaire] += reste
        else:
            for n in sorted(poids, key=lambda n: (-(total * poids[n] % somme), n))[:reste]:
                parts[n] += 1
    return parts


def memo(methode):
    """Garde le résultat d'une méthode pour ce calcul (les données ne changent pas pendant la vie d'un Compta)."""
    def enveloppe(self, *args):
        cle = (methode.__name__,) + args
        if cle not in self._memo:
            self._memo[cle] = methode(self, *args)
        return self._memo[cle]
    return enveloppe


class Compta:
    def __init__(self, config):
        self.config = config
        self.comptes = cd.lire_comptes(config)
        self.actifs = {n for n, c in self.comptes.items() if not c["desactive"]}
        self.profils = lire_json(PROFILS, {})
        self.gs = gite_salle.lire()
        self.presences = presence.lire()
        self.repas = repas.lire()
        self.lits = lits.lire()
        self.cr = creances.lire()
        self.deps = depenses.lire()
        self.cats = reglages_compta.lire_categories()
        self.reglages = reglages_compta.lire_reglages()
        self.remb = mes_comptes.lire()
        self.manuelles = lire_json(DETTES_MANUELLES, {}).get("dettes", [])
        self._memo = {}

    def mode(self):
        return self.reglages["mode"]

    def cloture(self):
        return self.reglages["cloture"]

    # --- Présences ---------------------------------------------------------------------------------

    @memo
    def venants(self):
        """Les ploucs qui viennent : un compte actif avec au moins un créneau dans le séjour. {nom: présence}."""
        return {n: p for n, p in self.presences.items() if n in self.actifs and sejour.creneaux_de(self.config, p)}

    @memo
    def nuits_liste(self, nom):
        return sejour.nuits_de(self.config, self.venants().get(nom))

    def nuits(self, nom):
        return len(self.nuits_liste(nom))

    @memo
    def repas_possibles(self, nom):
        return sejour.repas_de(self.config, self.venants().get(nom))

    @memo
    def regle_repas(self, jour, creneau):
        """{"gere", "defaut"} de ce repas : le réglage du staff en vigueur quand il commence."""
        return reglages_compta.regle_repas(self.config, self.reglages, jour, creneau)

    @memo
    def choix_repas(self):
        return repas.choix_de(self.repas)

    @memo
    def repas_pris(self, nom):
        """Les repas gérés de ma présence que je prends : mon choix, sinon le défaut du créneau."""
        choix = self.choix_repas()
        pris = []
        for jour, creneau in self.repas_possibles(nom):
            regle = self.regle_repas(jour, creneau)
            if regle["gere"] and choix.get((nom, jour, creneau), regle["defaut"]):
                pris.append((jour, creneau))
        return pris

    @memo
    def presents_par_nuit(self):
        compte = defaultdict(int)
        for nom in self.venants():
            for nuit in self.nuits_liste(nom):
                compte[nuit] += 1
        return dict(compte)

    # --- Gîte et salle -------------------------------------------------------------------------------

    def hebergeur(self, quoi):
        return self.gs[quoi]["hebergeur"]

    def ouvert(self, quoi):
        return bool(self.gs[quoi]["ouverture"])

    def exempte(self, nom, quoi):
        return bool(self.gs["exemptions"].get(nom, {}).get(quoi))

    def limite_passee(self):
        limite = self.gs["limite_paiement"]
        return bool(limite) and aujourdhui() >= limite

    def par_nuits(self, quoi):
        return self.gs[quoi]["repartition"] == "nuits"

    @memo
    def base(self, quoi):
        """{nom: nuits} de ceux qui ont (ou auraient) une part : figé à l'ouverture des paiements, en direct avant."""
        if self.ouvert(quoi):
            return dict(self.gs[quoi]["instantane"])
        return {nom: self.nuits(nom) for nom in self.venants()}

    @memo
    def parts(self, quoi):
        """{nom: centimes} : la part de chacun, exemptés retirés."""
        base = {n: v for n, v in self.base(quoi).items() if not self.exempte(n, quoi)}
        poids = base if self.par_nuits(quoi) else {n: 1 for n in base}
        return repartir(self.gs[quoi]["montant"], poids, self.hebergeur(quoi))

    def paye(self, nom, quoi):
        """Les paiements confirmés, et les restes effacés par le staff (l'hébergeur les absorbe)."""
        return sum(p["montant"] for p in self.cr["paiements"] if p["nom"] == nom and p["quoi"] == quoi and p["etat"] == "confirme")

    def reporte(self, nom, quoi):
        return sum(r["montant"] for r in self.cr["reports"] if r["nom"] == nom and r["quoi"] == quoi)

    def reste(self, nom, quoi):
        """Ce qu'il reste à payer à l'hébergeur (négatif : un trop-payé). L'hébergeur ne se doit rien."""
        if nom == self.hebergeur(quoi):
            return 0
        return self.parts(quoi).get(nom, 0) - self.paye(nom, quoi) - self.reporte(nom, quoi)

    @memo
    def retards(self, quoi):
        """Les dettes des retardataires, après l'ouverture des paiements : [{"de", "a", "montant", "plus"}].
        Au prorata des nuits : montant / (nuitées figées + ses nuits en plus) × ses nuits en plus, réparti entre ceux
        qui ont une part au prorata de leurs nuits. À parts égales : une part de plus, si l'on n'en avait pas,
        répartie à parts égales entre ceux qui l'ont payée."""
        if not self.ouvert(quoi):
            return []
        montant = self.gs[quoi]["montant"]
        figees = {n: v for n, v in self.gs[quoi]["instantane"].items() if not self.exempte(n, quoi)}
        resultat = []
        for nom in self.venants():
            if self.exempte(nom, quoi):
                continue
            if self.par_nuits(quoi):
                plus = self.nuits(nom) - figees.get(nom, 0)
                total = sum(v for v in figees.values() if v > 0)
                if plus <= 0 or not total:
                    continue
                du = round(montant * plus / (total + plus))
                repartition = repartir(du, {n: v for n, v in figees.items() if v > 0})
            else:
                if nom in figees or not figees:
                    continue
                plus = 1
                repartition = repartir(round(montant / (len(figees) + 1)), {n: 1 for n in figees})
            for creancier, m in repartition.items():
                if creancier != nom and m > 0:
                    resultat.append({"de": nom, "a": creancier, "montant": m, "plus": plus, "quoi": quoi})
        return resultat

    def retard_du_par(self, nom):
        """{créancier: centimes} : ce que `nom` doit, comme retardataire, à chacun (gîte et salle)."""
        du = defaultdict(int)
        for quoi in QUOI:
            for r in self.retards(quoi):
                if r["de"] == nom:
                    du[r["a"]] += r["montant"]
        return dict(du)

    # --- Dépenses ------------------------------------------------------------------------------------

    def participants(self, cat):
        """{nom: poids} d'une catégorie : les ploucs qui viennent (et qui l'ont cochée, si elle est facultative),
        pondérés selon sa règle. Ceux qui sont exemptés des dépenses de la communauté n'y sont jamais."""
        noms = [n for n in self.venants() if not self.exempte(n, "communaute")
                and (cat["type"] != "facultative" or cat["id"] in self.profils.get(n, {}).get("categories", []))]
        if cat["regle"] == "repas":
            return {n: len(self.repas_pris(n)) for n in noms}
        if cat["regle"] == "nuits":
            return {n: self.nuits(n) for n in noms}
        return {n: 1 for n in noms}

    def parts_depense(self, dep):
        """{nom: centimes} : les parts de chacun, telles qu'elles seraient figées maintenant. Lève Refus s'il n'y a
        personne à qui faire payer une ligne."""
        payeur, total = dep["auteur"], dep["montant"]
        if dep["mode"] == "egales":
            parts = repartir(total, {n: 1 for n in dep["concernes"]}, payeur)
        elif dep["mode"] == "exacts":
            parts = defaultdict(int)
            for l in dep["lignes"]:
                parts[l["nom"]] += l["montant"]
        else:
            parts = defaultdict(int)
            for l in dep["lignes"]:
                cat = reglages_compta.categorie(l["categorie"], self.cats)
                if cat is reglages_compta.NON_GERE:
                    parts[payeur] += l["montant"]
                    continue
                if not cat:
                    raise Refus(f"la catégorie {l.get('nom_categorie', '?')} n'existe plus")
                ligne = repartir(l["montant"], self.participants(cat), payeur)
                if not ligne and l["montant"]:
                    raise Refus(f"personne n'est concerné par la catégorie {cat['nom']} : choisis Non géré ou une autre catégorie")
                for n, m in ligne.items():
                    parts[n] += m
        parts = {n: m for n, m in parts.items() if m > 0}
        if not parts:
            raise Refus("personne n'est concerné par cette dépense")
        return parts

    # --- Le grand livre ------------------------------------------------------------------------------

    @memo
    def obligations(self):
        """Toutes les dettes entre ploucs, hors remboursements : [{"de", "a", "montant", "type", "date", "libelle",
        "ref", "cle", "compensable", "par"}]. Les plus anciennes d'abord. `cle` (« type:ref ») désigne l'élément
        d'origine ; avec de et a, elle désigne une ligne de Suivi des dépenses. `par` : le staff d'une dette manuelle."""
        lignes = []

        def ajouter(de, a, montant, genre, date, libelle, ref="", compensable=False, par=""):
            if de and a and de != a and montant > 0:
                lignes.append({"de": de, "a": a, "montant": montant, "type": genre, "date": date, "libelle": libelle,
                               "ref": ref, "cle": f"{genre}:{ref}", "compensable": compensable, "par": par})

        for dep in self.deps["depenses"]:
            if dep["etat"] == "validee":
                for nom, m in dep["parts"].items():
                    ajouter(nom, dep["auteur"], m, "depense", dep["valide_le"], dep["motif"], dep["id"])
        for r in self.cr["reports"]:
            ajouter(r["nom"], r["a"], r["montant"], "report", r["quand"], f"Report {LIEU[r['quoi']]}", r["id"])
        for quoi in QUOI:
            if not self.ouvert(quoi):
                continue
            heb, ouverture = self.hebergeur(quoi), self.gs[quoi]["ouverture"]
            for nom in set(self.parts(quoi)) | {p["nom"] for p in self.cr["paiements"] if p["quoi"] == quoi}:
                reste = self.reste(nom, quoi)
                if reste < 0:
                    ajouter(heb, nom, -reste, "avoir", ouverture, f"Trop-payé {LIEU[quoi]}", quoi)
                elif reste > 0 and self.cloture():
                    ajouter(nom, heb, reste, "manque", self.cloture(), f"Reste {LIEU[quoi]} à la clôture", quoi)
            for r in self.retards(quoi):
                ajouter(r["de"], r["a"], r["montant"], "retard", ouverture,
                        f"Nuits en plus {LIEU[quoi]}" if self.par_nuits(quoi) else f"Part {LIEU[quoi]} en retard",
                        quoi, compensable=True)
        for m in self.manuelles:
            ajouter(m["de"], m["a"], m["montant"], "manuelle", m["quand"], "Staff · " + m["message"], m["id"], par=m["par"])
        return sorted(lignes, key=lambda l: l["date"])

    @memo
    def transferts(self):
        """Les remboursements confirmés (et les grâces) : ils comptent dans les soldes."""
        return [r for r in self.remb["remboursements"] if r["etat"] in ("confirme", "office")]

    @memo
    def soldes(self):
        """{nom: centimes} : ce qu'on lui doit moins ce qu'il doit (positif : on lui doit)."""
        soldes = defaultdict(int)
        for o in self.obligations():
            soldes[o["a"]] += o["montant"]
            soldes[o["de"]] -= o["montant"]
        for t in self.transferts():
            soldes[t["de"]] += t["montant"]
            soldes[t["a"]] -= t["montant"]
        return dict(soldes)

    @memo
    def dettes_directes(self):
        """Mode direct : {(de, a): {"montant", "elements"}} pour chaque paire qui a des dettes. Les éléments (les
        dépenses, reports...) portent ce qui en est remboursé, de la plus ancienne à la plus récente."""
        elements = defaultdict(list)
        for o in self.obligations():
            elements[(o["de"], o["a"])].append(dict(o))
        rembourse = defaultdict(int)
        cible = defaultdict(int)   # (de, a, cle) -> ce que le staff a effacé sur cette ligne précise
        for t in self.transferts():
            rembourse[(t["de"], t["a"])] += t["montant"]
            if t.get("ligne"):
                cible[(t["de"], t["a"], t["ligne"])] += t["montant"]
        paires = {tuple(sorted(k)) for k in list(elements) + list(rembourse)}
        resultat = {}
        for a, b in sorted(paires):
            total = {}
            regle = {}
            for de, vers in ((a, b), (b, a)):
                total[(de, vers)] = sum(e["montant"] for e in elements[(de, vers)])
                regle[(de, vers)] = rembourse[(de, vers)]
            # Le tampon : la dette d'un retardataire se compense d'abord avec ce que l'autre lui doit.
            for de, vers in ((a, b), (b, a)):
                retard = sum(e["montant"] for e in elements[(de, vers)] if e["compensable"])
                compense = min(retard, max(0, total[(vers, de)] - regle[(vers, de)]))
                regle[(de, vers)] += compense
                regle[(vers, de)] += compense
            x = total[(a, b)] - regle[(a, b)]
            y = total[(b, a)] - regle[(b, a)]
            if x < 0:
                y, x = y - x, 0
            if y < 0:
                x, y = x - y, 0
            for de, vers, montant in ((a, b, x), (b, a, y)):
                liste = elements[(de, vers)]
                if not liste and not montant:
                    continue
                reste_a_repartir = regle[(de, vers)]
                for e in liste:   # d'abord les dettes effacées par le staff, sur leur ligne
                    e["rembourse"] = min(e["montant"], cible[(de, vers, e["cle"])], reste_a_repartir)
                    reste_a_repartir -= e["rembourse"]
                for e in liste:   # puis le reste, des plus anciennes aux plus récentes
                    plus = min(e["montant"] - e["rembourse"], reste_a_repartir)
                    e["rembourse"] += plus
                    reste_a_repartir -= plus
                    e["etat"] = ("remboursee" if e["rembourse"] == e["montant"] else "partielle" if e["rembourse"]
                                 else "a-rembourser")
                resultat[(de, vers)] = {"montant": montant, "elements": liste}
        return resultat

    @memo
    def dettes_minimum(self):
        """Mode minimum de virements : {(de, a): centimes}, au plus (nombre de personnes - 1) virements."""
        soldes = {n: s for n, s in self.soldes().items() if s}
        virements = {}
        while True:
            debiteurs = sorted((s, n) for n, s in soldes.items() if s < 0)
            creanciers = sorted(((-s, n) for n, s in soldes.items() if s > 0))
            if not debiteurs or not creanciers:
                return virements
            dette, de = debiteurs[0]
            credit, a = creanciers[0]
            montant = min(-dette, -credit)
            virements[(de, a)] = montant
            soldes[de] += montant
            soldes[a] -= montant

    @memo
    def dettes(self):
        """Les dettes du mode actif : {(de, a): centimes}, positives."""
        if self.mode() == "minimum":
            return self.dettes_minimum()
        return {k: v["montant"] for k, v in self.dettes_directes().items() if v["montant"] > 0}

    def etat_remboursement(self, ident):
        """Mode direct : « remboursee », « partielle » ou « a-rembourser » pour une dépense validée."""
        if self.mode() != "direct":
            return None
        du = paye = 0
        for dette in self.dettes_directes().values():
            for e in dette["elements"]:
                if e["ref"] == ident:
                    du += e["montant"]
                    paye += e["rembourse"]
        if not du:
            return None
        return "remboursee" if paye >= du else "partielle" if paye else "a-rembourser"

    def historique(self, nom):
        """Tout ce qui a fait bouger le solde de `nom`, le plus récent d'abord : montant positif, ça me rapporte.
        Une même dépense (ou les nuits en plus d'un retardataire) ne fait qu'une ligne, avec tous les noms concernés."""
        groupes = {}
        for o in self.obligations():
            if nom not in (o["de"], o["a"]):
                continue
            signe = 1 if o["a"] == nom else -1
            cle = (o["type"], o["ref"] or o["libelle"], signe)
            ligne = groupes.setdefault(cle, {"date": o["date"], "type": o["type"], "libelle": o["libelle"], "ref": o["ref"],
                                             "avec": [], "montant": 0, "par": o["par"]})
            ligne["avec"].append(o["de"] if signe > 0 else o["a"])
            ligne["montant"] += signe * o["montant"]
        lignes = list(groupes.values())
        for t in self.transferts():
            if nom in (t["de"], t["a"]):
                lignes.append({"date": t["le"] or t["quand"], "type": t["type"], "libelle": t.get("message", ""), "ref": t["id"],
                               "avec": [t["a"] if t["de"] == nom else t["de"]], "office": t["etat"] == "office",
                               "par": t.get("par_staff", ""), "montant": t["montant"] if t["de"] == nom else -t["montant"]})
        return sorted(lignes, key=lambda l: l["date"], reverse=True)
