import { app, el, icone, envoyer, ouvrirFeuille, fermerModale, notifier, dateCourte, pluriel, urlApercu } from "./commun.js";
import { nuitsDe } from "./sejour.js";
import { ouvrirVisionneuse } from "./visionneuse.js";

/* #lits : Gîte > Lits. Le tableau des lits (lignes) et des nuits (colonnes) : toucher une case libre la réserve,
   toucher la sienne la libère. Sans réservation, on dort par terre. La bulle Plan ouvre le plan et sa légende.
   En bas de chaque colonne : les lits libres, et ce qui reste de matelas et de duvets cette nuit-là une fois servis
   ceux qui dorment par terre ou dans un lit incomplet (lits.py, bilan). Ce que chacun apporte se dit dans Ma fiche. */

const SALLE = "salle";
const prenom = nom => (app.etat.comptes.find(c => c.nom === nom)?.prenom || nom).split(" ")[0];
const occupants = (nuit, lit) => app.etat.reservations.filter(r => r.nuit === nuit && r.lit === lit).map(r => r.nom);
const monLit = nuit => app.etat.reservations.find(r => r.nuit === nuit && r.nom === app.moi)?.lit || null;
const nomLit = lit => lit === SALLE ? "la salle" : `le lit ${lit}`;

async function toucher(nuit, lit, places) {
  const deja = occupants(nuit, lit);
  if (deja.includes(app.moi)) return envoyer("lits/liberer", { nuit });
  if (!nuitsDe(app.moi).includes(nuit)) return notifier("Tu n'es pas là cette nuit-là : change d'abord tes dates dans Présence.");
  if (places && deja.length >= places) return notifier("Ce lit est plein cette nuit-là.");
  if (await envoyer("lits/reserver", { nuit, lit }) && lit !== SALLE && deja.length) {
    notifier(`Tu dormiras avec ${deja.join(" et ")}.`, true);
  }
}

/* L'infobulle d'un lit : sa description, et « Ce lit pour toutes mes nuits ». */
function infoLit(l) {
  const mesNuits = nuitsDe(app.moi);
  ouvrirFeuille(l.lettre === SALLE ? "Salle" : `Lit ${l.lettre}`, [
    el("p", {}, l.description || (l.lettre === SALLE ? "La salle des fêtes, places illimitées." : "Pas de description.")),
    l.places && el("p", { class: "doux petit" }, pluriel(l.places, "place"), l.complet === false && " · sans couette : il faut un duvet"),
    mesNuits.length > 0 && el("button", {
      class: "btn principal large", type: "button",
      onclick: async () => {
        if (!await envoyer("lits/tout", { lit: l.lettre })) return;
        fermerModale();
        const pleines = app.etat.lits_pleins || [];
        notifier(pleines.length ? `C'est noté, sauf les nuits du ${pleines.map(dateCourte).join(", ")} : ${nomLit(l.lettre)} y était plein.`
          : `${nomLit(l.lettre)} est à toi pour toutes tes nuits.`.replace(/^./, c => c.toUpperCase()), !pleines.length);
      },
    }, "Ce lit pour toutes mes nuits"),
  ]);
}

/* Le plan : l'image envoyée par le staff (les lettres y sont dessinées), puis la légende. */
export function ouvrirPlan() {
  const { plan, lits } = app.etat.gite;
  ouvrirFeuille("Plan du gîte", [
    plan && el("button", { type: "button", class: "plan-gite", onclick: () => { fermerModale(); ouvrirVisionneuse([plan], 0); } },
      el("img", { src: urlApercu(plan), alt: "Plan du gîte" })),
    !plan && el("p", { class: "doux petit" }, "Le staff n'a pas encore envoyé de plan."),
    el("ul", { class: "liste-simple legende" }, lits.map(l => el("li", {},
      el("span", {}, el("strong", {}, l.lettre), " ", l.description), el("span", { class: "doux petit" }, pluriel(l.places, "place"))))),
  ]);
}

