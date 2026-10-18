import { app, el, compte, envoyer } from "./commun.js";
import { tete, blocIdentite, blocPartage, blocAlimentation, blocCouchage } from "./fiche.js";
import { mesDates } from "./presence.js";
import { vueRembourser } from "./rembourser.js";
import { blocsTournois } from "./tournois.js";

/* #bienvenue/<étape> : le guide de la première connexion, une page par sujet. Les champs sont ceux de Ma fiche,
   Présence et Moyen de paiement : ce que le staff a déjà rempli (pendant l'orga, avant l'appli) est déjà là, il
   suffit de vérifier. Chaque champ s'enregistre tout seul ; « Passer le guide » ou la dernière page le marquent vu
   (profil « guide_vu »), et il ne revient plus. Tant qu'il n'est pas vu, il remplace toutes les pages (rubriques.js). */

const ETAPES = [
  ["", "Bienvenue"],
  ["toi", "Qui es-tu ?"],
  ["dates", "Quand viens-tu ?"],
  ["manger", "Manger et participer"],
  ["dormir", "Pour dormir"],
  ["tournois", "Les tournois"],
  ["rembourser", "Te rembourser"],
  ["fin", "C'est prêt"],
];

const indice = etape => Math.max(0, ETAPES.findIndex(([id]) => id === etape));

export const titreBienvenue = etape => ETAPES[indice(etape)][1];

async function terminer() {
  if (await envoyer("profil", { guide_vu: true })) location.replace("#");
}

/* Ce que le staff a déjà noté pour moi : de quoi dire « vérifie » plutôt que « remplis ». */
function dejaRempli(m) {
  return Boolean(m.prenom || m.telephone || m.discord || app.etat.presences[app.moi] || m.regimes.length || m.matelas != null);
}

function contenu(etape, m) {
  if (etape === "") {
    return [
      el("section", { class: "contact-tete" }, el("h1", {}, `Salut ${m.prenom || m.nom} !`)),
      el("p", {}, "Quelques pages pour que tout soit prêt : qui tu es, quand tu viens, ce que tu manges, où tu dors, les tournois, et comment on te rembourse."),
      el("p", { class: "doux" }, dejaRempli(m)
        ? "On a déjà noté ce que tu nous as dit pendant l'orga : vérifie, et complète ce qui manque."
        : "Tout s'enregistre au fur et à mesure. Tu pourras tout changer plus tard."),
    ];
  }
  if (etape === "toi") return [tete(m), blocIdentite(m)];
  if (etape === "dates") return mesDates();
  if (etape === "manger") return [blocAlimentation(m), blocPartage(m)];
  if (etape === "dormir") return blocCouchage(m);
  if (etape === "tournois") return [el("p", { class: "doux" }, "Coche ceux qui te tentent : tu pourras changer d'avis plus tard."), blocsTournois()];
  if (etape === "rembourser") return vueRembourser();
  return [
    el("p", {}, "C'est tout bon ! Tout ce que tu viens de voir se retrouve dans le menu : Ma fiche, Présence, Tournois, Moyen de paiement."),
    el("p", { class: "doux" }, "L'accueil te dira s'il te reste quelque chose à faire."),
  ];
}

export function vueBienvenue(etape) {
  const m = compte(app.moi);
  const i = indice(etape);
  const lien = j => "#bienvenue" + (ETAPES[j][0] ? "/" + ETAPES[j][0] : "");
  const derniere = i === ETAPES.length - 1;
  return [
    el("div", { class: "progression-guide", role: "progressbar", "aria-valuemin": 1, "aria-valuemax": ETAPES.length, "aria-valuenow": i + 1,
      "aria-label": `Étape ${i + 1} sur ${ETAPES.length}` }, ETAPES.map((_, j) => el("span", { class: j <= i ? "faite" : "" }))),
    contenu(ETAPES[i][0], m),
    el("div", { class: "actions guide-actions" },
      i > 0 && el("a", { class: "btn large", href: lien(i - 1) }, "Précédent"),
      derniere
        ? el("button", { class: "btn principal large", type: "button", onclick: terminer }, "Aller à l'accueil")
        : el("a", { class: "btn principal large", href: lien(i + 1) }, i === 0 ? "C'est parti" : "Suivant"),
      !derniere && el("button", { class: "lien-discret", type: "button", onclick: terminer }, "Passer le guide")),
  ];
}
