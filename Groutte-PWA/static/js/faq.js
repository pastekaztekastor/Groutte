import { app, el, afficher } from "./commun.js";

/* #faq : Budget > Comment ça marche, la FAQ du budget. #faq/<id> ouvre directement une question, dépliée.
   Le texte est dans static/faq.json (modifié par le webmaster) ; les réglages sont lus en direct dans l'état : le repère
   « actif » sur la répartition de la salle et le mode de remboursement, le tableau des vraies catégories, et les
   questions masquées (acompte, lecture du ticket) quand ce n'est pas activé. La page ne peut donc jamais contredire
   les réglages du staff. */

let faq = null;
let chargement = null;
const ouvertes = new Set();     // questions dépliées (la page est redessinée toutes les 30 s)
const detaillees = new Set();   // « En détail » dépliés
let defilee = "";               // la question de l'adresse, déjà amenée à l'écran
window.addEventListener("hashchange", () => { defilee = ""; });   // enregistré avant celui de main.js : il passe d'abord

function charger() {
  chargement ??= fetch("static/faq.json", { cache: "no-store" }).then(r => r.json()).then(d => { faq = d; afficher(); })
    .catch(() => { chargement = null; });
}

const REGLES = { egale: "à parts égales", repas: "au prorata des repas pris", nuits: "au prorata des nuits" };

/* Une question visible ? L'acompte arrive avec le Prévisionnel (jalon 3), la lecture du ticket avec Réglages LLM. */
function visible(q) {
  if (q.condition === "acompte") return Boolean(app.etat.acompte);
  if (q.condition === "llm") return Boolean(app.etat.llm);
  return true;
}

function reperes(q) {
  if (q.actif === "salle") return el("span", { class: "badge actif" }, `Actif : ${app.etat.gite.salle.repartition === "egale" ? "parts égales" : "comme le gîte"}`);
  if (q.actif === "mode") return el("span", { class: "badge actif" }, `Actif : ${app.etat.compta.mode === "direct" ? "direct" : "minimum de virements"}`);
  return null;
}

function tableauCategories() {
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-suivi" },
    el("thead", {}, el("tr", {}, ["Catégorie", "Type", "Qui paie", "Répartition"].map(t => el("th", {}, t)))),
    el("tbody", {}, app.etat.categories.categories.map(c => el("tr", {},
      el("td", {}, c.nom),
      el("td", {}, c.type === "speciale" ? "spéciale" : c.type),
      el("td", {}, c.type === "obligatoire" ? "tout le monde" : c.type === "facultative" ? "ceux qui l'ont cochée" : "le payeur seul"),
      el("td", {}, REGLES[c.regle] || "-"))))));
}

function question(q) {
  const detail = el("details", { class: "en-detail", open: detaillees.has(q.id) },
    el("summary", {}, "En détail"),
    q.detail.map((p, i) => [el("p", {}, p), i === 0 && q.tableau === "categories" && tableauCategories()]),
    q.exemple && el("p", { class: "exemple" }, el("strong", {}, "Exemple : "), q.exemple),
    q.liens?.length > 0 && el("p", { class: "liens-faq" }, q.liens.map(([lien, texte]) => el("a", { href: lien }, texte))));
  detail.ontoggle = () => { detail.open ? detaillees.add(q.id) : detaillees.delete(q.id); };
  const bloc = el("details", { class: "question-faq", id: "faq-" + q.id, open: ouvertes.has(q.id) },
    el("summary", {}, el("span", {}, q.question), reperes(q)),
    el("p", {}, q.court),
    detail);
  bloc.ontoggle = () => { bloc.open ? ouvertes.add(q.id) : ouvertes.delete(q.id); };
  return bloc;
}

export function vueFaq(id) {
  if (!faq) { charger(); return el("p", { class: "doux" }, "Chargement..."); }
  const toutes = faq.parties.flatMap(p => p.questions).filter(visible);
  // Un lien vers une question qui n'existe pas (ou masquée) : la page s'ouvre en haut, sur l'encadré.
  if (id && id !== defilee && toutes.some(q => q.id === id)) {
    ouvertes.add(id);
    defilee = id;
    requestAnimationFrame(() => document.getElementById("faq-" + id)?.scrollIntoView({ block: "start" }));
  }
  return [
    el("section", { class: "carte attention" }, el("h3", {}, "ATTENTION"), faq.attention.map(p => el("p", {}, p))),
    faq.parties.map(p => {
      const questions = p.questions.filter(visible);
      return questions.length > 0 && [el("h2", {}, p.titre), el("div", { class: "liste-faq" }, questions.map(question))];
    }),
  ];
}
