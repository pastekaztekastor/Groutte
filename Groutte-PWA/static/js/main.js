import { app, $, el, icone, titreAppli, compte, themeDe, appliquerMode, charger, fermerModale, afficherConnexion, nouveauCode, marquerLu, definirRendu, afficher } from "./commun.js";
import { majEcrans } from "./installation.js";
import { telephone, bulleCompte, dessinerPanneau, fermerPanneau } from "./panneau.js";
import { ecran, A_RAFRAICHIR } from "./rubriques.js";
import { fenetrePings, nonLus } from "./pings.js";

/* Point d'entrée : le rendu de toute la page, à chaque changement (état reçu, adresse changée, action).
   Rien ici n'est propre à une appli : les écrans sont déclarés dans rubriques.js.

   Navigation par l'adresse (#rubrique/argument) : un lien change l'adresse, la page se redessine. Le bouton retour
   du téléphone et du navigateur marche donc partout. Deux sortes d'écrans :
   - écran de rubrique : la bulle de compte (téléphone), un grand titre, l'action éventuelle ;
   - écran poussé (avec `retour`) : une barre en haut avec la flèche, le titre au centre. */

$("modale").addEventListener("click", ev => { if (ev.target === $("modale")) fermerModale(); });
document.addEventListener("keydown", ev => { if (ev.key === "Escape") fermerModale(); });
telephone.addEventListener("change", () => afficher());

let versionChargee = null;   // version du site au moment où cette page a été ouverte
$("mettre-a-jour").addEventListener("click", () => location.reload());
$("retour").addEventListener("click", ev => {
  // Sans adresse de retour : on revient d'où l'on vient.
  if (!$("retour").dataset.lien) { ev.preventDefault(); history.length > 1 ? history.back() : (location.hash = "#"); }
});

/* Une clé de nouveautés (« notes/<id> », « notes ») a-t-elle du nouveau ? */
function aDuNouveau(cle) {
  const [type, id] = cle.split("/");
  const n = app.etat.non_lus?.[type];
  return id ? Boolean(n?.[id]) : Boolean(n && (typeof n === "object" ? Object.keys(n).length : n));
}

function dessiner() {
  if (!app.etat) return;
  majEcrans();
  const connecte = Boolean(app.etat.moi) && compte(app.moi);
  if (!connecte) afficherConnexion();
  document.title = titreAppli();
  const m = connecte ? compte(app.moi) : null;
  majPastille(m ? nonLus() : 0);
  if (!m) { dessinerPanneau(); $("vue").replaceChildren(); $("barre-nav").hidden = true; return; }
  // Code provisoire (remis à zéro par le staff) : on choisit son code avant tout le reste.
  if (app.etat.moi.code_provisoire && !$("connexion").dataset.code) nouveauCode(m.nom, "Ton code était provisoire : choisis ton code à toi.");
  // Thème du compte : une couleur, tokens.css en tire toute l'échelle.
  const theme = themeDe(m.couleur);
  document.documentElement.style.setProperty("--c", theme.couleur);
  document.documentElement.style.setProperty("--sur-c", theme.texte);
  // Le site a changé depuis l'ouverture de cette page : on propose la mise à jour.
  versionChargee ??= app.etat.version;
  $("alerte-maj").hidden = app.etat.version === versionChargee;

  let [rubrique = "", argument = ""] = location.hash.slice(1).split("/");
  try { argument = decodeURIComponent(argument); } catch (e) { argument = ""; }
  const e = ecran(rubrique, argument);

  // La page ouverte est lue : sa pastille disparaît avant même d'être dessinée.
  if (app.etat.non_lus?.initialiser) marquerLu(null);
  if (e.lu && aDuNouveau(e.lu)) marquerLu(e.lu);
  dessinerPanneau();

  // Écran sans panneau (le guide de bienvenue) : ni panneau, ni bulle de compte, ni voile.
  document.body.classList.toggle("sans-panneau", Boolean(e.sansPanneau));
  if (e.sansPanneau) fermerPanneau();
  const bulle = taille => !e.sansPanneau && telephone.matches && bulleCompte(taille);

  const pousse = Boolean(e.retour);
  $("barre-nav").hidden = !pousse;
  document.body.classList.toggle("avec-nav", pousse);
  document.body.classList.toggle("avec-envoi", Boolean(e.avecEnvoi));
  if (pousse) {
    const [lien, libelle] = e.retour;
    $("retour").href = lien || "#";
    $("retour").dataset.lien = lien || "";
    // Téléphone : la bulle de compte reste à gauche du retour, pour aller ailleurs sans revenir en arrière
    // (sauf sur un écran d'écriture, « Annuler » : on n'en sort que par Annuler ou en validant).
    const b = libelle !== "Annuler" && bulle(30);
    $("gauche-nav").replaceChildren(...(b ? [b] : []), $("retour"));
    // « Annuler » : en toutes lettres, sans flèche (comme sur iPhone). Sinon flèche + nom de l'écran parent,
    // nom caché sur téléphone (la place va à la bulle et au titre).
    $("retour").replaceChildren(...(libelle === "Annuler" ? [libelle] : [icone("chevron-gauche"), el("span", { class: "libelle-retour" }, libelle)]));
    $("retour").setAttribute("aria-label", libelle === "Annuler" ? "Annuler" : `Retour : ${libelle}`);
    $("titre-nav").textContent = e.titre;
  }
  // Action de l'écran : sur téléphone, une bulle ronde en bas à droite (pour le pouce) ; sinon une icône en haut à droite.
  const action = e.action && el("button", {
    type: "button", class: "bouton-action" + (telephone.matches ? " bulle-action" : ""),
    "aria-label": e.action[1], title: e.action[1], onclick: e.action[2],
  }, icone(e.action[0]));
  const actionEnHaut = action && !telephone.matches ? action : null;
  $("action-nav").replaceChildren(...(pousse && actionEnHaut ? [actionEnHaut] : []));
  const entete = [
    !pousse && el("div", { class: "entete-titre" }, bulle(), el("h1", { class: "grand-titre" }, e.titre), actionEnHaut),
    telephone.matches && action,
  ];
  $("vue").replaceChildren(...[entete, e.vue()].flat(3).filter(Boolean));
  // À l'ouverture : les annonces du staff et les relances pas encore lues (Pings reçus), une fois par chargement.
  if (!app.etat.moi.code_provisoire) fenetrePings();
}

/* La pastille sur l'icône de l'appli : le nombre de pings non lus, recalé à chaque dessin. Le service worker l'augmente
   de un à chaque notification reçue, appli fermée (sw.js, augmenterPastille) : il repart de ce nombre-là. */
let pastille = null;
function majPastille(n) {
  if (n === pastille || !navigator.setAppBadge) return;
  pastille = n;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  // Le compteur du service worker (même nom de cache que CACHE dans sw.js).
  if (window.caches) caches.open("groutte").then(c => c.put(new URL("__pastille", location.href).href.split("#")[0], new Response(String(n)))).catch(() => {});
}

async function rafraichir() {
  if (document.hidden) return;
  await Promise.all(A_RAFRAICHIR.map(f => f()));
  await charger(true);
}

/* Appli installable : le service worker, et l'invitation d'installation d'Android gardée pour plus tard. */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
window.addEventListener("beforeinstallprompt", ev => {
  ev.preventDefault();
  app.installation = ev;
  afficher();
});
window.addEventListener("appinstalled", () => { app.installation = null; app.vientDInstaller = true; afficher(); });

appliquerMode();
definirRendu(dessiner);
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); afficher(); });
charger();
setInterval(rafraichir, 30000);
document.addEventListener("visibilitychange", rafraichir);
