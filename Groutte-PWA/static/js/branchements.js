import { app, el, icone, ouvrirModale, afficher, jourCourt } from "./commun.js";
import { extensions } from "./extensions.js";
import { euros, enSaisie, lireEuros } from "./paiement.js";
import { CRENEAUX, LIBELLES, presentsA } from "./sejour.js";

/* Tout ce que Groutte règle dans la page commune (socle/static/js/extensions.js), au même endroit : liens vers les
   fiches, guide de bienvenue, textes, phrases du journal du staff, désactivation avec dettes, filtres d'annonce,
   Contacter le staff. Importé par rubriques.js. */

extensions.liens.moi = "#fiche";
extensions.liens.libelleMoi = "Ma fiche";
extensions.liens.contact = nom => "#carnet/" + encodeURIComponent(nom);
extensions.apresInscription = "#bienvenue";
extensions.moderation = "Les outils de modération du forum, sur cet appareil";
extensions.toujoursRecues = "Les mentions @, les annonces du staff, les paiements du gîte et de la salle, ce qui fait bouger ton argent sans toi, et les actions du staff sur ton compte (dont une dette effacée ou créée par le staff).";
extensions.degrades = [["#5c1f2e", "#3e3160"], ["#3e3160", "#33493a"], ["#33493a", "#8c4a28"], ["#8c4a28", "#5c1f2e"]];

/* --- Staff > Comptes ------------------------------------------------------------------------------------------ */

Object.assign(extensions.staff.phrases, {
  desactive: l => `a désactivé le compte de ${l.qui}${l.detail ? ` (dettes effacées : ${l.detail})` : ""}`,
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
  "compta-depenses": l => `a rendu la page Dépenses ${l.detail}`,
  "compta-repas": l => `a réglé un repas géré (${l.detail})`,
  "compta-cloture": () => "a clôturé les comptes",
  "gite-literie": l => `a réglé la literie du gîte (${l.detail})`,
  "suivi-effacer": l => `a effacé une dette de ${l.qui} (${l.detail})`,
  "suivi-dette": l => `a créé une dette manuelle de ${l.qui} (${l.detail})`,
  "llm-cle": l => `a posé une clé ${l.detail}`,
  "llm-test": l => `a testé la clé ${l.detail}`,
  "llm-actif": l => `a choisi ${l.detail} pour lire les tickets`,
  "llm-retirer": l => `a retiré la clé ${l.detail}`,
});

/* Désactiver : si le solde n'est pas nul, on retape ce solde. Toutes les dettes du compte sont alors effacées, dans les
   deux sens (Suivi des dépenses), et les personnes touchées sont prévenues (branchements.py, proteger). */
extensions.staff.desactiver = (nom, envoyerDesactivation) => {
  const solde = app.etat.annonces.soldes?.[nom] || 0;
  const touches = (app.etat.suivi?.lignes || []).filter(l => l.reste > 0 && l.action && (l.de === nom || l.a === nom))
    .map(l => l.de === nom ? `${euros(l.reste)} envers ${l.a}` : `${euros(l.reste)} de ${l.de}`);
  if (!solde && !touches.length) return false;   // rien à effacer : la confirmation du socle suffit
  const texte = `${nom} ne pourra plus se connecter, mais son historique reste.`;
  const retape = el("input", { inputmode: "decimal", placeholder: enSaisie(Math.abs(solde)), "aria-label": "Solde retapé" });
  ouvrirModale(`Désactiver ${nom}`, [
    el("section", { class: "carte attention" }, el("h3", {}, "SES DETTES SERONT EFFACÉES"),
      el("p", { class: "petit" }, `${texte} ${solde < 0 ? `Il doit ${euros(-solde)}` : solde > 0 ? `On lui doit ${euros(solde)}` : "Son solde est nul"} : toutes ses dettes seront effacées, dans les deux sens, et ne reviendront pas s'il est réactivé. Les personnes touchées seront prévenues.`),
      touches.length > 0 && el("p", { class: "petit" }, touches.join(" · "))),
    solde !== 0 && el("label", { class: "champ" }, `Retape ${enSaisie(Math.abs(solde))} pour confirmer`, retape),
  ], "Désactiver", () => envoyerDesactivation({ confirmation: solde ? lireEuros(retape.value) : 0 }));
  return true;
};

/* --- Staff > Annonces --------------------------------------------------------------------------------------- */

