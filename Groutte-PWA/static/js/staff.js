import { app, el, avatar, compte, sansAccent, envoyer, ouvrirModale, afficher, ilYa } from "./commun.js";

/* #staff : Staff > Comptes. On choisit des membres en tapant leur nom (pastilles, comme les destinataires d'un mail),
   puis une action. Actions de groupe : rôles, muet. Actions sur une seule personne (avec confirmation) : droit
   staff, code à zéro, nom, désactivation. En bas, le journal des actions du staff. */

const selection = new Set();
const nomRole = id => app.etat.roles.find(r => r.id === id)?.nom || id;

function statut(c) {
  return [c.staff ? "staff" : "participant", c.muet && "muet", c.desactive && "désactivé", ...c.roles.map(nomRole)].filter(Boolean).join(" · ");
}

/* Le champ de recherche : suggestions sous le champ, redessinées seules (le clavier reste ouvert). */
function champMembres() {
  const entree = el("input", { type: "search", placeholder: selection.size ? "Ajouter quelqu'un" : "@ puis un nom", "aria-label": "Choisir des membres", autocomplete: "off" });
  const suggestions = el("div", { class: "suggestions-staff", role: "listbox" });
  entree.addEventListener("input", () => {
    const texte = sansAccent(entree.value.replace(/^@/, "").trim());
    const trouves = texte ? app.etat.comptes.filter(c => !selection.has(c.nom) && sansAccent(c.nom).includes(texte)).slice(0, 6) : [];
    suggestions.replaceChildren(...trouves.map(c => el("button", {
      type: "button", class: "ligne entree", role: "option",
      onclick: () => { selection.add(c.nom); afficher(); },
    }, avatar(c.nom, 28), el("span", { class: "ligne-texte" }, c.nom, el("span", { class: "doux petit" }, statut(c))))));
  });
  const pastilles = [...selection].map(nom => el("button", {
    type: "button", class: "puce actif", "aria-label": `Retirer ${nom}`, onclick: () => { selection.delete(nom); afficher(); },
  }, avatar(nom, 20), nom, " ×"));
  return el("div", { class: "carte choix-membres" }, el("div", { class: "pastilles" }, pastilles, entree), suggestions);
}

function choisirRole(titre, ajouter) {
  const roles = app.etat.roles.filter(r => r.type !== "automatique");
  const choix = el("select", { required: true }, roles.map(r => el("option", { value: r.id }, `${r.nom}${r.type === "libre" ? " (libre)" : ""}`)));
  ouvrirModale(titre, [el("label", { class: "champ" }, "Rôle", choix),
    el("p", { class: "doux petit" }, `Pour : ${[...selection].join(", ")}.`)], ajouter ? "Ajouter" : "Retirer",
  () => envoyer("staff/role", { qui: [...selection], role: choix.value, ajouter }));
}

function corrigerNom(nom) {
  const champ = el("input", { value: nom, maxlength: 30, required: true });
  ouvrirModale("Corriger le nom", [el("label", { class: "champ" }, "Nouveau nom", champ),
    el("p", { class: "doux petit" }, "Le nom change partout. La personne est prévenue.")], "Corriger",
  async () => {
    if (!await envoyer("staff/renommer", { qui: nom, nouveau: champ.value })) return false;
    selection.delete(nom);
    selection.add(champ.value.trim().replace(/\s+/g, " "));
    afficher();
    return true;
  });
}

async function remettreCode(nom) {
  if (!confirm(`Remettre le code de ${nom} à zéro ? Tous ses appareils seront déconnectés.`)) return;
  if (!await envoyer("staff/code", { qui: nom })) return;
  const { code } = app.etat.code_provisoire || {};
  ouvrirModale("Code provisoire", [
    el("p", {}, `Le code provisoire de ${nom} est :`),
    el("p", { class: "code-provisoire" }, code),
    el("p", { class: "doux petit" }, "Transmets-le-lui en privé. Il ne sera plus affiché. À sa prochaine connexion, il choisira son nouveau code."),
  ], "C'est noté", async () => true);
}

