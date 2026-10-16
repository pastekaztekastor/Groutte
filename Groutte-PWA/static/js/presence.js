import { app, el, icone, avatar, envoyer, ouvrirFeuille, afficher, dateCourte, jourCourt, pluriel, lienContact } from "./commun.js";
import { euros } from "./paiement.js";
import { CRENEAUX, LIBELLES, creneauxDe, presenceDe, presentsA, venants } from "./sejour.js";

/* #presence : Gîte > Présence. Mes dates (arrivée et départ, chacun date + créneau), l'emploi du temps du groupe, et
   le nombre de personnes nuit par nuit face à la capacité du gîte. Personne ne saisit les dates d'un autre. */

let saisieDates = null;   // { arrivee, depart } en cours de choix (un point complet s'enregistre tout de suite)

const AIDE = "L'arrivée est ton premier créneau sur place, le départ ton dernier. Exemple : arrivée le 28 au soir, départ "
  + "le 31 au matin, ça fait le dîner du 28, les nuits du 28, du 29 et du 30, et tous les repas jusqu'au petit-déjeuner du 31.";

const ordre = p => `${p.date}/${CRENEAUX.indexOf(p.creneau)}`;
const ouverts = () => ["gite", "salle"].some(q => app.etat.gite[q].ouverture);

function choixPoint(cle, point) {
  const jours = app.etat.sejour.jours;
  const date = el("select", { "aria-label": cle === "arrivee" ? "Date d'arrivée" : "Date de départ" },
    !point.date && el("option", { value: "" }, "Date"),
    jours.map(j => el("option", { value: j, selected: j === point.date }, jourCourt(j))));
  const dernier = point.date === jours[jours.length - 1];
  const creneau = el("select", { "aria-label": cle === "arrivee" ? "Créneau d'arrivée" : "Créneau de départ" },
    !point.creneau && el("option", { value: "" }, "Créneau"),
    CRENEAUX.filter(c => !(dernier && c === "nuit")).map(c => el("option", { value: c, selected: c === point.creneau }, LIBELLES[c])));
  const changer = () => {
    saisieDates[cle] = { date: date.value, creneau: creneau.value };
    if (saisieDates[cle].date === jours[jours.length - 1] && saisieDates[cle].creneau === "nuit") saisieDates[cle].creneau = "soir";
    enregistrer();
  };
  date.onchange = changer;
  creneau.onchange = changer;
  return el("div", { class: "ligne choix-point" }, el("span", { class: "ligne-texte" }, cle === "arrivee" ? "Arrivée" : "Départ"), date, creneau);
}

async function enregistrer() {
  const { arrivee, depart } = saisieDates;
  const complet = p => p && p.date && p.creneau;
  if (!complet(arrivee) || !complet(depart)) return afficher();
  if (ordre(depart) < ordre(arrivee)) { afficher(); return; }
  const moi = presenceDe(app.moi);
  const avant = creneauxDe(moi).filter(([, c]) => c === "nuit").length;
  const apres = creneauxDe({ arrivee, depart }).filter(([, c]) => c === "nuit").length;
  if (ouverts() && moi && apres < avant
      && !confirm("Les paiements sont ouverts : ce qui est payé est payé, sans remboursement. Retirer ces nuits quand même ?")) {
    saisieDates = null;
    return afficher();
  }
  if (await envoyer("presence", { arrivee, depart })) saisieDates = null;
}

async function jeNeViensPas() {
  const message = ouverts()
    ? "Les paiements sont ouverts : ce qui est payé est payé, sans remboursement. Tu ne viens plus ?"
    : "Effacer tes dates ? Tu ne compteras plus nulle part. Tu pourras revenir en saisissant de nouvelles dates.";
  if (confirm(message) && await envoyer("presence/absent")) saisieDates = null;
}

/* Ce que donnent mes dates : nuits, repas, et ma part estimée (ou figée) du gîte. */
function resultat() {
  const moi = presenceDe(app.moi);
  const creneaux = creneauxDe(moi);
  if (!creneaux.length) return el("p", { class: "doux petit" }, "Tu n'as pas encore de dates : tu ne comptes nulle part.");
  const nuits = creneaux.filter(([, c]) => c === "nuit").length;
  const repas = creneaux.length - nuits;
  const g = app.etat.creances.gite;
  const gite = app.etat.gite.gite;
  let part;
  if (g.exempte) part = el("p", {}, "Exempté du gîte.");
  else if (!gite.montant) part = el("p", { class: "doux petit" }, "Le prix du gîte n'est pas encore fixé.");
  else if (g.hebergeur) part = el("p", { class: "doux petit" }, "Tu es l'hébergeur du gîte : ta part réduit ce que tu as avancé.");
  else if (!gite.ouverture) {
    const prix = gite.repartition === "nuits" && g.nuitees ? Math.round(gite.montant / g.nuitees) : 0;
    part = [el("p", {}, `Gîte : environ ${euros(g.part)}`, prix > 0 && el("span", { class: "doux" }, ` (${euros(prix)} la nuit)`)),
      el("p", { class: "doux petit" }, "Estimation : elle baisse si d'autres s'inscrivent, jusqu'à l'ouverture des paiements.")];
  } else {
    part = [el("p", {}, `Gîte : ta part figée est de ${euros(g.part)}.`),
      g.retard > 0 && el("p", { class: "doux petit" }, `Tes nuits en plus depuis l'ouverture des paiements : tu dois ${euros(g.retard)} à ceux qui ont payé le gîte (Mes comptes).`)];
  }
  return [el("p", { class: "resultat-dates" }, `${pluriel(nuits, "nuit")} · ${repas} repas`), part];
}

