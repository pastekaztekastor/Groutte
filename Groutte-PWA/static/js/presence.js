import { app, el, icone, avatar, qui, compte, couleurTheme, envoyer, ouvrirFeuille, afficher, dateCourte, jourCourt, pluriel, lienContact, iso } from "./commun.js";
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
    : presenceDe(app.moi) ? "Effacer tes dates ? Tu ne compteras plus nulle part. Tu pourras revenir en saisissant de nouvelles dates."
      : "Tu ne viens pas ? C'est noté, et le staff ne te relancera plus pour tes dates. Tu pourras revenir en saisissant des dates.";
  if (confirm(message) && await envoyer("presence/absent")) saisieDates = null;
}

/* Ce que donnent mes dates : nuits, repas, et ma part estimée (ou figée) du gîte. */
function resultat() {
  const moi = presenceDe(app.moi);
  const creneaux = creneauxDe(moi);
  if (!creneaux.length) return el("p", { class: "doux petit" }, app.etat.ne_vient_pas
    ? "Tu as dit que tu ne viens pas : tu ne comptes nulle part. Saisis des dates si tu changes d'avis."
    : "Tu n'as pas encore de dates : tu ne comptes nulle part.");
  const nuits = creneaux.filter(([, c]) => c === "nuit").length;
  const repas = creneaux.length - nuits;
  // Ce que ça coûte (gîte et salle) : dans Créances, pour ne pas le dire deux fois.
  return [el("p", { class: "resultat-dates" }, `${pluriel(nuits, "nuit")} · ${repas} repas`),
    el("p", { class: "petit" }, el("a", { href: "#creances" }, "Ce que tu paies pour le gîte et la salle"))];
}

/* Inscription tardive : le bouton prévient l'hébergeur (ou le staff), puis passe au vert pour la journée. */
function demandeTardive() {
  const envoyee = app.etat.gite.demande_tardive.slice(0, 10) === iso(new Date());
  return el("section", { class: "carte" },
    el("p", {}, "Tu t'es inscrit après la date limite : l'hébergeur doit d'abord accepter ton inscription pour que tu puisses saisir tes dates."),
    envoyee
      ? el("button", { class: "btn large envoyee", type: "button", disabled: true }, icone("coche"), "Demande envoyée")
      : el("button", { class: "btn principal large", type: "button", onclick: () => envoyer("gite/demander") }, "Demander à l'hébergeur"));
}

export function mesDates() {
  if (app.etat.gite.tardif) return demandeTardive();
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
      !app.etat.ne_vient_pas && el("div", { class: "rangee a-droite" }, el("button", { class: "btn danger", type: "button", onclick: jeNeViensPas }, "Je ne viens pas"))),
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

/* L'emploi du temps du groupe : une colonne par personne (dans l'ordre d'arrivée), une ligne par créneau, et une
   bande de sa couleur de son arrivée à son départ. Le jour est écrit de haut en bas sur ses lignes ; toucher un
   créneau donne la liste de ses présents. En défilant, les jours et les créneaux restent à gauche (CSS), les photos
   sous la barre du haut (collerPhotos). */
/* Le tableau défile de côté dans sa boîte : position: sticky ne peut donc pas coller ses photos en haut de la page.
   On les décale à la main, à chaque défilement, juste sous la barre du haut et sans sortir du tableau. */
function collerPhotos() {
  const tete = document.querySelector(".tableau-bandes thead");
  if (!tete) return;
  const nav = document.getElementById("barre-nav");
  const haut = nav && !nav.hidden ? nav.getBoundingClientRect().bottom : 0;
  const table = tete.parentElement.getBoundingClientRect();
  const decalage = Math.max(0, Math.min(haut - table.top, table.height - tete.offsetHeight));
  for (const th of tete.querySelectorAll("th")) th.style.transform = decalage ? `translateY(${decalage}px)` : "";
}
addEventListener("scroll", collerPhotos, { passive: true });
addEventListener("resize", collerPhotos);

function emploiDuTemps() {
  const jours = app.etat.sejour.jours;
  const capacite = app.etat.gite.capacite;
  const gens = venants().sort((a, b) => ordre(presenceDe(a).arrivee).localeCompare(ordre(presenceDe(b).arrivee)) || a.localeCompare(b));
  const lettre = j => new Date(j + "T12:00").toLocaleDateString("fr-FR", { weekday: "short" }).charAt(0).toUpperCase();
  const lignes = jours.flatMap((j, i) => {
    const creneaux = CRENEAUX.filter(c => !(i === jours.length - 1 && c === "nuit"));
    return creneaux.map((c, k) => {
      const { presents, arrivent, partent } = presentsA(j, c);
      const trop = c === "nuit" && capacite && presents.length > capacite;
      return el("tr", { class: k === 0 ? "debut-jour" : null },
        k === 0 && el("th", { scope: "rowgroup", rowspan: creneaux.length, class: "jour-vertical" }, el("span", {}, `${lettre(j)} ${dateCourte(j)}`)),
        el("th", { scope: "row", class: "creneau" }, el("button", {
          type: "button", class: "case-creneau" + (trop ? " trop" : ""),
          "aria-label": `${dateCourte(j)} ${LIBELLES[c]} : ${presents.length} présent${presents.length > 1 ? "s" : ""}`,
          onclick: () => detailCreneau(j, c),
        }, LIBELLES[c], el("span", { class: "compte-creneau" }, String(presents.length)))),
        gens.map(nom => {
          if (!presents.includes(nom)) return el("td", {});
          const bande = el("span", { class: "bande" + (arrivent.includes(nom) ? " arrive" : "") + (partent.includes(nom) ? " repart" : "") });
          bande.style.setProperty("--couleur", couleurTheme(compte(nom)?.couleur));
          return el("td", {}, bande);
        }));
    });
  });
  if (!gens.length) return el("p", { class: "doux" }, "Personne n'a encore donné ses dates.");
  requestAnimationFrame(collerPhotos);   // la page vient d'être redessinée : on recale les photos
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-bandes" },
    el("thead", {}, el("tr", {}, el("th", { colspan: 2 }, ""), gens.map(nom => el("th", { scope: "col" }, qui(nom, true))))),
    el("tbody", {}, lignes)));
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
  return presenceDe(app.moi) ? `${pluriel(nuits, "nuit")} · ${venants().length} ploucs` : app.etat.ne_vient_pas ? "Je ne viens pas" : "Dis quand tu viens";
}
