import { app, el, icone, avatar, compte, envoyer, saisie, oublier, notifier, dateCourte, pluriel, lienContact, ilYa } from "./commun.js";
import { euros, enSaisie, lireEuros, moyensPaiement, moyenRenseigne, MOYENS } from "./paiement.js";

/* #creances : Budget > Créances gîte et salle. Ma part, ce que j'ai déclaré, le reste à payer, et le calcul.
   #payer/<gite|salle> : les moyens de paiement de l'hébergeur, puis « J'ai payé X € ».
   Pour l'hébergeur, en plus : ce qu'il a avancé et reçu, le suivi de chacun, et les paiements à confirmer. */

const LIEU = { gite: "Gîte", salle: "Salle" };
const DU = { gite: "du gîte", salle: "de la salle" };
const numero = valeur => (valeur || "").replace(/[^\d+]/g, "");

function barre(fait, total) {
  const pourcent = total > 0 ? Math.min(100, Math.round(100 * fait / total)) : 0;
  return el("div", { class: "barre-progres", role: "progressbar", "aria-valuenow": pourcent, "aria-valuemin": 0, "aria-valuemax": 100 },
    el("span", { style: `width: ${pourcent}%` }));
}

/* L'hébergeur (ou les deux, s'ils sont différents) : photo, nom, appeler, et le lien vers Contacter le staff. */
function contactHebergeurs() {
  const g = app.etat.gite;
  const noms = [...new Set([g.gite.hebergeur, g.salle.hebergeur].filter(Boolean))];
  if (!noms.length) return el("p", { class: "doux note" }, "Le staff n'a pas encore désigné d'hébergeur.");
  return el("div", { class: "liste-groupee" }, noms.map(nom => {
    const tel = numero(compte(nom)?.telephone);
    const pour = [g.gite.hebergeur === nom && "gîte", g.salle.hebergeur === nom && "salle"].filter(Boolean).join(" et ");
    return el("div", { class: "ligne ligne-perso" },
      el("a", { class: "qui-lien", href: lienContact(nom) }, avatar(nom, 40),
        el("span", { class: "ligne-texte" }, el("strong", {}, nom), el("span", { class: "doux petit" }, `Hébergeur : ${pour}`))),
      el("span", { class: "boutons-contact" },
        tel && el("a", { class: "btn petit-bouton", href: "tel:" + tel }, icone("fa-appeler"), "Appeler"),
        el("a", { class: "btn petit-bouton", href: "#contact" }, "Contact")));
  }));
}

/* Le bloc Gîte ou Salle, vu par un plouc. */
function bloc(quoi) {
  const b = app.etat.creances[quoi];
  const reglage = app.etat.gite[quoi];
  const titre = el("div", { class: "entete-bloc" }, el("h3", {}, LIEU[quoi]), el("strong", {}, b.part ? euros(b.part) : ""));
  if (b.exempte) return el("section", { class: "carte" }, titre, el("p", {}, "Tu es exempté."));
  if (!reglage.montant) return el("section", { class: "carte" }, titre, el("p", { class: "doux" }, "Le montant n'est pas encore fixé."));
  if (b.hebergeur) return el("section", { class: "carte" }, titre,
    el("p", { class: "doux petit" }, `Tu es l'hébergeur : ta part${b.part ? ` (${euros(b.part)})` : ""} réduit simplement ce que tu as avancé.`));
  if (!reglage.ouverture) return el("section", { class: "carte" }, titre,
    el("p", { class: "doux petit" }, b.part ? "Montant indicatif : il bouge encore avec les inscriptions. Tu pourras payer à l'ouverture des paiements." : "Tu n'as pas encore de part : saisis tes dates dans Présence."));
  if (!b.part) return el("section", { class: "carte" }, titre,
    b.retard
      ? el("p", {}, `Tu es arrivé après l'ouverture des paiements : ta part ${DU[quoi]} (${euros(b.retard)}) est une dette envers les autres ploucs, dans `, el("a", { href: "#comptes" }, "Mes comptes"), ".")
      : el("p", { class: "doux" }, "Tu n'as pas de part à payer."));
  const regle = b.confirme + b.reporte;
  const lignes = [];
  if (b.reste <= 0 && !b.declare) lignes.push(el("p", { class: "succes" }, b.reporte ? "Réglé (avec un report dans Mes comptes)." : "Payé, merci !"));
  else lignes.push(barre(regle, b.part), el("p", {}, `Payé : ${euros(b.confirme)} · reste ${euros(Math.max(0, b.reste))}`));
  if (b.reste < 0) lignes.push(el("p", { class: "doux petit" }, `Trop-payé de ${euros(-b.reste)} : un avoir dans `, el("a", { href: "#comptes" }, "Mes comptes"), "."));
  if (b.declare) lignes.push(el("p", { class: "doux petit" }, `${euros(b.declare)} déclarés, en attente de confirmation par ${app.etat.gite[quoi].hebergeur}.`));
  if (b.reporte) lignes.push(el("p", { class: "doux petit" }, `Report accepté : ${euros(b.reporte)} passent dans `, el("a", { href: "#comptes" }, "Mes comptes"), "."));
  if (b.retard) lignes.push(el("p", { class: "doux petit" }, `Tes nuits en plus depuis l'ouverture : ${euros(b.retard)} à régler dans `, el("a", { href: "#comptes" }, "Mes comptes"), "."));
  const resteAPayer = b.reste - b.declare;
  return el("section", { class: "carte" }, titre, lignes,
    resteAPayer > 0 && el("div", { class: "rangee a-droite" },
      app.etat.creances.limite_passee && el("a", { class: "btn", href: "#contact" }, "Demander un arrangement"),
      el("a", { class: "btn principal", href: "#payer/" + quoi }, "Payer")));
}

