import { app, el, icone, envoyer, ouvrirModale, fermerModale, notifier, ilYa } from "./commun.js";

/* #reglages-compta : Staff > Réglages compta. Le mode de remboursement (Direct ou Minimum de virements), les
   catégories de dépenses (type, règle de répartition, repère SAM ; NON GÉRÉ toujours en bas, sans modification), les
   repas gérés par la communauté (Mes repas, Menu), et la clôture des comptes, irréversible. */

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

const CRENEAUX = { matin: "Matin", midi: "Midi", soir: "Soir" };

/* Pour chaque créneau : géré par la communauté, et coché par défaut (grisé tant qu'il n'est pas géré). Seuls les repas
   pas encore commencés changent. */
function repasGeres(clos) {
  const regles = app.etat.categories.repas;
  return el("div", { class: "liste-groupee" }, Object.entries(CRENEAUX).map(([c, libelle]) => {
    const r = regles[c];
    const gere = el("input", { type: "checkbox", checked: r.gere, disabled: clos, "aria-label": `${libelle} : géré` });
    const defaut = el("input", { type: "checkbox", checked: r.defaut, disabled: clos || !r.gere, "aria-label": `${libelle} : coché par défaut` });
    const regler = () => envoyer("compta/repas", { creneau: c, gere: gere.checked, defaut: gere.checked && defaut.checked });
    gere.onchange = defaut.onchange = regler;
    return el("div", { class: "ligne ligne-exemption" }, el("span", { class: "ligne-texte" }, libelle),
      el("span", { class: "coches" }, el("label", { class: "coche-courte" }, "Géré", gere), el("label", { class: "coche-courte" }, "Coché par défaut", defaut)));
  }));
}

function cloturer() {
  const mot = el("input", { autocomplete: "off", placeholder: "CLÔTURER", required: true });
  ouvrirModale("Clôturer les comptes", [
    el("section", { class: "carte attention" }, el("h3", {}, "IRRÉVERSIBLE"),
      el("p", { class: "petit" }, "Après le séjour : plus de nouvelle dépense, plus de changement de présence ni de repas, les catégories et les repas gérés sont figés. Ce qui reste à payer du gîte et de la salle devient une dette envers l'hébergeur. Chacun reçoit son plan final de virements. Les remboursements, les grâces et Suivi des dépenses restent possibles.")),
    el("label", { class: "champ" }, "Tape CLÔTURER pour confirmer", mot),
  ], "Clôturer", async () => {
    if (!await envoyer("compta/cloturer", { mot: mot.value })) return false;
    notifier("Comptes clôturés : chacun a reçu son plan de virements.", true);
    return true;
  });
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
    el("h2", {}, "Repas gérés par la communauté"),
    repasGeres(clos),
    el("p", { class: "doux petit note" }, "Un repas géré se coche dans Mes repas, et le Menu peut le viser. Un repas non géré ne compte jamais : chacun se débrouille. Un changement ne vaut que pour les repas pas encore commencés."),
    el("h2", {}, "Clôture des comptes"),
    el("div", { class: "liste-groupee" }, el("div", { class: "ligne" }, clos
      ? el("span", { class: "ligne-texte" }, `Comptes clôturés ${ilYa(app.etat.compta.cloture)}.`)
      : el("button", { class: "btn danger large", type: "button", onclick: cloturer }, "Clôturer les comptes"))),
  ];
}

export const resumeReglagesCompta = () => `Mode ${MODES[app.etat.compta.mode].toLowerCase()} · ${app.etat.categories.categories.length} catégories`;