function actions() {
  const choisis = [...selection].map(compte).filter(Boolean);
  if (!choisis.length) return null;
  const un = choisis.length === 1 ? choisis[0] : null;
  const actifs = choisis.filter(c => !c.desactive);
  const bouton = (libelle, action, actif = true, danger = false) =>
    el("button", { type: "button", class: "btn" + (danger ? " danger" : ""), disabled: !actif, onclick: action }, libelle);
  const confirmer = (question, route, corps) => () => { if (confirm(question)) envoyer(route, corps); };
  return [
    el("h2", {}, "Pour la sélection"),
    el("div", { class: "carte actions-staff" },
      bouton("Ajouter un rôle", () => choisirRole("Ajouter un rôle", true), actifs.length === choisis.length),
      bouton("Retirer un rôle", () => choisirRole("Retirer un rôle", false), actifs.length === choisis.length),
      bouton("Rendre muet", confirmer(`Rendre muet ${choisis.map(c => c.nom).join(", ")} ?`, "staff/muet", { qui: [...selection], muet: true }),
        choisis.every(c => !c.staff && !c.desactive)),
      bouton("Rendre la parole", () => envoyer("staff/muet", { qui: [...selection], muet: false }), choisis.some(c => c.muet))),
    el("h2", {}, "Pour une seule personne"),
    el("div", { class: "carte actions-staff" },
      !un && el("p", { class: "doux petit" }, "Choisis une seule personne pour ces actions."),
      bouton(un?.staff ? "Retirer le droit staff" : "Nommer staff",
        () => un && confirmer(un.staff ? `Retirer le droit staff à ${un.nom} ?` : `Nommer ${un.nom} staff ?`, "staff/droit", { qui: un.nom, staff: !un.staff })(),
        Boolean(un && !un.desactive)),
      bouton("Remettre le code à zéro", () => remettreCode(un.nom), Boolean(un && !un.desactive)),
      bouton("Corriger le nom", () => corrigerNom(un.nom), Boolean(un)),
      bouton(un?.desactive ? "Réactiver le compte" : "Désactiver le compte",
        () => un && confirmer(un.desactive ? `Réactiver le compte de ${un.nom} ?` : `Désactiver le compte de ${un.nom} ? Il ne pourra plus se connecter, mais son historique reste.`,
          "staff/desactiver", { qui: un.nom, desactive: !un.desactive })(),
        Boolean(un), !un?.desactive)),
  ];
}

const PHRASES = {
  role: l => `a changé un rôle de ${l.qui} (${l.detail})`,
  muet: l => `a rendu ${l.qui} muet`,
  parole: l => `a rendu la parole à ${l.qui}`,
  staff: l => `a nommé ${l.qui} staff`,
  "plus-staff": l => `a retiré le droit staff à ${l.qui}`,
  code: l => `a remis le code de ${l.qui} à zéro`,
  nom: l => `a corrigé un nom (${l.detail})`,
  desactive: l => `a désactivé le compte de ${l.qui}`,
  reactive: l => `a réactivé le compte de ${l.qui}`,
  "gite-date": l => `a fixé une date limite (${l.detail})`,
  "gite-montant": l => `a changé un montant (${l.detail})`,
  "gite-hebergeur": l => l.qui ? `a désigné ${l.qui} hébergeur (${l.detail})` : `a retiré l'hébergeur (${l.detail})`,
  "gite-repartition": l => `a réglé une répartition (${l.detail})`,
  "gite-exemption": l => `a réglé l'exemption de ${l.qui} (${l.detail})`,
  "gite-ouverture": l => `a ouvert les paiements (${l.detail})`,
  "gite-lit": l => `a réglé un lit (${l.detail})`,
  "gite-lit-supprime": l => `a supprimé le lit ${l.detail}`,
  "gite-salle-couchage": l => `a réglé la salle comme couchage (${l.detail})`,
  "gite-plan": () => "a changé le plan du gîte",
  "gite-inscription": l => `a accepté l'inscription de ${l.qui}`,
  "creances-report": l => `a accepté un report pour ${l.qui} (${l.detail})`,
  "compta-mode": l => `a changé le mode de remboursement (${l.detail})`,
  "compta-categorie": l => `a réglé une catégorie (${l.detail})`,
  "compta-categorie-supprimee": l => `a supprimé la catégorie ${l.detail}`,
};

export function vueStaffComptes() {
  for (const nom of [...selection]) if (!compte(nom)) selection.delete(nom);
  const choisis = [...selection].map(compte).filter(Boolean);
  const journal = app.etat.journal || [];
  return [
    champMembres(),
    choisis.length > 0 && el("div", { class: "liste-groupee" }, choisis.map(c => el("div", { class: "ligne" },
      avatar(c.nom, 32), el("span", { class: "ligne-texte" }, el("strong", {}, c.nom), el("span", { class: "doux petit" }, statut(c)))))),
    actions(),
    el("h2", {}, "Journal"),
    journal.length
      ? el("div", { class: "liste-groupee" }, journal.slice(0, 30).map(l => el("div", { class: "ligne" },
        el("span", { class: "ligne-texte" }, `${l.par} ${(PHRASES[l.action] || (() => l.action))(l)}`,
          el("span", { class: "doux petit" }, ilYa(l.quand))))))
      : el("p", { class: "doux note" }, "Aucune action pour l'instant."),
  ];
}