function mesDates() {
  if (app.etat.gite.tardif) {
    return el("section", { class: "carte" },
      el("p", {}, "Tu t'es inscrit après la date limite : l'hébergeur doit d'abord accepter ton inscription pour que tu puisses saisir tes dates."),
      el("a", { class: "btn principal large", href: "#contact" }, "Demander à l'hébergeur"));
  }
  const moi = presenceDe(app.moi);
  saisieDates ??= { arrivee: moi?.arrivee || {}, depart: moi?.depart || {} };
  const inverse = saisieDates.arrivee.date && saisieDates.depart.date && saisieDates.arrivee.creneau && saisieDates.depart.creneau
    && ordre(saisieDates.depart) < ordre(saisieDates.arrivee);
  return [
    el("div", { class: "liste-groupee" }, choixPoint("arrivee", saisieDates.arrivee), choixPoint("depart", saisieDates.depart)),
    inverse && el("p", { class: "alerte-ligne" }, icone("info"), "Le départ est avant l'arrivée."),
    moi?.hors && el("p", { class: "alerte-ligne" }, icone("info"), "Les dates du séjour ont changé : vérifie tes dates."),
    el("p", { class: "doux petit note" }, AIDE),
    el("section", { class: "carte" }, resultat(),
      moi && el("div", { class: "rangee a-droite" }, el("button", { class: "btn danger", type: "button", onclick: jeNeViensPas }, "Je ne viens pas"))),
  ];
}

/* La liste des présents d'un créneau, avec ceux qui arrivent et ceux qui repartent. */
function detailCreneau(jour, creneau) {
  const { presents, arrivent, partent } = presentsA(jour, creneau);
  ouvrirFeuille(`${jourCourt(jour)}, ${LIBELLES[creneau].toLowerCase()}`, presents.length
    ? el("div", { class: "liste-groupee" }, presents.map(nom => el("a", { class: "ligne", href: lienContact(nom) },
      avatar(nom, 32), el("span", { class: "ligne-texte" }, nom),
      arrivent.includes(nom) && el("span", { class: "badge" }, "arrive"),
      partent.includes(nom) && el("span", { class: "badge" }, "repart"))))
    : el("p", { class: "doux" }, "Personne."));
}

function emploiDuTemps() {
  const jours = app.etat.sejour.jours;
  const capacite = app.etat.gite.capacite;
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-groupe" },
    el("thead", {}, el("tr", {}, el("th", {}, ""), CRENEAUX.map(c => el("th", {}, LIBELLES[c])))),
    el("tbody", {}, jours.map((j, i) => el("tr", {},
      el("th", { scope: "row" }, dateCourte(j)),
      CRENEAUX.map(c => {
        if (i === jours.length - 1 && c === "nuit") return el("td", {}, "–");
        const n = presentsA(j, c).presents.length;
        const trop = c === "nuit" && capacite && n > capacite;
        return el("td", {}, el("button", {
          type: "button", class: "case" + (trop ? " trop" : "") + (n ? "" : " vide"),
          "aria-label": `${dateCourte(j)} ${LIBELLES[c]} : ${n} présent${n > 1 ? "s" : ""}`,
          onclick: () => detailCreneau(j, c),
        }, String(n)));
      }))))));
}

function alertesNuits() {
  const capacite = app.etat.gite.capacite;
  if (!capacite) return el("p", { class: "doux petit note" }, "Le staff n'a pas encore déclaré les lits : la capacité du gîte est inconnue.");
  const trop = app.etat.sejour.nuits.map(n => [n, presentsA(n, "nuit").presents.length]).filter(([, k]) => k > capacite);
  return [
    el("p", { class: "doux petit note" }, `Capacité du gîte : ${pluriel(capacite, "couchage")}. Au-delà, on dort par terre.`),
    trop.map(([n, k]) => el("p", { class: "alerte-ligne" }, icone("info"), `Nuit du ${dateCourte(n)} : ${k} personnes pour ${capacite} couchages.`)),
  ];
}

export function vuePresence() {
  return [
    el("h2", {}, "Mes dates"),
    mesDates(),
    el("h2", {}, `Le groupe (${pluriel(venants().length, "plouc")})`),
    emploiDuTemps(),
    alertesNuits(),
    el("p", { class: "note" }, el("a", { href: "#faq/prix-deux-temps" }, "Comment ça marche ?")),
  ];
}

export function resumePresence() {
  if (app.etat.gite.tardif) return "Inscription à faire accepter";
  const nuits = creneauxDe(presenceDe(app.moi)).filter(([, c]) => c === "nuit").length;
  return presenceDe(app.moi) ? `${pluriel(nuits, "nuit")} · ${venants().length} ploucs` : "Dis quand tu viens";
}
