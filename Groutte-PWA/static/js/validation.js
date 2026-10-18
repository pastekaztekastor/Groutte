import { app, el, envoyer, ouvrirModale, notifier } from "./commun.js";
import { detailDepense, ligneDepense, trouverDepense, vueSaisie } from "./depenses.js";
import { euros } from "./paiement.js";

/* #validation : Staff > Validation des dépenses. En attente, puis Validées, dans l'ordre d'envoi. #validation/<id> : le
   détail, avec les parts telles qu'elles seraient figées, et Valider ou Refuser (avec un motif). Un staff ne valide pas
   sa propre dépense, sauf s'il est le seul staff. Les brouillons des autres sont là aussi : un staff peut les compléter
   et les valider à leur place (un plouc qui n'a laissé que la photo du ticket). */

const envoyeeLe = d => d.historique.filter(h => h.action === "envoyee").pop()?.quand || d.saisie;
const seulStaff = () => app.etat.comptes.filter(c => c.staff && !c.desactive).length <= 1;

export const enAttente = () => app.etat.depenses.filter(d => d.etat === "attente");

export function vueValidation() {
  const attente = enAttente().sort((a, b) => envoyeeLe(a).localeCompare(envoyeeLe(b)));
  const brouillons = app.etat.depenses.filter(d => d.etat === "brouillon" && d.auteur !== app.moi).sort((a, b) => a.saisie.localeCompare(b.saisie));
  const validees = app.etat.depenses.filter(d => d.etat === "validee").sort((a, b) => envoyeeLe(a).localeCompare(envoyeeLe(b)));
  return [
    el("h2", {}, `En attente (${attente.length})`),
    attente.length ? el("div", { class: "liste-groupee" }, attente.map(d => ligneDepense(d, "#validation/" + d.id)))
      : el("p", { class: "doux note" }, "Rien à valider."),
    brouillons.length > 0 && [el("h2", {}, `Brouillons (${brouillons.length})`),
      el("div", { class: "liste-groupee" }, brouillons.map(d => ligneDepense(d, "#validation/" + d.id))),
      el("p", { class: "doux petit note" }, "Pas encore envoyés. Tu peux en compléter un et le valider à la place de son auteur.")],
    el("h2", {}, `Validées (${validees.length})`),
    validees.length ? el("div", { class: "liste-groupee liste-elements" }, validees.map(d => ligneDepense(d, "#validation/" + d.id)))
      : el("p", { class: "doux note" }, "Aucune pour l'instant."),
  ];
}

function refuser(d) {
  const motif = el("textarea", { maxlength: 300, required: true, rows: 3, placeholder: "Ce qu'il faut corriger" });
  ouvrirModale("Refuser la dépense", [el("label", { class: "champ" }, "Motif (obligatoire)", motif),
    el("p", { class: "doux petit" }, `La dépense revient en brouillon chez ${d.auteur}, avec ce motif.`)], "Refuser",
  async () => {
    if (!motif.value.trim()) { notifier("Indique le motif du refus."); return false; }
    if (!await envoyer("depenses/refuser", { id: d.id, motif: motif.value })) return false;
    location.replace("#validation");
    return true;
  });
}

export function vueValidationDepense(id) {
  const d = trouverDepense(id);
  if (d?.etat === "brouillon" && d.auteur !== app.moi) return vueSaisie(d, true);
  if (!d || d.etat === "brouillon") return el("p", { class: "doux" }, "Cette dépense n'est plus en attente : elle a été refusée, ou n'existe plus.");
  const sienne = d.auteur === app.moi && !seulStaff();
  const actions = d.etat === "attente" && el("div", { class: "actions" },
    sienne && el("p", { class: "doux petit" }, "Un autre staff doit la valider."),
    el("button", { class: "btn principal large", type: "button", disabled: sienne || Boolean(d.apercu_erreur), onclick: async () => {
      if (confirm(`Valider « ${d.motif} » (${euros(d.montant)}) ? C'est définitif.`) && await envoyer("depenses/valider", { id })) {
        notifier("Dépense validée.", true);
        location.replace("#validation");
      }
    } }, "Valider"),
    el("button", { class: "btn danger large", type: "button", onclick: () => refuser(d) }, "Refuser"));
  return detailDepense(d, actions);
}

export const titreValidation = id => trouverDepense(id)?.motif || "Dépense";
export const resumeValidation = () => {
  const n = enAttente().length;
  return n ? `${n} dépense${n > 1 ? "s" : ""} à valider` : "Rien à valider";
};
