import { app, $, el, avatar, icone, compte, pastilleNouveau } from "./commun.js";
import { groupesPanneau } from "./rubriques.js";
import { seDeconnecter } from "./reglages.js";

/* Le panneau latéral : toutes les rubriques, chaque entrée avec un résumé dessous (comme les Réglages de l'iPhone).
   - Téléphone (moins de 900 px) : le burger, toujours en haut à gauche, l'ouvre par-dessus la page.
     Ouvert = une entrée de l'historique : le retour du téléphone le referme. Pas d'ouverture en glissant depuis
     le bord : sur Android (navigation par gestes) et dans Safari, ce geste veut déjà dire « retour ».
   - Paysage (900 px et plus : ordinateur, tablette) : toujours affiché en colonne à gauche, la page ouverte surlignée.
   Son contenu est déclaré dans rubriques.js (groupesPanneau). */

let ouvert = false;
export const telephone = matchMedia("(max-width: 899px)");

function appliquer() {
  $("panneau").classList.toggle("ouvert", ouvert);
  $("voile-panneau").classList.toggle("ouvert", ouvert);
  const visible = ouvert || !telephone.matches;   // en paysage, toujours là
  $("panneau").inert = !visible;
  $("panneau").setAttribute("aria-hidden", String(!visible));
  document.body.classList.toggle("sans-defilement", ouvert);
}

export function ouvrirPanneau() {
  if (ouvert || !telephone.matches) return;
  history.pushState({ panneau: true }, "");
  ouvert = true;
  appliquer();
}

export function fermerPanneau() {
  if (!ouvert) return;
  ouvert = false;
  appliquer();
  if (history.state?.panneau) history.back();   // l'entrée du panneau disparaît, l'adresse ne change pas
}

/* Retour arrière, lien choisi : le panneau suit l'entrée de l'historique. */
function suivreHistorique() {
  ouvert = telephone.matches && Boolean(history.state?.panneau);
  appliquer();
}
window.addEventListener("popstate", suivreHistorique);
window.addEventListener("hashchange", suivreHistorique);
telephone.addEventListener("change", suivreHistorique);
$("voile-panneau").addEventListener("click", fermerPanneau);
document.addEventListener("keydown", ev => { if (ev.key === "Escape") fermerPanneau(); });
appliquer();

/* Glisser vers la gauche referme le panneau ouvert. */
let depart = null;
document.addEventListener("touchstart", ev => {
  const t = ev.touches[0];
  depart = ouvert && ev.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
document.addEventListener("touchend", ev => {
  if (!depart) return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - depart.x, dy = t.clientY - depart.y;
  depart = null;
  if (dx < -60 && Math.abs(dx) > 1.5 * Math.abs(dy)) fermerPanneau();
});

/* Barre du haut (téléphone) : le burger ouvre le panneau, avec une pastille s'il y a du nouveau quelque part
   (le détail est dans le panneau) ; la photo, à droite, mène à Ma fiche. */
export function boutonMenu() {
  const nouveau = groupesPanneau().some(g => g.entrees.some(e => e && e.nouveau));
  return el("button", { type: "button", class: "bouton-menu", "aria-label": "Ouvrir le menu", onclick: ouvrirPanneau },
    icone("burger"), pastilleNouveau(nouveau));
}

export function boutonFiche(taille = 32) {
  return el("a", { class: "bouton-fiche", href: "#fiche", "aria-label": "Ma fiche" }, avatar(app.moi, taille));
}

/* Une entrée : l'icône dans la couleur de son groupe, le titre, un résumé dessous, la pastille, le chevron. */
function entree({ lien, icone: nomIcone, titre, resume, nouveau, action }) {
  const contenu = [
    el("span", { class: "tuile" }, icone(nomIcone)),
    el("span", { class: "ligne-texte" }, titre, resume && el("span", { class: "doux petit" }, resume)),
    pastilleNouveau(nouveau),
  ];
  return action
    ? el("button", { type: "button", class: "ligne entree", onclick: action }, contenu)
    : el("a", { class: "ligne entree", href: lien }, contenu, icone("chevron-droite"));
}

/* Redessiné avec le reste de la page (main.js) : les résumés et les pastilles restent justes. */
export function dessinerPanneau() {
  const m = compte(app.moi);
  if (!m) { $("panneau").replaceChildren(); return; }
  $("panneau").replaceChildren(...[
    el("a", { class: "panneau-compte", href: "#fiche" }, avatar(m.nom, 56),
      el("span", { class: "ligne-texte" }, el("strong", {}, m.nom), el("span", { class: "doux petit" }, m.staff ? "Staff · Ma fiche" : "Ma fiche"))),
    groupesPanneau().map(g => {
      const entrees = g.entrees.filter(Boolean);
      return entrees.length > 0 && [g.titre && el("h2", {}, g.titre), el("div", { class: "liste-groupee " + (g.classe || "") }, entrees.map(entree))];
    }),
    el("div", { class: "liste-groupee", style: "margin-top: var(--e6)" },
      el("button", { type: "button", class: "ligne entree deconnexion", onclick: () => { fermerPanneau(); seDeconnecter(); } },
        el("span", { class: "tuile" }, icone("fa-deconnexion")), el("span", { class: "ligne-texte" }, "Se déconnecter"))),
  ].flat(2).filter(Boolean));
  surlignerPageOuverte();
}

/* L'entrée de la page ouverte est surlignée (en paysage) : celle dont l'adresse colle le mieux
   (« #carnet/Bob » allume « Carnet d'adresses »). */
function surlignerPageOuverte() {
  const ici = location.hash || "#";
  let choisie = null;
  for (const a of $("panneau").querySelectorAll("a[href]")) {
    const lien = a.getAttribute("href");
    if ((ici === lien || ici.startsWith(lien + "/")) && lien.length > (choisie?.getAttribute("href").length || 0)) choisie = a;
    a.classList.remove("actif");
    a.removeAttribute("aria-current");
  }
  choisie?.classList.add("actif");
  choisie?.setAttribute("aria-current", "page");
}
