import { app, el, icone, envoyer, ouvrirModale, fermerModale } from "./commun.js";

/* #reglages-compta : Staff > Réglages compta. Le mode de remboursement (Direct ou Minimum de virements) et les
   catégories de dépenses (type, règle de répartition, repère SAM). NON GÉRÉ est toujours en bas, sans modification. */

export const MODES = { direct: "Direct", minimum: "Minimum de virements" };
export const TYPES = { obligatoire: "obligatoire", facultative: "facultative" };
export const REGLES = { egale: "à parts égales", repas: "au prorata des repas", nuits: "au prorata des nuits" };

function choisirMode(mode) {
  if (mode === app.etat.compta.mode) return;
  if (confirm(`Passer en mode ${MODES[mode]} ? Les listes « Je dois » et « On me doit » seront recalculées (les soldes ne changent pas), et tout le monde sera prévenu.`)) {
    envoyer("compta/mode", { mode });
  }
}

function modifier(cat) {
  const nom = el("input", { value: cat?.nom || "", maxlength: 30, required: true });
  const type = el("select", {}, Object.entries(TYPES).map(([v, l]) => el("option", { value: v, selected: (cat?.type || "facultative") === v }, l)));
  const regle = el("select", {}, Object.entries(REGLES).map(([v, l]) => el("option", { value: v, selected: (cat?.regle || "egale") === v }, l)));
  const sam = el("input", { type: "checkbox", checked: Boolean(cat?.sam) });
  const ligneSam = el("label", { class: "coche-ligne" }, "Propose d'être SAM (à ceux qui ne la cochent pas)", sam);
  const majSam = () => { ligneSam.hidden = type.value !== "facultative"; };
  type.onchange = majSam;
  majSam();
  const supprimer = cat && el("button", { class: "btn danger large separe", type: "button", onclick: async () => {
    if (confirm(`Supprimer la catégorie ${cat.nom} ? Elle ne sera plus proposée dans les nouvelles dépenses.`) && await envoyer("compta/categorie/supprimer", { id: cat.id })) fermerModale();
  } }, "Supprimer la catégorie");
  ouvrirModale(cat ? cat.nom : "Ajouter une catégorie", [
    el("label", { class: "champ" }, "Nom", nom),
    el("label", { class: "champ" }, "Type", type),
    el("label", { class: "champ" }, "Répartition", regle),
    ligneSam,
    el("p", { class: "doux petit" }, "Obligatoire : tout le monde y participe. Facultative : seuls ceux qui l'ont cochée dans Ma fiche. Le changement ne vaut que pour les dépenses validées ensuite."),
    supprimer,
  ], "Enregistrer", () => envoyer("compta/categorie", { id: cat?.id || "", libelle: nom.value, type: type.value, regle: regle.value, sam: sam.checked }));
}

export function vueReglagesCompta() {
  const mode = app.etat.compta.mode;
  const { categories, supprimees } = app.etat.categories;
  const clos = Boolean(app.etat.compta.cloture);
  return [
    el("h2", {}, "Remboursement"),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" }, el("div", { class: "segments large", role: "radiogroup", "aria-label": "Mode de remboursement" },
        Object.entries(MODES).map(([v, l]) => el("button", { type: "button", class: mode === v ? "choisi" : "", role: "radio", "aria-checked": String(mode === v), onclick: () => choisirMode(v) }, l)))),
      el("a", { class: "ligne", href: "#faq/direct-ou-minimum" }, el("span", { class: "ligne-texte" }, "Quelle différence ?"), icone("chevron-droite"))),
    el("h2", {}, "Catégories"),
    el("div", { class: "liste-groupee" },
      categories.map(c => c.id === "non-gere"
        ? el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, el("strong", {}, c.nom), el("span", { class: "doux petit" }, "le payeur seul")))
        : el("button", { type: "button", class: "ligne entree", disabled: clos, onclick: () => modifier(c) },
          el("span", { class: "ligne-texte" }, el("strong", {}, c.nom), el("span", { class: "doux petit" }, `${TYPES[c.type]} · ${REGLES[c.regle]}${c.sam ? " · propose d'être SAM" : ""}`)),
          icone("chevron-droite"))),
      !clos && el("button", { type: "button", class: "ligne entree", onclick: () => modifier(null) }, icone("plus"), el("span", { class: "ligne-texte" }, "Ajouter une catégorie"))),
    supprimees.length > 0 && el("details", { class: "replie-supprimees" },
      el("summary", {}, `Supprimées, encore utilisées (${supprimees.length})`),
      el("div", { class: "liste-groupee" }, supprimees.map(c => el("div", { class: "ligne" },
        el("span", { class: "ligne-texte" }, c.nom, el("span", { class: "doux petit" }, `${TYPES[c.type]} · ${REGLES[c.regle]} · supprimée`)))))),
  ];
}

export const resumeReglagesCompta = () => `Mode ${MODES[app.etat.compta.mode].toLowerCase()} · ${app.etat.categories.categories.length} catégories`;