/* Le calcul, appliqué aux données. */
function methode() {
  const c = app.etat.creances, g = app.etat.gite;
  const gite = c.gite, salle = c.salle;
  const prix = gite.nuitees ? Math.round(g.gite.montant / gite.nuitees) : 0;
  const egale = g.salle.repartition === "egale";
  return el("section", { class: "carte methode" },
    g.gite.repartition === "egale" ? [
      el("p", {}, "Le gîte se partage à parts égales entre ceux qui viennent, quelle que soit la durée."),
      g.gite.montant > 0 && gite.nb_parts > 0 && el("p", { class: "calcul" }, `${euros(g.gite.montant)} / ${pluriel(gite.nb_parts, "plouc")} = ${euros(Math.round(g.gite.montant / gite.nb_parts))}`),
    ] : [
      el("p", {}, "Le gîte, c'est l'endroit où l'on dort : chacun paie ses nuits. Plus on est nombreux, moins la nuitée coûte cher."),
      g.gite.montant > 0 && gite.nuitees > 0 && [
        el("p", { class: "calcul" }, `${euros(g.gite.montant)} / ${pluriel(gite.nuitees, "nuitée")} = ${euros(prix)} la nuitée`),
        gite.part > 0 && !gite.hebergeur && el("p", { class: "calcul" }, `${euros(prix)} × ${pluriel(gite.nuits_figees ?? c.mes_nuits, "nuit")} = ${euros(gite.part)} (arrondi au centime)`)],
    ],
    el("p", {}, egale
      ? "La salle, c'est la vie de la semaine : elle se partage à parts égales entre ceux qui viennent, quelle que soit la durée."
      : "La salle se répartit au prorata des nuits."),
    g.salle.montant > 0 && salle.nb_parts > 0 && el("p", { class: "calcul" }, egale
      ? `${euros(g.salle.montant)} / ${pluriel(salle.nb_parts, "plouc")} = ${euros(Math.round(g.salle.montant / salle.nb_parts))}`
      : `${euros(g.salle.montant)} / ${pluriel(salle.nuitees, "nuitée")} = ${euros(salle.nuitees ? Math.round(g.salle.montant / salle.nuitees) : 0)} la nuitée`),
    el("p", { class: "doux petit" }, "Les centimes en trop vont à l'hébergeur. À l'ouverture des paiements, les parts sont figées."));
}

