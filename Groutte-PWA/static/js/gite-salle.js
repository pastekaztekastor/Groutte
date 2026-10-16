import { app, el, icone, avatar, envoyer, ouvrirModale, fermerModale, notifier, televerserImage, urlApercu, dateCourte, pluriel, iso, ilYa } from "./commun.js";
import { euros, enSaisie, lireEuros } from "./paiement.js";
import { suivi } from "./creances.js";
import { ouvrirVisionneuse } from "./visionneuse.js";

/* #gite-salle : Staff > Gîte et salle. Les dates limites, le gîte et la salle (montant, hébergeur, ouverture des
   paiements, répartition de la salle), les exemptions, les couchages (lits, plan, salle), le suivi par personne et
   les inscriptions tardives. Les calculs sont ceux de Créances : cette page ne fait que fournir les réglages. */

const LIEU = { gite: "Gîte", salle: "Salle" };
const actifs = () => app.etat.comptes.filter(c => !c.desactive);

function ligne(libelle, ...contenu) {
  return el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, libelle), ...contenu);
}

function dates() {
  const g = app.etat.gite;
  const champ = cle => {
    const e = el("input", { type: "date", value: g[cle] || "" });
    e.onchange = async () => {
      if (cle === "limite_paiement" && e.value && e.value < iso(new Date())
          && !confirm("Cette date est déjà passée : les rappels de fin de délai ne partiront pas. La garder ?")) return (e.value = g[cle] || "");
      envoyer("gite/dates", { [cle]: e.value });
    };
    return e;
  };
  return el("div", { class: "liste-groupee" },
    ligne("Inscription", champ("limite_inscription")),
    ligne("Paiement", champ("limite_paiement")));
}

function blocLieu(quoi) {
  const r = app.etat.gite[quoi];
  const b = app.etat.creances[quoi];
  const ouvert = Boolean(r.ouverture);
  const montant = el("input", { inputmode: "decimal", value: r.montant ? enSaisie(r.montant) : "", placeholder: "0,00", class: "champ-montant", "aria-label": "Montant en euros" });
  montant.onchange = () => {
    const c = lireEuros(montant.value || "0");
    if (c === null) return notifier("Indique un montant valable, par exemple 1400.");
    envoyer("gite/montant", { quoi, montant: c });
  };
  const staffs = actifs().filter(c => c.staff);
  const hebergeur = el("select", { disabled: ouvert, "aria-label": "Hébergeur" },
    el("option", { value: "" }, "Personne"),
    staffs.map(c => el("option", { value: c.nom, selected: c.nom === r.hebergeur }, c.nom)));
  hebergeur.onchange = () => envoyer("gite/hebergeur", { quoi, qui: hebergeur.value });
  const sansMoyen = r.hebergeur && app.etat.gite.sans_moyen?.includes(r.hebergeur);
  const recu = (b.suivi || []).reduce((t, s) => t + s.confirme, 0);
  const manque = (b.suivi || []).filter(s => !s.hebergeur).reduce((t, s) => t + Math.max(0, s.reste), 0);
  const repartition = el("div", { class: "segments large", role: "radiogroup", "aria-label": `Répartition ${quoi === "gite" ? "du gîte" : "de la salle"}` },
    [["nuits", "Au prorata des nuits"], ["egale", "Parts égales"]].map(([v, libelle]) => el("button", {
      type: "button", class: r.repartition === v ? "choisi" : "", role: "radio", "aria-checked": String(r.repartition === v),
      onclick: () => { if (v !== r.repartition && (!ouvert || confirm("Les paiements sont ouverts : les parts vont changer, et les écarts se régleront dans Mes comptes. Continuer ?"))) envoyer("gite/repartition", { quoi, repartition: v }); },
    }, libelle)));
  return [
    el("h2", {}, LIEU[quoi]),
    el("div", { class: "liste-groupee" },
      ligne("Montant", montant, el("span", { class: "doux" }, "€")),
      ligne("Hébergeur", hebergeur),
      sansMoyen && el("p", { class: "alerte-ligne dans-liste" }, icone("info"), `${r.hebergeur} n'a aucun moyen de paiement dans Me rembourser.`),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Répartition"), repartition),
      el("div", { class: "ligne" }, ouvert
        ? el("span", { class: "ligne-texte" }, `Paiements ouverts ${ilYa(r.ouverture)}`)
        : el("button", { class: "btn principal large", type: "button", onclick: () => {
          if (confirm(`Ouvrir les paiements ${quoi === "gite" ? "du gîte" : "de la salle"} ? Les parts seront figées, tout le monde sera prévenu, et ${r.hebergeur || "l'hébergeur"} ne pourra plus changer. C'est définitif.`)) envoyer("gite/ouvrir", { quoi });
        } }, "Ouvrir les paiements"))),
    ouvert && el("section", { class: "carte" },
      el("p", {}, `${euros(r.montant)} avancés · ${euros(recu)} reçus · ${euros(manque)} manquants`),
      el("div", { class: "barre-progres" }, el("span", { style: `width: ${r.montant ? Math.min(100, Math.round(100 * recu / Math.max(1, r.montant - (b.suivi.find(s => s.hebergeur)?.part || 0)))) : 0}%` }))),
  ];
}