Object.assign(extensions.annonces, {
  groupes: [
    ["Filtrer par groupe", [["tous", "Tout le monde"], ["viennent", "Qui vient"], ["presents", "Présents"], ["staff", "Staff"], ["role", "Rôle"],
      ["tardifs", "Inscriptions tardives"]]],
    ["Filtrer par argent", [["gite", "Pas payé le gîte"], ["salle", "Pas payé la salle"], ["doit", "Doit plus de"], ["sans_moyen", "Pas de moyen de paiement"]]],
    ["Filtrer par info manquante", [["presence", "Présence non renseignée"], ["lit", "Pas de lit, alors qu'il en restait"], ["literie", "Literie non renseignée"],
      ["fiche", "Fiche incomplète"], ["alcool", "Alcool non coché (pour le SAM)"]]],
  ],
  pages: [["#pings", "Pings reçus"], ["#presence", "Présence"], ["#lits", "Lits"], ["#repas", "Mes repas"], ["#menu", "Menu"],
    ["#comptes", "Remboursement"], ["#creances", "Créances gîte et salle"], ["#depenses", "Dépenses"], ["#faq", "FAQ"],
    ["#fiche", "Ma fiche"], ["#rembourser", "Moyen de paiement"], ["#notifications", "Notifications"], ["#forum", "Forum"],
    ["#contact", "Contacter le staff"], ["#carnet", "Carnet d'adresses"]],
  pageDuFiltre: { gite: "#creances", salle: "#creances", doit: "#comptes", sans_moyen: "#rembourser", presence: "#presence",
    tardifs: "#presence", lit: "#lits", literie: "#fiche", fiche: "#fiche", alcool: "#fiche" },
  /* Le message d'exemple, prérempli quand un seul filtre est coché. */
  exemples: {
    gite: ["Gîte : dernier rappel", "Il te reste 3 jours pour payer ta part du gîte !"],
    salle: ["Salle : dernier rappel", "Il te reste 3 jours pour payer ta part de la salle !"],
    doit: ["Remboursements", "Tu dois encore de l'argent à des ploucs : tout est dans Remboursement."],
    sans_moyen: ["Moyen de paiement", "Indique comment on peut te rembourser, sinon personne ne pourra le faire !"],
    presence: ["Présence", "Dis-nous quels jours tu viens, pour qu'on prévoie les lits et les repas."],
    lit: ["Lits", "Il reste des lits : réserve le tien avant qu'il n'y en ait plus."],
    literie: ["Literie", "Indique dans Ma fiche si tu apportes un matelas ou un duvet."],
    fiche: ["Ma fiche", "Complète ta fiche (prénom, téléphone) pour qu'on puisse te joindre."],
    alcool: ["SAM", "Tu ne prends pas d'alcool : tu veux bien être SAM pour les autres ?"],
  },
  exemple: ["Gîte : dernier rappel", "Il te reste 3 jours pour payer ta part du gîte !"],
  grise: "Les paiements ne sont pas encore ouverts",
  resume: "Prévenir des ploucs choisis",
});

/* « Présents » à un créneau, et « Doit plus de » un montant : calculés ici, avec leur réglage à côté du filtre. */
let presents = null;
let seuil = "20";
Object.assign(extensions.annonces.calculs, {
  presents: {
    liste: actifs => {
      presents ??= { date: app.etat.sejour.jours[0], creneau: "soir" };
      return presentsA(presents.date, presents.creneau).presents.filter(n => actifs.has(n));
    },
    reglage: () => {
      const jour = el("select", { "aria-label": "Jour" }, app.etat.sejour.jours.map(j => el("option", { value: j, selected: j === presents.date }, jourCourt(j))));
      const creneau = el("select", { "aria-label": "Créneau" }, CRENEAUX.map(c => el("option", { value: c, selected: c === presents.creneau }, LIBELLES[c])));
      jour.onchange = creneau.onchange = () => { presents = { date: jour.value, creneau: creneau.value }; afficher(); };
      return [jour, creneau];
    },
  },
  doit: {
    liste: () => Object.entries(app.etat.annonces.soldes).filter(([, s]) => -s > (lireEuros(seuil) ?? 0)).map(([n]) => n),
    reglage: () => {
      const m = el("input", { inputmode: "decimal", value: seuil, class: "champ-montant court", "aria-label": "Montant en euros" });
      m.onchange = () => { seuil = m.value; afficher(); };
      return [m, el("span", { class: "doux" }, "€")];
    },
  },
});

/* --- Contacter le staff : une page provisoire, en attendant les messages privés ----------------------------------
   Le Discord de gestion, puis les hébergeurs et le staff. Tous les boutons qui devaient ouvrir un message privé
   (Demander à l'hébergeur, Demander un arrangement...) mènent ici. */

extensions.contact.entete = () => el("section", { class: "carte" },
  el("p", {}, "En attendant les messages privés dans l'appli, passe par Discord ou appelle."),
  app.etat.discord_gestion && el("a", { class: "btn principal large", href: app.etat.discord_gestion, target: "_blank", rel: "noopener" },
    icone("fa-discord"), "Ouvrir le Discord"));
extensions.contact.groupes = actifs => {
  const gite = app.etat.gite;
  const lieux = nom => [gite.gite.hebergeur === nom && "Gîte", gite.salle.hebergeur === nom && "Salle"].filter(Boolean).join(" et ");
  return [{ titre: "Hébergeurs", personnes: actifs.filter(c => lieux(c.nom)).map(c => [c, lieux(c.nom)]) }];
};
extensions.contact.aide = "Une notification à tous les staffs, pour une urgence ou un « appelle-moi ». Pas de réponse dans l'appli : le staff te rappelle, ou répond sur Discord.";