function tableau() {
  const { lits, salle_couchage: salle } = app.etat.gite;
  const lignes = [...lits, ...(salle ? [{ lettre: SALLE, description: "", places: 0 }] : [])];
  const nuits = app.etat.sejour.nuits;
  const mesNuits = nuitsDe(app.moi);
  const absente = nuit => !mesNuits.includes(nuit);
  const libres = nuit => lits.reduce((n, l) => n + Math.max(0, l.places - occupants(nuit, l.lettre).length), 0);
  const reste = (nuit, objet) => app.etat.literie[nuit]?.[objet] ?? 0;
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-lits" },
    el("thead", {}, el("tr", {}, el("th", {}, "Lit"),
      nuits.map(nuit => el("th", { scope: "col", class: absente(nuit) ? "absent" : "" }, dateCourte(nuit))))),
    el("tbody", {},
      lignes.map(l => el("tr", {},
        el("th", { scope: "row" }, el("button", { type: "button", class: "entete-lit", onclick: () => infoLit(l) },
          l.lettre === SALLE ? "Salle" : l.lettre, l.places > 1 && el("span", { class: "doux" }, `(${l.places})`))),
        nuits.map(nuit => {
          const noms = occupants(nuit, l.lettre);
          const plein = l.places && noms.length >= l.places;
          const mien = noms.includes(app.moi);
          return el("td", {}, el("button", {
            type: "button", class: "case" + (mien ? " mienne" : plein ? " pleine" : "") + (absente(nuit) ? " absente" : ""),
            "aria-label": `${dateCourte(nuit)}, ${nomLit(l.lettre)} : ${noms.join(", ") || "libre"}`,
            onclick: () => toucher(nuit, l.lettre, l.places),
          }, noms.map(n => el("span", {}, n === app.moi ? "Moi" : prenom(n)))));
        }))),
      el("tr", { class: "debut-totaux" }, el("th", { scope: "row" }, "Lits libres"),
        nuits.map(nuit => el("td", { class: "libres" + (libres(nuit) ? "" : " aucun") }, String(libres(nuit))))),
      [["matelas", "Matelas"], ["duvets", "Duvets"]].map(([objet, titre]) => el("tr", {}, el("th", { scope: "row" }, titre),
        nuits.map(nuit => {
          const r = reste(nuit, objet);
          return el("td", { class: "libres" + (r < 0 ? " aucun" : ""), title: r < 0 ? `Il en manque ${-r}` : null }, r < 0 ? `${r} !` : String(r));
        }))))));
}

/* Sous le tableau : ceux qui n'ont pas dit ce qu'ils apportent (comptés pour zéro). */
function literie() {
  const muets = app.etat.sans_literie;
  const moi = muets.includes(app.moi);
  return el("p", { class: "doux petit note" },
    muets.length ? `${muets.length > 1 ? `${muets.length} ploucs n'ont` : "1 plouc n'a"} pas dit ce qu'${muets.length > 1 ? "ils apportent" : "il apporte"} pour dormir : ${muets.length > 1 ? "ils comptent" : "il compte"} pour zéro. ` : "",
    moi && el("a", { href: "#fiche" }, "Dis-le dans Ma fiche. "),
    "Matelas et Duvets : ce qui reste chaque nuit pour ceux qui dorment par terre (un matelas et un duvet) ou dans un lit sans couette (un duvet). Négatif : il en manque.");
}

function mesNuits() {
  const nuits = nuitsDe(app.moi);
  if (!nuits.length) return el("p", { class: "doux note" }, app.etat.gite.tardif
    ? "Ton inscription tardive doit d'abord être acceptée."
    : "Tu n'as pas de nuit au gîte. Saisis tes dates dans Présence.");
  return el("div", { class: "liste-groupee" }, nuits.map(nuit => {
    const lit = monLit(nuit);
    return el("div", { class: "ligne" },
      el("span", { class: "ligne-texte" }, `Nuit du ${dateCourte(nuit)}`),
      el("span", { class: "ligne-valeur" }, lit ? (lit === SALLE ? "Salle" : `Lit ${lit}`) : "Par terre"),
      lit && el("button", { class: "discret", type: "button", onclick: () => envoyer("lits/liberer", { nuit }) }, "Libérer"));
  }));
}

export function vueLits() {
  const { lits } = app.etat.gite;
  if (!lits.length) return el("p", { class: "doux" }, "Le staff n'a pas encore déclaré les lits.");
  const complet = app.etat.sejour.nuits.filter(n => lits.every(l => occupants(n, l.lettre).length >= l.places));
  return [
    el("p", { class: "doux petit note" }, "Touche une case libre pour réserver ce lit cette nuit-là, ta case pour la libérer, une lettre pour sa description. Sans lit, on dort par terre."),
    tableau(),
    literie(),
    complet.map(n => el("p", { class: "alerte-ligne" }, icone("info"), `Nuit du ${dateCourte(n)} : plus de lit au gîte, il faudra dormir par terre.`)),
    el("h2", {}, "Mes nuits"),
    mesNuits(),
  ];
}

export function resumeLits() {
  const nuits = nuitsDe(app.moi);
  if (!app.etat.gite.lits.length) return "Lits pas encore déclarés";
  if (!nuits.length) return "Pas de nuit au gîte";
  const parTerre = nuits.filter(n => !monLit(n)).length;
  return parTerre ? `${pluriel(parTerre, "nuit")} par terre` : "Un lit chaque nuit";
}
