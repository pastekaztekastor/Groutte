import { app, el, icone, envoyer, ouvrirModale, notifier, dateCourte } from "./commun.js";

/* #reglages-llm : Staff > Réglages LLM. Une clé d'API par fournisseur (Claude, ChatGPT, Mistral), le fournisseur actif
   parmi ceux dont la clé est testée, et le compteur du mois. Le serveur ne renvoie jamais une clé : seulement ses 4
   derniers caractères (llm.py). Poser ou tester une clé peut prendre jusqu'à 30 s. */

const AIDE = {
  claude: [
    "Va sur console.anthropic.com et crée un compte (ce n'est pas le même que claude.ai).",
    "Dans Billing, ajoute un peu de crédit : 5 € suffisent largement pour la semaine.",
    "Dans Settings > Limits, mets une limite de dépense mensuelle.",
    "Dans API Keys, crée une clé, copie-la, et colle-la ici. Elle ne s'affiche qu'une fois.",
  ],
  chatgpt: [
    "Va sur platform.openai.com et connecte-toi (ce n'est pas la même chose que chatgpt.com).",
    "Dans Billing, ajoute un peu de crédit : 5 € suffisent largement pour la semaine.",
    "Dans Limits, mets une limite de dépense mensuelle.",
    "Dans API keys, crée une clé, copie-la, et colle-la ici. Elle ne s'affiche qu'une fois.",
  ],
  mistral: [
    "Va sur console.mistral.ai et crée un compte.",
    "Choisis une offre d'API (il existe une offre d'essai gratuite, limitée : lis ses conditions, notamment sur l'usage des données envoyées).",
    "Dans API Keys, crée une clé, copie-la, et colle-la ici.",
  ],
};
const ABONNEMENT = { claude: "Claude Pro ou Max", chatgpt: "ChatGPT Plus ou Pro", mistral: "Le Chat Pro" };

const date = h => h ? dateCourte(h.slice(0, 10)) : "";

function etatCle(f) {
  if (!f.cle) return "Aucune clé";
  if (f.pret) return `Clé testée le ${date(f.teste)}`;
  return `Clé refusée le ${date(f.refuse)}`;
}

/* Le résultat d'un test, renvoyé par le serveur (llm_test). */
function direResultat() {
  const t = app.etat.llm_test;
  if (!t) return;
  if (t.erreur) notifier(`La clé ne marche pas : ${t.erreur}.`);
  else notifier(t.lecture ? "La clé marche, et la lecture d'image aussi." : "La clé marche, mais le faux ticket a été mal lu : vérifie le modèle dans config.json.", t.lecture);
}

function poserCle(id, f) {
  const champ = el("input", { type: "password", autocomplete: "off", spellcheck: "false", required: true, placeholder: "Colle la clé ici" });
  ouvrirModale(f.cle ? `Remplacer la clé ${f.nom}` : `Clé ${f.nom}`, [
    el("label", { class: "champ" }, "Clé d'API", champ),
    el("p", { class: "doux petit" }, "Elle est testée tout de suite avec un faux ticket (jusqu'à 30 s). Si le test échoue, elle n'est pas enregistrée. Personne ne pourra la relire, pas même toi."),
  ], "Tester et enregistrer", async () => {
    notifier("Test de la clé...", true);
    if (!await envoyer("llm/cle", { fournisseur: id, cle: champ.value })) return false;
    direResultat();
    return true;
  });
}

function blocFournisseur(id, f) {
  const { actif } = app.etat.reglages_llm;
  return [
    el("h2", {}, `${f.nom} (${f.societe})`),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" },
        el("span", { class: "ligne-texte" }, etatCle(f), el("span", { class: "doux petit" }, `Modèle : ${f.modele}${id === actif ? " · fournisseur actif" : ""}`)),
        f.cle && el("span", { class: "ligne-valeur mono" }, f.cle)),
      el("div", { class: "ligne rangee a-droite" },
        el("button", { class: "btn petit-bouton" + (f.cle ? "" : " principal"), type: "button", onclick: () => poserCle(id, f) }, f.cle ? "Remplacer" : "Poser une clé"),
        f.cle && el("button", { class: "btn petit-bouton", type: "button", onclick: async () => {
          notifier("Test en cours...", true);
          if (await envoyer("llm/tester", { fournisseur: id })) direResultat();
        } }, "Tester"),
        f.cle && el("button", { class: "btn petit-bouton danger", type: "button", onclick: () => {
          const derniere = Object.values(app.etat.reglages_llm.fournisseurs).filter(x => x.pret).length <= 1 && f.pret;
          if (confirm(`Retirer la clé ${f.nom} ?${derniere ? " C'est la dernière clé qui marche : « Préremplir avec le ticket » disparaîtra de Dépenses." : ""}`)) envoyer("llm/retirer", { fournisseur: id });
        } }, "Retirer"))),
    el("details", { class: "en-detail aide-llm" },
      el("summary", {}, "Comment obtenir une clé ?"),
      el("ol", {}, AIDE[id].map(t => el("li", {}, t))),
      el("p", {}, el("strong", {}, "Attention : "), `un abonnement ${ABONNEMENT[id]} ne donne pas de clé d'API. L'API se paie à part, à l'usage.`)),
  ];
}

export function vueReglagesLlm() {
  const r = app.etat.reglages_llm;
  const ids = Object.keys(r.fournisseurs);
  const lus = ids.map(id => r.compteur[id] ? `${r.compteur[id]} (${r.fournisseurs[id].nom})` : "").filter(Boolean);
  return [
    el("p", { class: "doux petit note" }, "Ces clés servent à lire les tickets de caisse dans Dépenses (« Préremplir avec le ticket »). Sans clé qui marche, la saisie à la main suffit."),
    el("h2", {}, "Fournisseur actif"),
    el("div", { class: "segments segments-trois", role: "radiogroup", "aria-label": "Fournisseur actif" }, ids.map(id => el("button", {
      type: "button", class: r.actif === id ? "choisi" : "", role: "radio", "aria-checked": String(r.actif === id), disabled: !r.fournisseurs[id].pret,
      onclick: () => r.actif !== id && envoyer("llm/actif", { fournisseur: id }),
    }, r.fournisseurs[id].nom))),
    !r.actif && el("p", { class: "alerte-ligne" }, icone("info"), "Aucune clé testée : la lecture des tickets est coupée."),
    ids.map(id => blocFournisseur(id, r.fournisseurs[id])),
    el("p", { class: "note" }, `Ce mois-ci : ${lus.length ? lus.join(", ") + " tickets lus" : "aucun ticket lu"}.`),
    el("p", { class: "doux petit note" }, "Combien ça coûte ? Lire un ticket coûte de l'ordre d'un centime, parfois moins. Une semaine de courses, c'est quelques dizaines de centimes. Ces frais sont ceux du site, comme l'hébergement. Si une clé ne marche plus, l'appli passe toute seule sur une autre clé testée, et le staff est prévenu."),
  ];
}

export function resumeReglagesLlm() {
  const r = app.etat.reglages_llm;
  return r.actif ? `Actif : ${r.fournisseurs[r.actif].nom}` : "Aucune clé testée";
}
