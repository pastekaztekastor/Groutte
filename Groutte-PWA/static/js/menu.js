import { app, el, icone, avatar, compte, envoyer, afficher, notifier, jourCourt, pluriel, lienContact } from "./commun.js";
import { repasPossibles, mangeurs, estGere, commence, presenceDe } from "./sejour.js";

/* #menu : Repas > Menu, ce qu'on cuisine ensemble avec la réserve (le réveillon compris ; un resto n'est pas un menu).
   #menu/nouveau : proposer un menu. #menu/<id> : un menu, ses inscrits, et à qui il ne convient pas.
   #menu-modifier/<id> : l'auteur le modifie. Menu et Mes repas parlent de la même chose : « J'en mange » coche le repas,
   se désinscrire du dernier menu de ce repas le décoche. */

const QUAND = { matin: "matin", midi: "midi", soir: "soir" };
export const trouverMenu = id => app.etat.menus.find(m => m.id === id);
const repasDe = m => `${jourCourt(m.date)}, ${QUAND[m.creneau]}`;
const inscrit = m => m.inscrits.includes(app.moi);

/* Les mangeurs de ce repas à qui le plat ne convient pas : un de leurs régimes n'est pas coché dans « Il convient à ». */
function neConvientPas(m) {
  return mangeurs(m.date, m.creneau).map(compte).filter(Boolean)
    .map(c => ({ nom: c.nom, regimes: c.regimes.filter(r => !m.convient.includes(r)) }))
    .filter(x => x.regimes.length);
}

const phraseConvient = liste => liste.map(x => `${x.nom} (${x.regimes.join(", ")})`).join(", ");

/* La case « J'en mange » : seulement si je suis présent à ce repas, qu'il est géré et pas encore commencé. */
function caseManger(m) {
  const possible = repasPossibles(app.moi).some(([j, c]) => j === m.date && c === m.creneau) && estGere(m.date, m.creneau) && !commence(m.date, m.creneau);
  if (!possible) return null;
  const coche = el("input", { type: "checkbox", class: "case-cocher", checked: inscrit(m), "aria-label": `J'en mange : ${m.plat}` });
  coche.onclick = ev => ev.stopPropagation();
  coche.onchange = () => envoyer("menu/manger", { id: m.id, mange: coche.checked });
  return coche;
}

function ligneMenu(m) {
  const passe = commence(m.date, m.creneau);
  const alerte = !passe && neConvientPas(m).length > 0;
  return el("div", { class: "ligne ligne-menu" + (passe ? " passe" : "") },
    el("a", { class: "qui-lien", href: "#menu/" + m.id },
      el("span", { class: "ligne-texte" },
        el("span", { class: "doux petit" }, repasDe(m)),
        el("strong", {}, m.plat),
        el("span", { class: "doux petit" }, m.auteur === app.moi ? "Moi" : m.auteur, alerte && el("span", { class: "alerte-texte" }, " · ne convient pas à tous"))),
      el("span", { class: "ligne-valeur" }, `${m.inscrits.length}/${mangeurs(m.date, m.creneau).length}`)),
    passe ? null : caseManger(m));
}

export function vueMenu() {
  const menus = app.etat.menus;
  const avenir = menus.filter(m => !commence(m.date, m.creneau));
  const passes = menus.filter(m => commence(m.date, m.creneau));
  return [
    el("p", { class: "doux petit note" }, "Les repas cuisinés ensemble avec la réserve, réveillon compris. Un resto ? Décoche simplement le repas dans ",
      el("a", { href: "#repas" }, "Mes repas"), ". « 9/14 » : 9 inscrits sur 14 qui mangent ce repas."),
    menus.length === 0 && el("p", { class: "doux note" }, "Personne n'a encore proposé de menu. Tu cuisines quelque chose ? Touche +."),
    avenir.length > 0 && el("div", { class: "liste-groupee" }, avenir.map(ligneMenu)),
    passes.length > 0 && [el("h2", {}, "Passés"), el("div", { class: "liste-groupee liste-elements" }, passes.map(ligneMenu))],
  ];
}

/* --- Un menu ------------------------------------------------------------------------------------------------- */