/* Ce que voit l'hébergeur en plus : avancé, reçu, manquant ; le suivi ; les paiements à confirmer. */
function vueHebergeur(quoi) {
  const b = app.etat.creances[quoi];
  if (!b.suivi || !b.hebergeur) return null;
  const manque = b.suivi.filter(s => !s.hebergeur).reduce((t, s) => t + Math.max(0, s.reste), 0);
  return [
    el("h2", {}, `${LIEU[quoi]} : je suis l'hébergeur`),
    el("section", { class: "carte" },
      el("p", {}, `J'ai avancé ${euros(b.avance)}, j'ai reçu ${euros(b.recu)}, il manque ${euros(manque)}.`),
      barre(b.recu, b.avance - (b.part || 0))),
    b.a_confirmer.length > 0 && [el("h3", { class: "sous-titre" }, "À confirmer"),
      el("div", { class: "liste-groupee" }, b.a_confirmer.map(p => el("div", { class: "ligne" },
        avatar(p.nom, 32), el("span", { class: "ligne-texte" }, `${p.nom} : ${euros(p.montant)}`, el("span", { class: "doux petit" }, ilYa(p.quand))),
        el("button", { class: "btn petit-bouton", type: "button", onclick: () => { if (confirm(`Tu n'as rien reçu de ${p.nom} ? Le paiement sera annulé.`)) envoyer("creances/confirmer", { id: p.id, recu: false }); } }, "Refuser"),
        el("button", { class: "btn principal petit-bouton", type: "button", onclick: () => envoyer("creances/confirmer", { id: p.id, recu: true }) }, "Confirmer"))))],
    suivi(quoi, b),
  ];
}

/* Le suivi par plouc (aussi dans Staff > Gîte et salle) : part, payé, reste ; « Accepter le report » après la date limite. */
export function suivi(quoi, b) {
  const lignes = b.suivi.filter(s => !s.hebergeur);
  if (!lignes.length) return el("p", { class: "doux note" }, "Personne n'a encore de part.");
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-suivi" },
    el("thead", {}, el("tr", {}, ["Nom", "Nuits", "Part", "Payé", "Reste", ""].map(t => el("th", {}, t)))),
    el("tbody", {}, lignes.sort((a, z) => z.reste - a.reste).map(s => el("tr", {},
      el("td", {}, s.nom), el("td", {}, String(s.nuits)), el("td", {}, euros(s.part)),
      el("td", {}, euros(s.confirme), s.declare > 0 && el("span", { class: "doux petit" }, ` (+${euros(s.declare)} en attente)`)),
      el("td", { class: s.reste > 0 ? "du" : "" }, euros(s.reste), s.reporte > 0 && el("span", { class: "doux petit" }, ` (report ${euros(s.reporte)})`)),
      el("td", {}, s.reste > 0 && app.etat.creances.limite_passee && el("button", {
        class: "discret", type: "button",
        onclick: () => { if (confirm(`Reporter les ${euros(s.reste)} de ${s.nom} dans Mes comptes ? Ils deviennent une dette envers l'hébergeur.`)) envoyer("creances/reporter", { qui: s.nom, quoi }); },
      }, "Accepter le report")))))));
}

export function vueCreances() {
  const c = app.etat.creances, g = app.etat.gite;
  const limite = g.limite_paiement;
  return [
    contactHebergeurs(),
    limite && el("p", { class: "note" + (c.limite_passee ? " alerte-texte" : "") }, `À payer avant le ${dateCourte(limite)}/${limite.slice(0, 4)}.`),
    bloc("gite"),
    bloc("salle"),
    vueHebergeur("gite"),
    vueHebergeur("salle"),
    el("h2", {}, "Mes données"),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Mes nuits"), el("span", { class: "ligne-valeur" },
        c.gite.nuits_figees !== null && c.gite.nuits_figees !== c.mes_nuits ? `${c.gite.nuits_figees} à l'ouverture, ${c.mes_nuits} aujourd'hui` : String(c.mes_nuits))),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Exempté"), el("span", { class: "ligne-valeur" },
        [c.gite.exempte && "du gîte", c.salle.exempte && "de la salle", g.exempte_communaute && "des dépenses de la communauté"].filter(Boolean).join(", ") || "non"))),
    el("h2", {}, "Les données générales"),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Total des nuitées"), el("span", { class: "ligne-valeur" }, String(c.total_nuitees))),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Ploucs qui viennent"), el("span", { class: "ligne-valeur" }, String(c.nb_ploucs))),
      (g.nb_exemptes.gite > 0 || g.nb_exemptes.salle > 0) && el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Exemptés"),
        el("span", { class: "ligne-valeur" }, `${g.nb_exemptes.gite} au gîte, ${g.nb_exemptes.salle} à la salle`)),
      g.nb_exemptes.communaute > 0 && el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Exemptés des dépenses de la communauté"),
        el("span", { class: "ligne-valeur" }, String(g.nb_exemptes.communaute))),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Gîte"), el("span", { class: "ligne-valeur" }, euros(g.gite.montant))),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Salle"), el("span", { class: "ligne-valeur" }, euros(g.salle.montant)))),
    el("h2", {}, "La méthode de calcul"),
    methode(),
    el("p", { class: "note" }, el("a", { href: "#faq/part-gite" }, "Comment ça marche ?")),
  ];
}

