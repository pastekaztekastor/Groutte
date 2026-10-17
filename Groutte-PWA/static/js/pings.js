import { app, $, el, icone, envoyer, afficher, fermerModale, ilYa, pluriel } from "./commun.js";
import { etatAppareil, pris_en_charge } from "./notifs.js";

/* #pings : Communauté > Pings reçus. Toutes les notifications qu'on m'a envoyées (pings.py), même balayées ou jamais
   reçues ; les lues sont grisées. À l'ouverture de l'appli, une fenêtre montre les annonces du staff et les relances
   pas encore lues (fenetrePings) : personne ne les rate, notifications activées ou non. */

const GENRES = { tout: "Tout", annonce: "Annonces", relance: "Relances" };
let filtre = "tout";
let fenetreMontree = false;

export const nonLus = () => app.etat.pings.filter(p => !p.lu).length;
const importants = () => app.etat.pings.filter(p => !p.lu && (p.genre === "annonce" || p.genre === "relance"));
const sansNotifs = () => !app.etat.notifs.disponible || !pris_en_charge() || etatAppareil() === "inactif";

/* Toucher un ping : il passe en lu, et sa page s'ouvre (comme si l'on touchait la notification). */
async function ouvrir(p) {
  if (!p.lu) envoyer("pings/lu", { ids: [p.id] });
  location.hash = p.lien || "#";
}

function lignePing(p) {
  return el("button", { type: "button", class: "ligne entree ligne-ping" + (p.lu ? " lu" : ""), onclick: () => ouvrir(p) },
    el("span", { class: "ligne-texte" },
      el("span", { class: "rangee-depense" }, el("strong", {}, p.titre), p.genre !== "autre" && el("span", { class: "badge" }, p.genre === "annonce" ? "annonce" : "relance")),
      el("span", {}, p.texte),
      el("span", { class: "doux petit" }, ilYa(p.quand), p.de && ` · ${p.de}${p.genre === "annonce" ? ", staff" : ""}`)),
    !p.lu && el("span", { class: "nouveau point" }),
    icone("chevron-droite"));
}

function bandeauNotifs() {
  if (!sansNotifs()) return null;
  return el("section", { class: "carte bandeau" },
    el("p", {}, icone("cloche-barree"), " Tu ne reçois pas les notifications sur cet appareil. Active-les pour ne rien rater."),
    el("a", { class: "btn principal large", href: "#notifications" }, "Les activer"));
}

export function vuePings() {
  const tous = app.etat.pings;
  const liste = filtre === "tout" ? tous : tous.filter(p => p.genre === filtre);
  return [
    bandeauNotifs(),
    el("div", { class: "segments", role: "radiogroup", "aria-label": "Filtre" }, Object.entries(GENRES).map(([v, l]) => el("button", {
      type: "button", class: filtre === v ? "choisi" : "", role: "radio", "aria-checked": String(filtre === v),
      onclick: () => { filtre = v; afficher(); },
    }, l))),
    liste.length ? el("div", { class: "liste-groupee liste-elements" }, liste.map(lignePing)) : el("p", { class: "doux note" }, "Rien pour l'instant."),
    nonLus() > 0 && el("div", { class: "actions" }, el("button", { class: "btn large", type: "button", onclick: () => envoyer("pings/lu", { tout: true }) }, "Tout marquer comme lu")),
  ];
}

export function resumePings() {
  const n = nonLus();
  return n ? `${pluriel(n, "ping")} non lu${n > 1 ? "s" : ""}` : "Les notifications reçues";
}

/* À l'ouverture de l'appli : les annonces et relances non lues, avec « J'ai vu », et l'invitation à activer les
   notifications si cet appareil ne les reçoit pas. Une fois par chargement de la page. */
export function fenetrePings() {
  if (fenetreMontree || !app.etat?.pings) return;
  const a_voir = importants();
  if (!a_voir.length || !$("modale").hidden || !$("connexion").hidden) return;
  fenetreMontree = true;
  const boite = $("modale-contenu");
  const vu = async () => { fermerModale(); await envoyer("pings/lu", { ids: a_voir.map(p => p.id) }); };
  boite.replaceChildren(...[
    el("h2", {}, a_voir.length > 1 ? "À lire" : a_voir[0].genre === "annonce" ? "Annonce du staff" : "Petit rappel"),
    el("div", { class: "contenu-feuille" }, el("div", { class: "liste-groupee" }, a_voir.map(p => el("div", { class: "ligne" },
      el("span", { class: "ligne-texte" }, el("strong", {}, p.titre), el("span", {}, p.texte),
        el("span", { class: "doux petit" }, ilYa(p.quand), p.de && ` · ${p.de}${p.genre === "annonce" ? ", staff" : ""}`)))))),
    sansNotifs() && el("p", { class: "doux petit" }, "Tu ne reçois pas les notifications sur cet appareil : sans elles, tu ne vois ces messages qu'en ouvrant l'appli."),
    el("div", { class: "actions" },
      el("button", { class: "btn principal large", type: "button", onclick: vu }, "J'ai vu"),
      sansNotifs() && el("button", { class: "btn large", type: "button", onclick: async () => { await vu(); location.hash = "#notifications"; } }, "Activer les notifications")),
  ].filter(Boolean));
  $("modale").hidden = false;
  document.body.classList.add("sans-defilement");
}