export function vueMenuDetail(id) {
  const m = trouverMenu(id);
  if (!m) return [el("p", { class: "doux" }, "Ce menu n'existe plus."), el("a", { class: "btn large", href: "#menu" }, "Voir le Menu")];
  const passe = commence(m.date, m.creneau);
  const pasLa = !repasPossibles(m.auteur).some(([j, c]) => j === m.date && c === m.creneau);
  const contre = neConvientPas(m);
  const mange = caseManger(m);
  const allergies = mangeurs(m.date, m.creneau).map(compte).filter(c => c?.allergies);
  return [
    el("section", { class: "carte entete-depense" },
      el("span", { class: "doux" }, repasDe(m)),
      el("p", { class: "montant-grand" }, m.plat),
      el("a", { class: "qui", href: lienContact(m.auteur) }, avatar(m.auteur, 24), m.auteur === app.moi ? "Moi" : m.auteur)),
    pasLa && el("p", { class: "alerte-ligne" }, icone("info"), `${m.auteur} n'est plus présent ce jour-là.`),
    !estGere(m.date, m.creneau) && el("p", { class: "alerte-ligne" }, icone("info"), "Ce repas n'est plus géré par la communauté."),
    mange && el("label", { class: "liste-groupee ligne" }, el("span", { class: "ligne-texte" }, "J'en mange",
      el("span", { class: "doux petit" }, "Coche aussi le repas dans Mes repas")), mange),
    el("h2", {}, "Il convient à"),
    el("div", { class: "carte" }, el("p", {}, m.convient.length ? m.convient.join(", ") : "Aucun régime coché."),
      contre.length > 0 && el("p", { class: "alerte-texte" }, `Ne convient pas à : ${phraseConvient(contre)}`),
      allergies.length > 0 && el("p", { class: "doux petit" }, "Allergies : ", allergies.map(c => `${c.nom} (${c.allergies})`).join(", "))),
    (m.matos || m.ingredients) && [el("h2", {}, "Organisation"), el("div", { class: "liste-groupee" },
      m.matos && el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, el("span", { class: "doux petit" }, "Matos"), el("span", { class: "texte-libre" }, m.matos))),
      m.ingredients && el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, el("span", { class: "doux petit" }, "Ingrédients"), el("span", { class: "texte-libre" }, m.ingredients))))],
    el("h2", {}, `Inscrits (${m.inscrits.length} sur ${pluriel(mangeurs(m.date, m.creneau).length, "mangeur")})`),
    m.inscrits.length ? el("div", { class: "liste-groupee" }, m.inscrits.map(n => el("a", { class: "ligne", href: lienContact(n) },
      avatar(n, 32), el("span", { class: "ligne-texte" }, n, compte(n)?.regimes.length > 0 && el("span", { class: "doux petit" }, compte(n).regimes.join(", "))))))
      : el("p", { class: "doux note" }, "Personne pour l'instant."),
    m.auteur === app.moi && !passe && el("div", { class: "actions" },
      el("a", { class: "btn large", href: "#menu-modifier/" + m.id }, "Modifier"),
      el("button", { class: "btn danger large", type: "button", onclick: async () => {
        if (confirm(`Supprimer ${m.plat} ?${m.inscrits.length ? ` Les ${m.inscrits.length} inscrits seront prévenus.` : ""}`) && await envoyer("menu/supprimer", { id: m.id })) location.replace("#menu");
      } }, "Supprimer")),
    el("p", { class: "doux petit note" }, "Les ingrédients s'achètent et se partagent par Dépenses (pour la communauté, Alimentaire), au prorata des repas de chacun, pas des inscrits."),
  ];
}

/* --- Proposer ou modifier ------------------------------------------------------------------------------------ */

const formulaires = {};   // id ou "nouveau" -> brouillon (la page se redessine toutes les 30 s)

/* Les repas que je peux viser : gérés par la communauté, où je suis présent, pas encore commencés. */
const repasVisables = () => repasPossibles(app.moi).filter(([j, c]) => estGere(j, c) && !commence(j, c));

function champ(f, cle, props) {
  const e = el(props.multi ? "textarea" : "input", { value: f[cle], ...props, multi: null });
  if (props.multi) e.value = f[cle];
  e.addEventListener("input", () => { f[cle] = e.value; });
  return e;
}

