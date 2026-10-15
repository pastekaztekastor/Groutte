import { app, $, el, notifier, afficher, PREFIXE } from "./commun.js";
import { pris_en_charge, etatAppareil, activer } from "./notifs.js";

/* Écrans d'arrivée, par-dessus tout le reste :
   - téléphone, dans le navigateur : guide pour installer l'appli (adapté à iPhone ou Android) ;
   - première ouverture de l'appli installée, pour un compte : activation des notifications, obligatoire
     (sauf si le téléphone les a bloquées : une page web ne peut plus les redemander, on explique alors). */

const GUIDE_VU = PREFIXE + "-guide-vu";          // sessionStorage : « continuer dans le navigateur »
const NOTIFS_OK = PREFIXE + "-notifs-ok-";       // localStorage + nom : activées une fois sur cet appareil
const NOTIFS_BLOQUEES = PREFIXE + "-notifs-bloquees-";
const nomAppli = () => app.etat?.nom_court || "l'appli";   // le nom sous l'icône (config.json > nom_court)

const lire = (stockage, cle) => { try { return stockage.getItem(cle); } catch (e) { return null; } };
const ecrire = (stockage, cle, valeur) => { try { stockage.setItem(cle, valeur); } catch (e) { /* navigation privée */ } };

export function estInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function systeme() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return /Mobi/.test(ua) ? "mobile" : "ordinateur";
}

/* Petits pictogrammes à repérer sur l'écran du téléphone (traits, pas d'emoji). */
const PICTOS = {
  partager: ["M12 3v12", "M7.5 7.5L12 3l4.5 4.5", "M6 11v8.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V11"],
  ajouter: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M12 8v8", "M8 12h8"],
  points: ["M12 5h.01", "M12 12h.01", "M12 19h.01"],
  traits: ["M4 6h16", "M4 12h16", "M4 18h16"],
};

function picto(nom) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "picto" + (nom === "points" ? " epais" : ""));
  svg.setAttribute("aria-hidden", "true");
  for (const d of PICTOS[nom]) {
    const chemin = document.createElementNS(NS, "path");
    chemin.setAttribute("d", d);
    svg.append(chemin);
  }
  return svg;
}

function etapes(...lignes) {
  return el("ol", { class: "etapes" }, lignes.map((contenu, i) => el("li", {}, el("span", { class: "numero" }, String(i + 1)), el("span", {}, contenu))));
}

function entete(titre, texte) {
  return [
    el("img", { class: "icone-appli", src: "static/icones/icone-192.png", alt: "" }),
    el("h1", {}, titre),
    texte && el("p", {}, texte),
  ];
}

async function copierLien() {
  try { await navigator.clipboard.writeText(location.href.split("#")[0]); notifier("Lien copié.", true); }
  catch (e) { prompt("Copie ce lien :", location.href.split("#")[0]); }
}

/* --- Guide d'installation (téléphone, dans le navigateur) ----------------------------- */

function guideIos() {
  const ua = navigator.userAgent;
  // Chrome, Firefox, Google, ou le navigateur intégré d'une appli (Instagram, Facebook...) : il faut Safari.
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram/.test(ua)) {
    return [
      el("p", { class: "important" }, "Sur iPhone, l'appli s'installe depuis Safari, et les notifications ne marchent que comme ça."),
      etapes("Copie le lien avec le bouton ci-dessous.", "Ouvre Safari et colle le lien.", "Suis le guide qui s'affichera."),
      el("button", { class: "btn principal large", type: "button", onclick: copierLien }, "Copier le lien"),
    ];
  }
  return etapes(
    ["Touche ", picto("partager"), " Partager, en bas de l'écran (en haut sur iPad)."],
    ["Fais défiler et choisis ", picto("ajouter"), " « Sur l'écran d'accueil »."],
    "Touche « Ajouter » en haut à droite.",
    `Ouvre l'appli depuis sa nouvelle icône, « ${nomAppli()} ».`);
}

