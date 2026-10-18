import { app, el, icone, sansAccent, saisie, brouillons, envoyer, afficher, notifier, ouvrirModale, ouvrirFeuille, fermerModale,
  telechargerFichier, dateCourte, pluriel, iso } from "./commun.js";
import { euros, enSaisie, lireEuros } from "./paiement.js";
import { telephone } from "./panneau.js";

/* #suivi : Staff > Suivi des dépenses. Toutes les dettes d'origine du groupe (suivi.py), filtrées et triées ici ; la
   zone dangereuse : effacer une dette (le créancier l'absorbe), créer une dette manuelle. Chaque action se confirme en
   retapant le montant. Export CSV des lignes affichées. Sur téléphone, le tableau n'a que De, Montant et À : toucher
   une ligne ouvre le reste (origine, date, Effacer). */

const reglage = { origine: "", nonRegle: true, tri: "date" };
const TRIS = { date: "Date", montant: "Montant", personne: "Personne" };

function filtrees() {
  const { lignes } = app.etat.suivi;
  const texte = sansAccent((brouillons["suivi.personne"] || "").replace(/^@/, "").trim());
  const liste = lignes.filter(l => (!texte || sansAccent(l.de).includes(texte) || sansAccent(l.a).includes(texte))
    && (!reglage.origine || l.origine === reglage.origine) && (!reglage.nonRegle || l.reste > 0));
  const cle = { date: l => l.date, montant: l => String(1e9 + l.reste).padStart(12, "0"), personne: l => sansAccent(l.de + " " + l.a) }[reglage.tri];
  return liste.sort((x, y) => reglage.tri === "personne" ? cle(x).localeCompare(cle(y)) : cle(y).localeCompare(cle(x)));
}

/* Toucher le montant : l'élément d'origine. */
function origine(l) {
  if (l.origine === "depense") { location.hash = "#validation/" + l.ref; return; }
  if (l.origine === "manuelle") {
    ouvrirFeuille("Dette manuelle", [el("p", {}, l.libelle), el("p", { class: "doux petit" }, `${l.de} doit ${euros(l.montant)} à ${l.a} · créée par ${l.par}, le ${dateCourte(l.date.slice(0, 10))}`)]);
    return;
  }
  location.hash = "#gite-salle";
}

/* Toucher la ligne : Effacer la dette (seulement s'il reste quelque chose, et pas la part normale du gîte ou de la salle). */
function effacer(l) {
  if (!l.action) {
    if (l.effacee) notifier(`Dette effacée par ${l.effacee.par}${l.effacee.message ? ` : ${l.effacee.message}` : ""}.`, true);
    else if (l.origine === "gite" || l.origine === "salle") notifier("La part du gîte ou de la salle se règle dans Gîte et salle (exemption, report).", true);
    return;
  }
  const message = el("input", { maxlength: 120, placeholder: "erreur de saisie, payé en espèces..." });
  const retape = el("input", { inputmode: "decimal", placeholder: enSaisie(l.reste), "aria-label": "Montant retapé" });
  ouvrirModale("Effacer la dette", [
    el("section", { class: "carte attention" }, el("h3", {}, "ZONE DANGEREUSE"),
      el("p", { class: "petit" }, `${l.de} ne devra plus ${euros(l.reste)} à ${l.a} pour « ${l.libelle} ». C'est ${l.a} qui absorbe ce montant. C'est définitif, et les deux sont prévenus.`)),
    el("label", { class: "champ" }, "Pourquoi (facultatif)", message),
    el("label", { class: "champ" }, `Retape le montant pour confirmer (${enSaisie(l.reste)})`, retape),
  ], "Effacer la dette", () => envoyer("suivi/effacer", { de: l.de, a: l.a, cle: l.cle, message: message.value, confirmation: lireEuros(retape.value) }));
}

