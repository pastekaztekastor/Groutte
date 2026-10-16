import { app, el, icone, avatar, envoyer, ouvrirModale, ouvrirFeuille, notifier, dateCourte, ilYa } from "./commun.js";
import { euros, enSaisie, lireEuros } from "./paiement.js";
import { pagePaiement } from "./creances.js";

/* #comptes : Budget > Mes comptes. Mon solde net, ce que je dois (Rembourser), ce qu'on me doit (Confirmer, Refuser,
   Relancer, Faire grâce), le lien vers Créances tant que ma part n'est pas réglée, et l'historique.
   #rembourser-a/<nom> : la page de paiement, puis « J'ai remboursé X € ». */

const MODES = { direct: "Direct", minimum: "Minimum de virements" };
const ETATS = { remboursee: "remboursée", partielle: "remboursée en partie", "a-rembourser": "à rembourser" };
const TYPES = { depense: "", report: "Report", avoir: "Avoir", manque: "Manque", retard: "Nuits en plus", remboursement: "Remboursement", grace: "Grâce" };

/* Le solde, en grand : rouge si je dois, vert si on me doit, gris si quitte ; le dégradé entre les deux (Flux le reprendra). */
function solde(c) {
  const s = c.solde;
  const t = Math.max(-1, Math.min(1, s / 5000));
  const texte = s < 0 ? `Tu dois ${euros(-s)}` : s > 0 ? `On te doit ${euros(s)}` : "Tu es quitte";
  return el("section", { class: "solde", style: `--t-vert: ${Math.round(Math.max(0, t) * 100)}%; --t-rouge: ${Math.round(Math.max(0, -t) * 100)}%` },
    el("strong", {}, texte),
    el("span", { class: "doux petit" }, `Mode : ${MODES[c.mode].toLowerCase()}`, c.cloture && " · comptes clôturés"));
}

/* Le détail d'une dette, dépense par dépense (mode direct seulement). */
function detail(ligne, sens) {
  if (!ligne.detail.length) return;
  ouvrirFeuille(sens === "je-dois" ? `Ce que je dois à ${ligne.nom}` : `Ce que ${ligne.nom} me doit`,
    el("div", { class: "liste-groupee" }, ligne.detail.slice().reverse().map(e => el(e.ref && e.type === "depense" ? "a" : "div", {
      class: "ligne", href: e.ref && e.type === "depense" ? "#depenses/" + e.ref : null,
    },
    el("span", { class: "ligne-texte" }, [TYPES[e.type], e.libelle].filter(Boolean).join(" : "),
      el("span", { class: "doux petit" }, `${e.date ? dateCourte(e.date.slice(0, 10)) + " · " : ""}${ETATS[e.etat] || ""}`)),
    el("span", { class: "ligne-valeur" }, euros(e.montant))))));
}

function faireGrace(ligne) {
  const champ = el("input", { inputmode: "decimal", value: enSaisie(ligne.montant), "aria-label": "Montant en euros" });
  ouvrirModale(`Faire grâce à ${ligne.nom}`, [
    el("label", { class: "champ" }, "Montant (en euros)", champ),
    el("p", { class: "doux petit" }, `Tu renonces à tout ou partie des ${euros(ligne.montant)} que ${ligne.nom} te doit. C'est irréversible, et c'est toi qui absorbes le montant. ${ligne.nom} sera prévenu.`),
  ], "Faire grâce", async () => {
    const montant = lireEuros(champ.value);
    if (!montant) { notifier("Indique un montant valable."); return false; }
    if (!confirm(`Faire grâce de ${euros(montant)} à ${ligne.nom} ? C'est définitif.`)) return false;
    return envoyer("comptes/grace", { qui: ligne.nom, montant });
  });
}

function jeDois(c) {
  return el("div", { class: "liste-groupee" }, c.je_dois.map(l => el("div", { class: "ligne ligne-dette" },
    el("button", { type: "button", class: "qui-lien", onclick: () => detail(l, "je-dois"), disabled: !l.detail.length },
      avatar(l.nom, 40), el("span", { class: "ligne-texte" }, el("strong", {}, l.nom),
        l.attente.length > 0 && el("span", { class: "doux petit" }, `${euros(l.attente.reduce((t, r) => t + r.montant, 0))} en attente de confirmation`))),
    el("span", { class: "montant" }, euros(l.montant)),
    el("a", { class: "btn principal petit-bouton", href: "#rembourser-a/" + encodeURIComponent(l.nom) }, "Rembourser"))));
}