function guideAndroid() {
  if (app.vientDInstaller) {
    return [el("p", { class: "important" }, "C'est installé !"),
      etapes("Ferme le navigateur.", `Ouvre « ${nomAppli()} » depuis ton écran d'accueil ou la liste de tes applis.`)];
  }
  if (app.installation) {
    return [
      el("button", {
        class: "btn principal large", type: "button",
        onclick: async () => { app.installation.prompt(); await app.installation.userChoice; app.installation = null; afficher(); },
      }, "Installer l'appli"),
      el("p", { class: "doux petit" }, `Puis ouvre « ${nomAppli()} » depuis ton écran d'accueil.`),
    ];
  }
  if (/SamsungBrowser/.test(navigator.userAgent)) {
    return etapes(
      ["Touche le menu ", picto("traits"), " en bas à droite."],
      "Choisis « Ajouter page à », puis « Écran d'accueil ».",
      `Ouvre l'appli depuis sa nouvelle icône, « ${nomAppli()} ».`);
  }
  return etapes(
    ["Touche le menu ", picto("points"), " en haut à droite du navigateur."],
    "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »), puis confirme.",
    `Ouvre l'appli depuis sa nouvelle icône, « ${nomAppli()} ».`);
}

function guide() {
  const os = systeme();
  return [
    entete("Installe l'appli", "Plein écran, une icône sur ton téléphone, et surtout les notifications."),
    os === "ios" ? guideIos() : os === "android" ? guideAndroid()
      : el("p", {}, "Dans le menu du navigateur, choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »."),
    el("button", {
      class: "lien-discret", type: "button",
      onclick: () => { ecrire(sessionStorage, GUIDE_VU, "1"); afficher(); },
    }, "Continuer dans le navigateur"),
  ];
}

/* --- Activation des notifications (première ouverture de l'appli installée) ------------ */

function ecranNotifs() {
  if (Notification.permission === "denied") {
    const ios = systeme() === "ios";
    return [
      entete("Notifications bloquées", "Le téléphone a bloqué les notifications de l'appli : elle ne peut plus les redemander elle-même."),
      etapes(...(ios
        ? ["Ouvre les Réglages de l'iPhone.", `Notifications, puis « ${nomAppli()} ».`, "Active « Autoriser les notifications ».", "Reviens ici et touche « Réessayer »."]
        : [`Appui long sur l'icône « ${nomAppli()} », puis « Infos sur l'appli » (ou i).`, "Notifications : active-les.", "Reviens ici et touche « Réessayer »."])),
      el("button", { class: "btn principal large", type: "button", onclick: () => afficher() }, "Réessayer"),
      el("button", {
        class: "lien-discret", type: "button",
        onclick: () => { ecrire(localStorage, NOTIFS_BLOQUEES + app.moi, "1"); afficher(); },
      }, "Continuer sans notifications"),
    ];
  }
  return [
    entete("Active les notifications", "C'est comme ça que tu sauras quand il se passe quelque chose, même appli fermée."),
    el("button", {
      class: "btn principal large", type: "button",
      onclick: async () => {
        await activer();
        if (etatAppareil() === "actif") ecrire(localStorage, NOTIFS_OK + app.moi, "1");
        afficher();
      },
    }, "Activer les notifications"),
    el("p", { class: "doux petit" }, "Tu pourras ensuite choisir ce que tu reçois, dans Réglages."),
  ];
}

function doitActiverNotifs() {
  if (!estInstallee() || !app.moi || !app.etat?.notifs?.disponible) return false;
  if (!window.isSecureContext || !pris_en_charge()) return false;
  if (lire(localStorage, NOTIFS_OK + app.moi)) return false;                     // déjà fait une fois pour ce compte
  if (etatAppareil() === "actif") { ecrire(localStorage, NOTIFS_OK + app.moi, "1"); return false; }
  if (Notification.permission === "denied" && lire(localStorage, NOTIFS_BLOQUEES + app.moi)) return false;
  return etatAppareil() === "inactif";                                          // null : vérification en cours
}

/* Appelé à chaque rendu (main.js) : affiche l'écran d'arrivée qui s'impose, ou aucun. */
export function majEcrans() {
  const ecran = $("ecran");
  const mobile = ["ios", "android", "mobile"].includes(systeme());
  const contenu = mobile && !estInstallee() && !lire(sessionStorage, GUIDE_VU) ? guide()
    : doitActiverNotifs() ? ecranNotifs()
    : null;
  ecran.hidden = !contenu;
  if (contenu) ecran.replaceChildren(...[contenu].flat(Infinity).filter(Boolean));
}