function creerDette() {
  const actifs = app.etat.comptes.filter(c => !c.desactive);
  const choix = libelle => el("select", { required: true, "aria-label": libelle }, el("option", { value: "" }, "choisir..."), actifs.map(c => el("option", { value: c.nom }, c.nom)));
  const de = choix("De"), a = choix("À");
  const montant = el("input", { inputmode: "decimal", placeholder: "0,00", required: true });
  const message = el("input", { maxlength: 100, placeholder: "Essence du 29/12", required: true });
  const retape = el("input", { inputmode: "decimal", placeholder: "le même montant", "aria-label": "Montant retapé" });
  ouvrirModale("Créer une dette manuelle", [
    el("section", { class: "carte attention" }, el("h3", {}, "ATTENTION"),
      el("p", { class: "petit" }, "Ce n'est pas une utilisation normale. Cette dette n'a ni ticket ni validation, et elle peut fausser les comptes de fin de séjour. Passe plutôt par Dépenses quand c'est possible. Pour corriger une erreur, crée une dette dans l'autre sens.")),
    el("label", { class: "champ" }, "De (qui doit)", de),
    el("label", { class: "champ" }, "À (à qui)", a),
    el("label", { class: "champ" }, "Montant (en euros)", montant),
    el("label", { class: "champ" }, "Message (libellé « Staff · ... »)", message),
    el("label", { class: "champ" }, "Retape le montant pour confirmer", retape),
  ], "Créer", () => {
    const m = lireEuros(montant.value);
    if (!m) { notifier("Indique un montant valable."); return false; }
    return envoyer("suivi/dette", { de: de.value, a: a.value, montant: m, message: message.value, confirmation: lireEuros(retape.value) });
  });
}

function exporter(lignes) {
  const champ = v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const nombre = c => (c / 100).toFixed(2).replace(".", ",");
  const entete = ["Date", "De", "A", "Montant", "Reste", "Origine", "Libelle", "Element", "Declare", "Efface par", "Message"];
  const corps = lignes.map(l => [l.date.slice(0, 10), l.de, l.a, nombre(l.montant), nombre(l.reste), app.etat.suivi.origines[l.origine] || l.origine,
    l.libelle, l.cle, nombre(l.declare), l.effacee?.par || l.par || "", l.effacee?.message || ""]);
  const texte = "﻿" + [entete, ...corps].map(r => r.map(champ).join(";")).join("\r\n");
  const nom = `suivi-depenses-${iso(new Date())}.csv`;
  telechargerFichier("suivi.csv", nom, new File([texte], nom, { type: "text/csv" }));
}

/* Sur téléphone : le détail d'une ligne, avec ses actions. */
function detail(l) {
  const info = (libelle, valeur) => valeur && el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, libelle), el("span", { class: "ligne-valeur" }, valeur));
  ouvrirFeuille(`${l.de} → ${l.a}`, [
    el("div", { class: "liste-groupee" },
      info("Montant", euros(l.montant)),
      l.reste !== l.montant && info("Reste", euros(l.reste)),
      l.declare > 0 && info("Déclarés", euros(l.declare)),
      info("Origine", app.etat.suivi.origines[l.origine] || l.origine),
      info("Date", l.date ? dateCourte(l.date.slice(0, 10)) : "")),
    l.libelle && el("p", {}, l.libelle),
    l.effacee && el("p", { class: "doux petit" }, `Effacée par ${l.effacee.par}${l.effacee.message ? ` : ${l.effacee.message}` : ""}.`),
    el("div", { class: "actions" },
      el("button", { class: "btn large", type: "button", onclick: () => { fermerModale(); origine(l); } }, "Voir d'où ça vient"),
      l.action && el("button", { class: "btn danger large", type: "button", onclick: () => { fermerModale(); effacer(l); } }, "Effacer la dette")),
  ]);
}

