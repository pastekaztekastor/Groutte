import { app, el, icone, avatar, compte, estStaff, nombreNouveautes, jourCourt, pluriel, iso } from "./commun.js";
import { euros } from "./paiement.js";
import { LIBELLES, presenceDe, nuitsDe, repasPris, venants, commence, mangeurs } from "./sejour.js";
import { aConfirmerComptes } from "./mes-comptes.js";
import { aConfirmer } from "./creances.js";
import { resumeLits } from "./lits.js";
import { nonLus } from "./pings.js";
import { enAttente } from "./validation.js";

/* # : l'accueil, des widgets qui montrent l'essentiel d'un coup d'œil : le compte à rebours, qui vient, mes nuits, le
   prochain repas, mon solde, le gîte et la salle, les nouveautés, ce qui m'attend, et pour le staff ce qui est à
   traiter. Chaque widget s'ouvre sur sa page. Les chiffres viennent de l'état général : rien n'est recalculé ici. */

/* Un widget : une carte cliquable, un petit titre avec son icône, puis son contenu. `large` : toute la largeur. */
function widget(lien, nomIcone, titre, contenu, { large = false, classe = "" } = {}) {
  return el("a", { class: `widget ${classe}${large ? " large" : ""}`, href: lien },
    el("span", { class: "widget-titre" }, icone(nomIcone), titre), contenu);
}

const chiffre = (valeur, unite) => el("span", { class: "widget-chiffre" }, valeur, unite && el("small", {}, unite));
const sous = texte => el("span", { class: "widget-sous" }, texte);

/* Le compte à rebours : J-12 avant, « Jour 3 sur 7 » pendant, puis « C'est fini ». Le seul grand chiffre de la page. */
function compteARebours() {
  const s = app.etat.sejour;
  const aujourdhui = iso(new Date());
  const jours = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  let grand, texte;
  if (aujourdhui < s.debut) [grand, texte] = [`J-${jours(aujourdhui, s.debut)}`, `avant la Groutte · du ${jourCourt(s.debut)} au ${jourCourt(s.fin)}`];
  else if (aujourdhui <= s.fin) [grand, texte] = [`Jour ${jours(s.debut, aujourdhui) + 1}`, `sur ${s.jours.length} · jusqu'au ${jourCourt(s.fin)}`];
  else [grand, texte] = ["C'est fini", `du ${jourCourt(s.debut)} au ${jourCourt(s.fin)}`];
  return el("a", { class: "widget large widget-hero", href: "#presence" }, el("span", { class: "hero-chiffre" }, grand), sous(texte));
}

function quiVient() {
  const noms = venants().sort((a, b) => a.localeCompare(b, "fr"));
  return widget("#presence", "fa-presence", "Qui vient", [
    chiffre(noms.length, noms.length > 1 ? "ploucs" : "plouc"),
    noms.length > 0 && el("span", { class: "pile-avatars" }, noms.slice(0, 7).map(n => avatar(n, 28)),
      noms.length > 7 && el("span", { class: "pile-plus" }, `+${noms.length - 7}`)),
  ]);
}

/* Une pastille par nuit du séjour : pleine si j'y dors. */
function mesNuits() {
  const miennes = new Set(nuitsDe(app.moi));
  const lits = resumeLits();
  return widget("#presence", "fa-lit", "Mes nuits", [
    presenceDe(app.moi) ? chiffre(miennes.size, miennes.size > 1 ? "nuits" : "nuit")
      : chiffre("?", app.etat.ne_vient_pas ? "je ne viens pas" : "pas de dates"),
    el("span", { class: "frise-nuits", "aria-hidden": "true" }, app.etat.sejour.nuits.map(n =>
      el("span", { class: miennes.has(n) ? "pleine" : "", title: jourCourt(n) }))),
    miennes.size > 0 && sous(lits),
  ]);
}

/* Le prochain repas que je prends (pas encore commencé), ce qu'on y cuisine et combien on sera. */
function prochainRepas() {
  const [jour, creneau] = repasPris(app.moi).filter(([j, c]) => !commence(j, c)).sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]))[0] || [];
  if (!jour) return widget("#repas", "fa-repas", "Prochain repas", [chiffre("—"), sous("Aucun repas à venir")]);
  const plats = app.etat.menus.filter(m => m.date === jour && m.creneau === creneau).map(m => m.plat);
  return widget("#menu", "fa-repas", "Prochain repas", [
    el("span", { class: "widget-valeur" }, `${jourCourt(jour)}, ${LIBELLES[creneau].toLowerCase()}`),
    sous(plats.length ? plats.join(", ") : "Pas encore de menu"),
    sous(`${pluriel(mangeurs(jour, creneau).length, "mangeur")}`),
  ]);
}

function monSolde() {
  const s = app.etat.compta.solde;
  const confirmer = aConfirmerComptes();
  return widget("#comptes", "fa-comptes", "Mon solde", [
    chiffre(euros(Math.abs(s))),
    el("span", { class: "widget-etat " + (s < 0 ? "dois" : s > 0 ? "doit" : "quitte") }, s < 0 ? "Je dois" : s > 0 ? "On me doit" : "Quitte"),
    confirmer > 0 && sous(`${confirmer} à confirmer`),
  ]);
}