/* --- Payer (Créances) et Rembourser (Mes comptes) : la même page ---------------------------------------- */

/* Les moyens de paiement de `nom`, puis le formulaire « J'ai payé X € ». `declarer(montant)` envoie la déclaration. */
export function pagePaiement({ nom, montant, libelle, cle, bouton, declarer, avertir }) {
  const p = app.etat.paiements_de?.[nom] || {};
  const renseignes = Object.keys(MOYENS).filter(m => moyenRenseigne(p, m));
  const champ = saisie(cle, { valeur: enSaisie(montant), inputmode: "decimal", autocomplete: "off", "aria-label": "Montant en euros" });
  return [
    el("section", { class: "carte entete-paiement" }, avatar(nom, 48), el("div", {}, el("strong", {}, nom), el("p", { class: "doux" }, `${euros(montant)} à payer`))),
    el("p", { class: "doux petit note" }, "L'appli ne fait pas de virement : paie avec un de ces moyens, puis déclare-le en bas de la page."),
    renseignes.length
      ? el("div", { class: "moyens" }, moyensPaiement(nom, p, montant, libelle))
      : el("section", { class: "carte" }, el("p", {}, `Demande-lui comment la rembourser : ${nom} n'a renseigné aucun moyen de paiement.`),
        el("a", { class: "btn large", href: lienContact(nom) }, `Contacter ${nom}`)),
    el("h2", {}, "C'est fait ?"),
    el("form", {
      class: "carte",
      onsubmit: async ev => {
        ev.preventDefault();
        const centimes = lireEuros(champ.value);
        if (!centimes) return notifier("Indique un montant valable, par exemple 12,50.");
        if (avertir && centimes > montant && !confirm(`${euros(centimes)}, c'est plus que les ${euros(montant)} que tu dois. Le surplus inversera la dette. Continuer ?`)) return;
        if (await declarer(centimes)) { oublier(cle); history.back(); }
      },
    },
    el("label", { class: "champ" }, "Montant payé (en euros)", champ),
    el("button", { class: "btn principal large", type: "submit" }, bouton)),
  ];
}

export function vuePayer(quoi) {
  const b = app.etat.creances[quoi];
  const heb = app.etat.gite[quoi]?.hebergeur;
  if (!b || !heb || !app.etat.gite[quoi].ouverture || b.reste - b.declare <= 0) {
    return [el("p", { class: "doux" }, "Rien à payer ici pour l'instant."), el("a", { class: "btn large", href: "#creances" }, "Retour aux créances")];
  }
  return pagePaiement({
    nom: heb, montant: b.reste - b.declare, cle: "payer." + quoi, bouton: "J'ai payé",
    libelle: `Groutte - ${LIEU[quoi]} - ${app.moi}`,
    declarer: centimes => envoyer("creances/payer", { quoi, montant: centimes }),
  });
}

export const titrePayer = quoi => quoi === "salle" ? "Payer la salle" : "Payer le gîte";

export function resumeCreances() {
  const c = app.etat.creances;
  const reste = ["gite", "salle"].reduce((t, q) => t + (app.etat.gite[q].ouverture && !c[q].hebergeur ? Math.max(0, c[q].reste) : 0), 0);
  if (reste) return `Reste ${euros(reste)} à payer`;
  const indicatif = ["gite", "salle"].reduce((t, q) => t + (c[q].hebergeur ? 0 : c[q].part), 0);
  return indicatif ? `Ma part : ${euros(indicatif)}` : "Gîte et salle";
}

/* Pastille : des paiements à confirmer, pour l'hébergeur. */
export const aConfirmer = () => ["gite", "salle"].reduce((t, q) => t + (app.etat.creances[q].a_confirmer?.length || 0), 0);