/* Ce dont on peut être exempté : le gîte, la salle, et les dépenses pour la communauté (les courses de la réserve). */
const EXEMPTIONS = { gite: "Gîte", salle: "Salle", communaute: "Communauté" };
const DE = { gite: "du gîte", salle: "de la salle", communaute: "des dépenses de la communauté" };

function exemptions() {
  const ex = app.etat.gite.exemptions || {};
  const noms = Object.keys(ex).sort((a, b) => a.localeCompare(b, "fr"));
  const regler = (nom, choix) => envoyer("gite/exemption", { qui: nom, ...choix });
  const ajout = el("select", { "aria-label": "Exempter quelqu'un" }, el("option", { value: "" }, "Ajouter une personne..."),
    actifs().filter(c => !ex[c.nom]).map(c => el("option", { value: c.nom }, c.nom)));
  ajout.onchange = () => ajout.value && regler(ajout.value, { gite: true, salle: true, communaute: false });
  return [
    el("h2", {}, "Exemptions"),
    el("div", { class: "liste-groupee" },
      noms.map(nom => {
        const coche = quoi => {
          const e = el("input", { type: "checkbox", checked: Boolean(ex[nom][quoi]), "aria-label": `${nom} : exempté ${DE[quoi]}` });
          e.onchange = () => regler(nom, { ...ex[nom], [quoi]: e.checked });
          return el("label", { class: "coche-courte" }, EXEMPTIONS[quoi], e);
        };
        return el("div", { class: "ligne ligne-exemption" }, avatar(nom, 28), el("span", { class: "ligne-texte" }, nom),
          el("span", { class: "coches" }, Object.keys(EXEMPTIONS).map(coche)));
      }),
      el("div", { class: "ligne" }, ajout)),
    el("p", { class: "doux petit note" }, "Les exemptions restent anonymes ailleurs : Créances n'en affiche que le nombre. Communauté : la personne ne participe à aucune catégorie des dépenses pour la communauté, à partir des dépenses validées ensuite."),
  ];
}

function reservationsDuLit(lettre) {
  return app.etat.reservations.filter(r => r.lit === lettre).length;
}

function modifierLit(l) {
  const lettre = el("input", { value: l?.lettre || "", maxlength: 3, required: true, placeholder: "A" });
  const description = el("input", { value: l?.description || "", maxlength: 80, placeholder: "Grande chambre du RdC" });
  const places = el("input", { type: "number", min: 1, max: 20, value: l?.places || 1, required: true });
  const supprimer = l && el("button", { class: "btn danger large separe", type: "button", onclick: async () => {
    const n = reservationsDuLit(l.lettre);
    if (!confirm(`Supprimer le lit ${l.lettre} ?${n ? ` ${pluriel(n, "réservation")} sauteront, et les personnes seront prévenues.` : ""}`)) return;
    if (await envoyer("gite/lit/supprimer", { lettre: l.lettre })) fermerModale();
  } }, "Supprimer ce lit");
  ouvrirModale(l ? `Lit ${l.lettre}` : "Ajouter un lit", [
    el("label", { class: "champ" }, "Lettre", lettre),
    el("label", { class: "champ" }, "Description", description),
    el("label", { class: "champ" }, "Places (1 simple, 2 double)", places),
    supprimer,
  ], "Enregistrer", async () => {
    const n = parseInt(places.value, 10);
    if (l && n < l.places) {
      const parNuit = Math.max(0, ...app.etat.sejour.nuits.map(nuit => app.etat.reservations.filter(r => r.lit === l.lettre && r.nuit === nuit).length));
      if (parNuit > n && !confirm("Des places réservées vont sauter (les plus récentes d'abord), et les personnes seront prévenues. Continuer ?")) return false;
    }
    return envoyer("gite/lit", { ancienne: l?.lettre || "", lettre: lettre.value, description: description.value, places: n });
  });
}

