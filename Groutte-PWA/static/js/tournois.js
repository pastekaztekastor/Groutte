import { app, el, icone, avatar, envoyer, pluriel } from "./commun.js";

/* #tournois : Tournois > Inscription. Un bloc par tournoi (tournois.json, sur le serveur) : le nom, la description,
   les prérequis, les jeux avec leur page Steam, et « Je m'inscris ». S'inscrire donne le rôle du tournoi (affiché dans
   le carnet d'adresses). Les blocs servent aussi au guide de bienvenue (bienvenue.js). */

const inscrit = t => t.inscrits.includes(app.moi);

function bloc(t) {
  const coche = el("input", { type: "checkbox", role: "switch", checked: inscrit(t), "aria-label": `M'inscrire : ${t.nom}` });
  coche.onchange = () => envoyer("tournois/inscription", { tournoi: t.id, inscrit: coche.checked });
  return el("section", { class: "carte tournoi" + (inscrit(t) ? " inscrit" : "") },
    el("h3", {}, icone("fa-tournois"), t.nom),
    t.description && el("p", {}, t.description),
    t.prerequis.length > 0 && [el("h4", {}, "Prérequis"), el("ul", { class: "prerequis-tournoi" }, t.prerequis.map(p => el("li", {}, p)))],
    t.jeux.length > 0 && [el("h4", {}, t.jeux.length > 1 ? "Jeux" : "Jeu"), el("ul", { class: "jeux-tournoi" }, t.jeux.map(j => el("li", {},
      icone("fa-jeux"), j.steam ? el("a", { href: j.steam, target: "_blank", rel: "noopener" }, j.nom, el("span", { class: "doux petit" }, " · Steam")) : j.nom)))],
    el("label", { class: "ligne inscription-tournoi" },
      el("span", { class: "ligne-texte" }, "Je m'inscris", el("span", { class: "doux petit" }, `Rôle « ${t.role.nom} » dans le carnet d'adresses`)), coche),
    el("div", { class: "inscrits-tournoi" },
      el("span", { class: "doux petit" }, t.inscrits.length ? pluriel(t.inscrits.length, "inscrit") : "Personne pour l'instant"),
      el("span", { class: "pile-avatars" }, t.inscrits.slice(0, 8).map(n => avatar(n, 24)),
        t.inscrits.length > 8 && el("span", { class: "pile-plus" }, `+${t.inscrits.length - 8}`))));
}

export function blocsTournois() {
  return app.etat.tournois.length ? app.etat.tournois.map(bloc) : el("p", { class: "doux" }, "Pas encore de tournoi annoncé.");
}

export function vueInscription() {
  return [el("p", { class: "doux petit note" }, "Coche les tournois qui te tentent : tu peux changer d'avis jusqu'au début."), blocsTournois()];
}

export function resumeInscription() {
  const miens = app.etat.tournois.filter(inscrit).length;
  return miens ? `Inscrit à ${miens} sur ${app.etat.tournois.length}` : `${pluriel(app.etat.tournois.length, "tournoi")} à découvrir`;
}

/* Le widget de l'accueil : mes inscriptions. */
export function widgetTournois(widget) {
  const tournois = app.etat.tournois;
  if (!tournois.length) return null;
  return widget("#tournois", "fa-tournois", "Tournois", [
    el("span", { class: "widget-chiffre" }, tournois.filter(inscrit).length, el("small", {}, `sur ${tournois.length}`)),
    el("ul", { class: "widget-tournois" }, tournois.map(t => el("li", { class: inscrit(t) ? "oui" : "" },
      el("span", { class: "case", "aria-hidden": "true" }), t.nom))),
  ], { large: true });
}
