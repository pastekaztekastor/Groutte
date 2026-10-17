import { app, el, avatar, compte, envoyer, ouvrirFeuille, dateCourte, jourCourt, lienContact } from "./commun.js";
import { REPAS, LIBELLES, presenceDe, repasPossibles, repasPris, mangeurs, estGere, commence } from "./sejour.js";

/* #repas : Repas > Mes repas. Seuls les repas gérés par la communauté (Réglages compta, par défaut le soir) se cochent :
   je décoche ceux que je prends ailleurs, avant qu'ils commencent. Les autres sont grisés, et ne comptent jamais. En
   dessous, le nombre de mangeurs de chaque repas, avec leurs régimes. Décocher un repas me désinscrit de ses menus. */

const cle = (j, c) => j + "/" + c;

function mesRepas() {
  const possibles = repasPossibles(app.moi);
  if (!possibles.length) return el("p", { class: "doux note" }, "Tu n'as pas de dates : saisis-les d'abord dans Présence.");
  const ouverts = new Set(possibles.map(([j, c]) => cle(j, c)));
  const pris = new Set(repasPris(app.moi).map(([j, c]) => cle(j, c)));
  const jours = [...new Set(possibles.map(([j]) => j))];
  return [
    el("div", { class: "tableau-defile" }, el("table", { class: "tableau-groupe tableau-repas" },
      el("thead", {}, el("tr", {}, el("th", {}, ""), REPAS.map(c => el("th", {}, LIBELLES[c])))),
      el("tbody", {}, jours.map(j => el("tr", {},
        el("th", { scope: "row" }, dateCourte(j)),
        REPAS.map(c => {
          if (!ouverts.has(cle(j, c))) return el("td", {}, "–");
          if (!estGere(j, c)) return el("td", { class: "fige", title: "Pas géré par la communauté" }, "·");
          const fige = commence(j, c);
          const coche = el("input", { type: "checkbox", class: "case-cocher", checked: pris.has(cle(j, c)), disabled: fige,
            "aria-label": `${dateCourte(j)}, ${LIBELLES[c].toLowerCase()} : ${pris.has(cle(j, c)) ? "je mange sur la réserve" : "je mange ailleurs"}` });
          coche.onchange = () => {
            const menus = app.etat.menus.filter(m => m.date === j && m.creneau === c && m.inscrits.includes(app.moi));
            if (!coche.checked && menus.length && !confirm(`Tu es inscrit à ${menus.map(m => m.plat).join(", ")} : décocher ce repas t'en désinscrit. Continuer ?`)) {
              coche.checked = true;
              return;
            }
            envoyer("repas", { date: j, creneau: c, pris: coche.checked });
          };
          return el("td", { class: fige ? "fige" : "" }, coche);
        })))))),
    el("p", { class: "note" }, el("strong", {}, `${pris.size} repas`), " sur la réserve, sur ", `${possibles.filter(([j, c]) => estGere(j, c)).length} gérés par la communauté.`),
    el("p", { class: "doux petit note" }, `Décoche un repas que tu prends ailleurs (un resto, par exemple), avant qu'il commence (${REPAS.map(c => app.etat.sejour.heures_repas[c].replace(/^0/, "").replace(":00", " h").replace(":", " h ")).join(", ")}). Ensuite, il est figé. Les repas grisés ne sont pas gérés par la communauté : chacun se débrouille, et ils ne comptent pas.`),
  ];
}

function resumeRegimes(noms) {
  const compte_ = new Map();
  for (const n of noms) for (const r of compte(n)?.regimes || []) compte_.set(r, (compte_.get(r) || 0) + 1);
  return [...compte_].map(([r, k]) => `${k} ${r.toLowerCase()}`).join(" · ");
}

function detailRepas(j, c) {
  const noms = mangeurs(j, c);
  const allergies = noms.map(compte).filter(x => x?.allergies);
  ouvrirFeuille(`${jourCourt(j)}, ${LIBELLES[c].toLowerCase()}`, [
    el("p", {}, `${noms.length} sur la réserve`, resumeRegimes(noms) && el("span", { class: "doux" }, ` · ${resumeRegimes(noms)}`)),
    allergies.length > 0 && el("div", { class: "carte" }, el("h3", {}, "Allergies"),
      allergies.map(x => el("p", { class: "petit" }, el("strong", {}, x.nom), " : ", x.allergies))),
    noms.length > 0 && el("div", { class: "liste-groupee" }, noms.map(n => el("a", { class: "ligne", href: lienContact(n) },
      avatar(n, 32), el("span", { class: "ligne-texte" }, n, compte(n)?.regimes.length > 0 && el("span", { class: "doux petit" }, compte(n).regimes.join(", ")))))),
  ]);
}

function groupe() {
  const jours = app.etat.sejour.jours;
  return el("div", { class: "tableau-defile" }, el("table", { class: "tableau-groupe" },
    el("thead", {}, el("tr", {}, el("th", {}, ""), REPAS.map(c => el("th", {}, LIBELLES[c])))),
    el("tbody", {}, jours.map(j => el("tr", {},
      el("th", { scope: "row" }, dateCourte(j)),
      REPAS.map(c => {
        if (!estGere(j, c)) return el("td", {}, "·");
        const n = mangeurs(j, c).length;
        return el("td", {}, el("button", {
          type: "button", class: "case" + (n ? "" : " vide"), "aria-label": `${dateCourte(j)} ${LIBELLES[c]} : ${n} mangeurs`,
          onclick: () => detailRepas(j, c),
        }, String(n)));
      }))))));
}

export function vueRepas() {
  return [
    el("h2", {}, "Mes repas"),
    mesRepas(),
    el("h2", {}, "Le groupe"),
    groupe(),
    el("p", { class: "note" }, el("a", { href: "#menu" }, "Ce qu'on cuisine : le Menu"), " · ", el("a", { href: "#faq/mange-ailleurs" }, "Comment ça marche ?")),
  ];
}

export function resumeRepas() {
  if (!presenceDe(app.moi)) return "Pas de dates";
  return `${repasPris(app.moi).length} repas sur la réserve`;
}