function onMeDoit(c) {
  return el("div", { class: "liste-groupee" }, c.on_me_doit.map(l => el("div", { class: "ligne ligne-dette colonne" },
    el("div", { class: "rangee-dette" },
      el("button", { type: "button", class: "qui-lien", onclick: () => detail(l, "on-me-doit"), disabled: !l.detail.length },
        avatar(l.nom, 40), el("span", { class: "ligne-texte" }, el("strong", {}, l.nom))),
      l.montant > 0 && el("span", { class: "montant" }, euros(l.montant))),
    l.attente.map(r => el("div", { class: "declare" },
      el("span", { class: "petit" }, `Déclaré : ${euros(r.montant)}, ${ilYa(r.quand)}`),
      el("button", { class: "btn petit-bouton", type: "button", onclick: () => { if (confirm(`Tu n'as rien reçu de ${l.nom} ? Le remboursement sera annulé.`)) envoyer("comptes/confirmer", { id: r.id, recu: false }); } }, "Refuser"),
      el("button", { class: "btn principal petit-bouton", type: "button", onclick: () => envoyer("comptes/confirmer", { id: r.id, recu: true }) }, "Confirmer"))),
    l.montant > 0 && el("div", { class: "rangee a-droite" },
      el("button", { class: "discret", type: "button", disabled: !l.relance, title: l.relance ? null : "Une relance par 24 h au plus",
        onclick: async () => { if (await envoyer("comptes/relancer", { qui: l.nom })) notifier(`${l.nom} a reçu un petit rappel.`, true); } }, "Relancer"),
      el("button", { class: "discret", type: "button", onclick: () => faireGrace(l) }, "Faire grâce")))));
}

function giteSalle() {
  const cr = app.etat.creances;
  const lignes = ["gite", "salle"].filter(q => app.etat.gite[q].ouverture && !cr[q].hebergeur && cr[q].reste > 0);
  if (!lignes.length) return null;
  return [el("h2", {}, "Gîte et salle"), el("div", { class: "liste-groupee" }, lignes.map(q => el("a", { class: "ligne", href: "#creances" },
    el("span", { class: "ligne-texte" }, `Reste ${euros(cr[q].reste)} pour ${q === "gite" ? "le gîte" : "la salle"}`), icone("chevron-droite"))))];
}

function historique(c) {
  if (!c.historique.length) return el("p", { class: "doux note" }, "Rien pour l'instant.");
  return el("div", { class: "liste-groupee" }, c.historique.slice(0, 80).map(h => {
    const avec = h.avec.join(", ");
    const texte = h.type === "remboursement" ? (h.montant > 0 ? `Remboursement à ${avec}` : `Remboursement de ${avec}`)
      : h.type === "grace" ? (h.montant > 0 ? `Grâce de ${avec}` : `Grâce à ${avec}`)
      : h.type === "depense" ? `${h.libelle} (${h.montant > 0 ? "j'ai payé" : `${avec} a payé`})`
      : `${h.libelle} (${avec})`;
    return el(h.type === "depense" ? "a" : "div", { class: "ligne", href: h.type === "depense" ? "#depenses/" + h.ref : null },
      el("span", { class: "ligne-texte" }, texte, el("span", { class: "doux petit" }, (h.date ? dateCourte(h.date.slice(0, 10)) : "") + (h.office ? " · confirmé d'office" : ""))),
      el("span", { class: "ligne-valeur " + (h.montant > 0 ? "positif" : "negatif") }, (h.montant > 0 ? "+" : "") + euros(h.montant)));
  }));
}

export function vueComptes() {
  const c = app.etat.compta;
  const quitte = !c.je_dois.length && !c.on_me_doit.length;
  return [
    solde(c),
    quitte ? el("p", { class: "doux note centre" }, "Tu es quitte : personne ne te doit rien, et tu ne dois rien à personne.") : [
      c.je_dois.length > 0 && [el("h2", {}, "Je dois"), jeDois(c)],
      c.on_me_doit.length > 0 && [el("h2", {}, "On me doit"), onMeDoit(c)],
      c.mode === "minimum" && el("p", { class: "doux petit note" }, "En mode minimum de virements, tu peux devoir de l'argent à quelqu'un qui n'a rien payé pour toi : c'est normal. ",
        el("a", { href: "#faq/direct-ou-minimum" }, "Pourquoi ?")),
    ],
    giteSalle(),
    el("h2", {}, "Historique"),
    historique(c),
    el("p", { class: "note" }, el("a", { href: "#faq/mon-solde" }, "Comment ça marche ?")),
  ];
}

export function vueRembourserA(nom) {
  const ligne = app.etat.compta.je_dois.find(l => l.nom === nom);
  if (!ligne) return [el("p", { class: "doux" }, `Tu ne dois rien à ${nom}.`), el("a", { class: "btn large", href: "#comptes" }, "Retour à Mes comptes")];
  return pagePaiement({
    nom, montant: ligne.montant, cle: "rembourser-a." + nom, bouton: "J'ai remboursé", avertir: true,
    libelle: `Groutte - Remboursement - ${app.moi}`,
    declarer: async centimes => {
      if (!await envoyer("comptes/rembourser", { a: nom, montant: centimes })) return false;
      notifier(`C'est noté : ${nom} va confirmer.`, true);
      return true;
    },
  });
}

export function resumeComptes() {
  const s = app.etat.compta.solde;
  return s < 0 ? `Tu dois ${euros(-s)}` : s > 0 ? `On te doit ${euros(s)}` : "Tu es quitte";
}

/* Pastille : des remboursements déclarés, à confirmer. */
export const aConfirmerComptes = () => app.etat.compta.on_me_doit.reduce((t, l) => t + l.attente.length, 0);