function couchages() {
  const g = app.etat.gite;
  const planEntree = el("input", { type: "file", accept: "image/*", class: "cache" });
  planEntree.onchange = async () => {
    const fichier = planEntree.files[0];
    planEntree.value = "";
    if (!fichier) return;
    notifier("Envoi du plan...", true);
    const id = await televerserImage({ type: "image" }, fichier);
    if (id && await envoyer("gite/plan", { image: id })) notifier("Plan enregistré.", true);
  };
  const salle = el("input", { type: "checkbox", checked: g.salle_couchage });
  salle.onchange = () => {
    const n = reservationsDuLit("salle");
    if (!salle.checked && n && !confirm(`${pluriel(n, "réservation")} de la salle sauteront, et les personnes seront prévenues. Continuer ?`)) { salle.checked = true; return; }
    envoyer("gite/salle-couchage", { actif: salle.checked });
  };
  return [
    el("h2", {}, "Couchages"),
    el("div", { class: "liste-groupee" },
      g.lits.map(l => el("button", { type: "button", class: "ligne entree", onclick: () => modifierLit(l) },
        el("strong", { class: "lettre-lit" }, l.lettre), el("span", { class: "ligne-texte" }, l.description || el("span", { class: "doux" }, "Sans description")),
        el("span", { class: "ligne-valeur" }, pluriel(l.places, "place")), icone("chevron-droite"))),
      el("button", { type: "button", class: "ligne entree", onclick: () => modifierLit(null) }, icone("plus"), el("span", { class: "ligne-texte" }, "Ajouter un lit"))),
    el("p", { class: "note" }, `Capacité du gîte : ${pluriel(g.capacite, "place")}.`),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" },
        g.plan ? el("button", { type: "button", class: "miniature-plan", onclick: () => ouvrirVisionneuse([g.plan], 0) }, el("img", { src: urlApercu(g.plan), alt: "Plan du gîte" }))
          : el("span", { class: "ligne-texte doux" }, "Pas de plan"),
        el("span", { class: "ligne-texte" }, ""),
        el("label", { class: "discret" }, g.plan ? "Remplacer" : "Envoyer le plan", planEntree),
        g.plan && el("button", { type: "button", class: "discret danger", onclick: () => { if (confirm("Retirer le plan ?")) envoyer("gite/plan", { image: "" }); } }, "Retirer")),
      el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, "La salle sert aussi de couchage"), salle)),
    el("p", { class: "doux petit note" }, "Le plan : une image où les lettres des lits sont déjà dessinées. La literie fournie arrivera avec la page Literie."),
  ];
}

function inscriptionsTardives() {
  const tardifs = app.etat.gite.tardifs || [];
  if (!tardifs.length) return null;
  return [el("h2", {}, "Inscriptions tardives"), el("div", { class: "liste-groupee" }, tardifs.map(t => el("div", { class: "ligne" },
    avatar(t.nom, 32), el("span", { class: "ligne-texte" }, t.nom, el("span", { class: "doux petit" }, `inscrit le ${dateCourte(t.cree.slice(0, 10))}`)),
    el("button", { class: "btn principal petit-bouton", type: "button", onclick: () => envoyer("gite/accepter", { qui: t.nom }) }, "Accepter l'inscription"))))];
}

export function vueGiteSalle() {
  const cr = app.etat.creances;
  return [
    inscriptionsTardives(),
    el("h2", {}, "Dates limites"),
    dates(),
    blocLieu("gite"),
    blocLieu("salle"),
    exemptions(),
    couchages(),
    ["gite", "salle"].map(q => cr[q].suivi && [el("h2", {}, `Suivi : ${LIEU[q].toLowerCase()}`), suivi(q, cr[q])]),
  ];
}

export function resumeGiteSalle() {
  const n = app.etat.gite.tardifs?.length || 0;
  return n ? `${pluriel(n, "inscription")} à accepter` : "Montants, hébergeurs, lits";
}