/* Le gîte et la salle : ma part, et une barre de ce que j'ai déjà payé. */
function giteSalle() {
  const c = app.etat.creances;
  const lieux = [["gite", "Gîte"], ["salle", "Salle"]].filter(([q]) => !c[q].exempte);
  return widget("#creances", "fa-creances", "Gîte et salle", [
    lieux.length ? lieux.map(([q, nom]) => {
      const b = c[q];
      const paye = Math.max(0, b.part - Math.max(0, b.reste));
      const pourcent = b.part ? Math.min(100, Math.round(100 * paye / b.part)) : 0;
      const texte = b.hebergeur ? "hébergeur" : !b.part ? "à fixer" : !app.etat.gite[q].ouverture ? `~${euros(b.part)}` : b.reste > 0 ? `reste ${euros(b.reste)}` : "payé";
      return el("span", { class: "jauge" },
        el("span", { class: "jauge-texte" }, el("span", {}, nom), el("span", { class: "doux" }, texte)),
        el("span", { class: "barre-progres", role: "img", "aria-label": `${nom} : ${pourcent} % payé` }, el("span", { style: `width: ${pourcent}%` })));
    }) : sous("Exempté"),
    aConfirmer() > 0 && sous(`${aConfirmer()} paiement${aConfirmer() > 1 ? "s" : ""} à confirmer`),
  ]);
}

function nouveautes() {
  const pings = nonLus();
  const forum = nombreNouveautes("forum");
  const annonce = app.etat.pings.filter(p => !p.lu && p.genre === "annonce").sort((a, b) => b.quand.localeCompare(a.quand))[0];
  return widget("#pings", "fa-pings", "Nouveautés", [
    chiffre(pings, pings > 1 ? "pings non lus" : "ping non lu"),
    annonce && el("span", { class: "widget-annonce" }, el("strong", {}, annonce.titre), " ", annonce.texte),
    forum > 0 && sous(`${forum} fil${forum > 1 ? "s" : ""} du forum avec du nouveau`),
  ]);
}

/* Ce qui m'attend : une liste courte, chaque point avec sa page. Vide : « Tout est en ordre ». */
function aFaire() {
  const m = compte(app.moi);
  const g = app.etat.gite;
  const c = app.etat.creances;
  const compta = app.etat.compta;
  const moi = presenceDe(app.moi);
  const nuits = nuitsDe(app.moi).length;
  const doit = compta.je_dois.reduce((t, l) => t + l.montant, 0);
  const sansMoyen = !Object.keys(app.etat.moi.paiement || {}).some(k => k !== "prefere")
    && (compta.on_me_doit.length > 0 || g.sans_moyen?.includes(app.moi));
  const points = [
    g.tardif && ["#presence", "Faire accepter mon inscription"],
    !g.tardif && !moi && !app.etat.ne_vient_pas && ["#presence", "Dire quand je viens"],
    moi?.hors && ["#presence", "Vérifier mes dates"],
    (!m.prenom || !m.telephone) && ["#fiche", "Compléter ma fiche"],
    nuits > 0 && (m.matelas == null || m.duvets == null) && ["#fiche", "Dire ce que j'apporte pour dormir"],
    nuits > 0 && resumeLits().includes("par terre") && ["#lits", "Réserver un lit"],
    ...["gite", "salle"].map(q => g[q].ouverture && !c[q].hebergeur && !c[q].exempte && c[q].reste > 0
      && ["#payer/" + q, `Payer ma part ${q === "gite" ? "du gîte" : "de la salle"} (${euros(c[q].reste)})`]),
    doit > 0 && ["#comptes", `Rembourser ${euros(doit)}`],
    ...app.etat.depenses.filter(d => d.auteur === app.moi && d.etat === "brouillon" && d.refus).map(d => ["#depenses/" + d.id, `Corriger « ${d.motif || "sans motif"} »`]),
    sansMoyen && ["#rembourser", "Dire comment me rembourser"],
  ].filter(Boolean);
  return el("section", { class: "widget large widget-liste" },
    el("span", { class: "widget-titre" }, icone("fa-valider"), points.length ? `À faire (${points.length})` : "À faire"),
    points.length
      ? el("ul", {}, points.map(([lien, texte]) => el("li", {}, el("a", { href: lien }, el("span", { class: "case", "aria-hidden": "true" }), texte))))
      : sous("Tout est en ordre."));
}

function staff() {
  const nombres = [
    ["#validation", enAttente().filter(d => d.auteur !== app.moi).length, "à valider"],
    ["#validation", app.etat.depenses.filter(d => d.etat === "brouillon" && d.auteur !== app.moi).length, "brouillons"],
    ["#gite-salle", app.etat.gite.tardifs?.length || 0, "tardifs"],
  ];
  return el("section", { class: "widget large widget-staff" },
    el("span", { class: "widget-titre" }, icone("fa-staff"), "Staff"),
    el("span", { class: "trio" }, nombres.map(([lien, n, libelle]) =>
      el("a", { href: lien, class: n ? "" : "zero" }, el("span", { class: "widget-chiffre" }, n), el("span", { class: "widget-sous" }, libelle)))));
}

export function vueAccueil() {
  return el("div", { class: "widgets" },
    compteARebours(),
    aFaire(),
    estStaff() && staff(),
    quiVient(), mesNuits(),
    prochainRepas(), monSolde(),
    giteSalle(), nouveautes());
}