function tableau(lignes) {
  if (!lignes.length) return el("p", { class: "doux note" }, app.etat.suivi.lignes.length ? "Aucune ligne pour ces filtres." : "Personne ne doit rien à personne.");
  const total = lignes.reduce((t, l) => t + l.montant, 0), reste = lignes.reduce((t, l) => t + l.reste, 0);
  const court = telephone.matches;
  return [
    el("div", { class: "tableau-defile" }, el("table", { class: "tableau-suivi tableau-dettes" + (court ? " court" : "") },
      el("thead", {}, el("tr", {}, (court ? ["De", "Montant", "À"] : ["De", "Montant", "À", "Origine", "Date", ""]).map(t => el("th", {}, t)))),
      el("tbody", {}, lignes.map(l => {
        const montant = l.reste > 0 && l.reste < l.montant ? [el("s", { class: "doux" }, euros(l.montant)), " ", euros(l.reste)] : euros(l.montant);
        return el("tr", { class: l.reste > 0 ? "" : "regle", onclick: court ? () => detail(l) : null },
          el("td", {}, l.de),
          court ? el("td", { class: "montant-court" }, montant)
            : el("td", {}, el("button", { type: "button", class: "lien-montant", onclick: () => origine(l) },
              montant, l.declare > 0 && el("span", { class: "doux petit" }, ` · ${euros(l.declare)} déclarés`))),
          el("td", {}, l.a),
          !court && [
            el("td", {}, el("span", { title: l.libelle }, app.etat.suivi.origines[l.origine] || l.origine)),
            el("td", {}, l.date ? dateCourte(l.date.slice(0, 10)) : ""),
            el("td", {}, l.action ? el("button", { type: "button", class: "discret danger", onclick: () => effacer(l) }, "Effacer")
              : l.effacee && el("button", { type: "button", class: "discret", onclick: () => effacer(l) }, "effacée"))]);
      })))),
    el("p", { class: "note" }, `${pluriel(lignes.length, "ligne")} · ${euros(total)} d'origine · ${euros(reste)} restent`),
  ];
}

export function vueSuivi() {
  const zone = el("div");
  const remplir = () => zone.replaceChildren(...[tableau(filtrees())].flat());
  const personne = saisie("suivi.personne", { type: "search", placeholder: "@ une personne", "aria-label": "Filtrer par personne" });
  personne.addEventListener("input", remplir);   // sans redessiner la page : le clavier reste ouvert
  const origines = el("select", { "aria-label": "Origine" }, el("option", { value: "" }, "Toutes les origines"),
    Object.entries(app.etat.suivi.origines).map(([v, l]) => el("option", { value: v, selected: v === reglage.origine }, l)));
  origines.onchange = () => { reglage.origine = origines.value; afficher(); };
  const tri = el("select", { "aria-label": "Trier par" }, Object.entries(TRIS).map(([v, l]) => el("option", { value: v, selected: v === reglage.tri }, `Tri : ${l.toLowerCase()}`)));
  tri.onchange = () => { reglage.tri = tri.value; afficher(); };
  const nonRegle = el("input", { type: "checkbox", checked: reglage.nonRegle });
  nonRegle.onchange = () => { reglage.nonRegle = nonRegle.checked; afficher(); };
  remplir();
  return [
    el("p", { class: "doux petit note" }, `Les dettes d'origine, comme en mode direct, quel que soit le mode de remboursement. ${telephone.matches ? "Touche une ligne pour le détail." : "Touche un montant pour voir d'où il vient."}`),
    el("div", { class: "carte filtres-suivi" }, personne, origines, tri,
      el("label", { class: "coche-ligne" }, "Non réglé seulement", nonRegle)),
    zone,
    el("h2", {}, "Zone dangereuse"),
    el("div", { class: "actions" },
      el("button", { class: "btn danger large", type: "button", onclick: creerDette }, icone("plus"), "Créer une dette manuelle"),
      el("button", { class: "btn large", type: "button", onclick: () => exporter(filtrees()) }, icone("telecharger"), "Exporter en CSV")),
  ];
}

export function resumeSuivi() {
  const reste = app.etat.suivi.lignes.filter(l => l.reste > 0);
  return reste.length ? `${pluriel(reste.length, "dette")} en cours` : "Toutes les dettes du groupe";
}