export function vueSaisieMenu(id) {
  const m = id ? trouverMenu(id) : null;
  if (id && (!m || m.auteur !== app.moi)) return el("p", { class: "doux" }, "Ce menu n'existe plus, ou ce n'est pas le tien.");
  const visables = repasVisables();
  if (!m && !visables.length) {
    return [el("p", { class: "doux note" }, presenceDe(app.moi)
      ? "Aucun repas à venir n'est géré par la communauté pendant ta présence."
      : "Tu n'as pas de dates : saisis-les d'abord dans Présence."), el("a", { class: "btn large", href: "#menu" }, "Retour")];
  }
  const f = formulaires[id || "nouveau"] ??= m
    ? { plat: m.plat, repas: m.date + "/" + m.creneau, convient: [...m.convient], matos: m.matos, ingredients: m.ingredients }
    : { plat: "", repas: visables[0].join("/"), convient: [], matos: "", ingredients: "" };
  const [date, creneau] = f.repas.split("/");
  const choixRepas = el("select", { "aria-label": "Repas" },
    visables.map(([j, c]) => el("option", { value: j + "/" + c, selected: f.repas === j + "/" + c }, `${jourCourt(j)}, ${QUAND[c]}`)),
    !visables.some(([j, c]) => f.repas === j + "/" + c) && el("option", { value: f.repas, selected: true }, `${jourCourt(date)}, ${QUAND[creneau]}`));
  choixRepas.onchange = () => { f.repas = choixRepas.value; afficher(); };
  const essai = { date, creneau, convient: f.convient };
  const contre = neConvientPas(essai);
  const allergies = mangeurs(date, creneau).map(compte).filter(c => c?.allergies);
  const concurrents = app.etat.menus.filter(x => x.date === date && x.creneau === creneau && x.id !== id);
  const envoyerMenu = async () => {
    if (!f.plat.trim()) return notifier("Indique le plat.");
    const r = await envoyer("menu/enregistrer", { id: id || "", plat: f.plat, date, creneau, convient: f.convient, matos: f.matos, ingredients: f.ingredients });
    if (!r) return;
    delete formulaires[id || "nouveau"];
    notifier(id ? "Menu modifié." : "Menu proposé : tout le monde est prévenu.", true);
    location.replace("#menu/" + (id || app.etat.menu));
  };
  return [
    el("div", { class: "carte" },
      el("label", { class: "champ" }, "Le plat", champ(f, "plat", { maxlength: 80, placeholder: "Pâté aux patates", required: true })),
      el("label", { class: "champ" }, "Le repas", choixRepas)),
    m && f.repas !== m.date + "/" + m.creneau && m.inscrits.length > 0 && el("p", { class: "alerte-ligne" }, icone("info"), "Changer de repas retire les inscriptions : les inscrits seront prévenus."),
    concurrents.length > 0 && el("p", { class: "alerte-ligne" }, icone("info"),
      `${concurrents.map(x => `${x.auteur} propose déjà ${x.plat}`).join(", ")} pour ce repas. Plusieurs plats, c'est permis.`),
    el("h2", {}, "Il convient à"),
    el("div", { class: "liste-groupee" }, app.etat.regimes.map(r => {
      const coche = el("input", { type: "checkbox", role: "switch", checked: f.convient.includes(r) });
      coche.onchange = () => { f.convient = coche.checked ? [...f.convient, r] : f.convient.filter(x => x !== r); afficher(); };
      return el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, r), coche);
    })),
    el("p", { class: "doux petit note" }, "Coche ce qui convient : sans coche, l'appli signale le plat à ceux qui ont un régime. Halal n'est pas Sans porc : un bœuf non halal convient à Sans porc, pas à Halal."),
    contre.length > 0 && el("p", { class: "alerte-ligne" }, icone("info"), `Ne convient pas à : ${phraseConvient(contre)}.`),
    allergies.length > 0 && el("p", { class: "alerte-ligne" }, icone("info"), "Allergies : ", allergies.map(c => `${c.nom} (${c.allergies})`).join(", ")),
    el("h2", {}, "Organisation"),
    el("div", { class: "carte" },
      el("label", { class: "champ" }, "Le matos dont j'ai besoin (facultatif)", champ(f, "matos", { maxlength: 300, placeholder: "3 plats à tarte", multi: true, rows: 2 })),
      el("label", { class: "champ" }, "Les ingrédients (facultatif)", champ(f, "ingredients", { maxlength: 300, placeholder: "10 kg de patates", multi: true, rows: 2 }))),
    el("div", { class: "actions" }, el("button", { class: "btn principal large", type: "button", onclick: envoyerMenu }, id ? "Enregistrer" : "Proposer")),
    !id && el("p", { class: "doux petit note" }, "Tous ceux qui viennent seront prévenus. Tu n'es pas inscrit d'office : coche « J'en mange » si tu en manges."),
  ];
}

export const nouveauMenu = () => { delete formulaires.nouveau; location.hash = "#menu/nouveau"; };
export const titreMenu = id => trouverMenu(id)?.plat || "Menu";

export function resumeMenu() {
  const avenir = app.etat.menus.filter(m => !commence(m.date, m.creneau));
  const miens = avenir.filter(inscrit).length;
  return avenir.length ? `${pluriel(avenir.length, "plat")} à venir${miens ? `, ${miens} pour moi` : ""}` : "Ce qu'on cuisine ensemble";
}
