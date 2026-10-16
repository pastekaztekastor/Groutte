import { app, el, avatar, compte, themes, couleurTheme, modeAffichage, changerMode, deconnecter, envoyer, televerser, reduireImage,
  notifier, saisie, oublier, afficher, nouveauCode } from "./commun.js";
import { blocNotifications, desactiverAppareil } from "./notifs.js";

/* Réglages du compte, façon Réglages de l'iPhone : photo, thème, mode clair ou sombre, code ; et les pages
   Notifications, Installer l'appli, Annonce (staff). */

export async function seDeconnecter() {
  await desactiverAppareil();   // l'appareil ne doit plus recevoir les notifications de ce compte
  deconnecter();
}

/* Photo de profil : réduite dans le navigateur (512 px) puis envoyée ; elle remplace l'ancienne. */
function photo(m) {
  const entree = el("input", { type: "file", accept: "image/*", class: "cache" });
  entree.onchange = async () => {
    const fichier = entree.files[0];
    entree.value = "";
    if (fichier && await televerser({ type: "avatar" }, await reduireImage(fichier, 512))) { afficher(); notifier("Photo enregistrée.", true); }
  };
  return el("div", { class: "photo-profil" },
    avatar(m.nom, 96),
    el("strong", {}, m.nom),
    el("div", { class: "rangee" },
      el("label", { class: "discret" }, m.avatar ? "Changer la photo" : "Ajouter une photo", entree),
      m.avatar && el("button", { class: "discret danger", type: "button", onclick: () => { if (confirm("Retirer ta photo ?")) envoyer("avatar/supprimer"); } }, "Retirer")));
}

/* Thème : une pastille par couleur ; le choix s'applique et s'enregistre tout de suite. */
function choixTheme(m) {
  const actuel = couleurTheme(m.couleur);
  return el("span", { class: "points-theme", role: "radiogroup", "aria-label": "Thème" }, themes().map(t => el("button", {
    type: "button", class: "point-theme" + (t.couleur === actuel ? " choisi" : ""), role: "radio",
    "aria-checked": String(t.couleur === actuel), "aria-label": t.nom, title: t.nom, style: `--nuance: ${t.couleur}`,
    onclick: async () => {
      const avant = m.couleur;
      m.couleur = t.couleur;
      afficher();
      if (!await envoyer("profil", { couleur: t.couleur })) { m.couleur = avant; afficher(); }
    },
  })));
}

/* Apparence : clair, sombre ou comme le téléphone, sur cet appareil seulement. */
function choixMode() {
  const actuel = modeAffichage();
  return el("div", { class: "segments", role: "radiogroup", "aria-label": "Apparence" },
    [["clair", "Clair"], ["sombre", "Sombre"], ["auto", "Auto"]].map(([mode, libelle]) => el("button", {
      type: "button", class: mode === actuel ? "choisi" : "", role: "radio", "aria-checked": String(mode === actuel),
      title: mode === "auto" ? "Comme le téléphone" : null,
      onclick: () => { changerMode(mode); afficher(); },
    }, libelle)));
}

export function vueReglages() {
  const m = compte(app.moi);
  return [
    photo(m),
    el("h2", {}, "Apparence"),
    el("div", { class: "liste-groupee" },
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Thème"), choixTheme(m)),
      el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Mode"), choixMode())),
    el("h2", {}, "Sécurité"),
    el("div", { class: "liste-groupee" },
      el("button", { type: "button", class: "ligne entree", onclick: () => nouveauCode(m.nom, "Choisis ton nouveau code.", true) },
        el("span", { class: "ligne-texte" }, "Changer mon code", el("span", { class: "doux petit" }, "Le code à 4 chiffres qui protège ton compte")))),
  ];
}

export function vueNotifications() {
  return blocNotifications();
}

/* Installer le site comme une appli : bouton sur Android (quand le navigateur le propose), mode d'emploi sinon. */
export function vueAppli() {
  const installee = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let contenu;
  if (installee) contenu = el("p", { class: "doux petit" }, "Tu utilises déjà l'appli.");
  else if (app.installation) {
    contenu = [
      el("p", { class: "doux petit" }, "Installe le site comme une appli : une icône sur l'écran d'accueil, en plein écran."),
      el("button", {
        class: "btn principal large", type: "button",
        onclick: async () => { app.installation.prompt(); await app.installation.userChoice; app.installation = null; afficher(); },
      }, "Installer l'appli"),
    ];
  } else if (iphone) {
    contenu = el("p", { class: "doux petit" }, "Sur iPhone : dans Safari, touche le bouton Partager puis « Sur l'écran d'accueil ».");
  } else {
    contenu = el("p", { class: "doux petit" }, "Dans le menu du navigateur, choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
  }
  return el("section", { class: "carte" }, contenu);
}

/* Staff : une annonce à tout le monde, quelles que soient les préférences de notification. */
export function vueAnnonce() {
  const cle = "annonce";
  const texte = saisie(cle, { maxlength: 240, rows: 3, required: true, placeholder: "Ton message", "aria-label": "Annonce" }, true);
  const abonnes = app.etat.notifs.abonnes;
  return [
    el("form", {
      onsubmit: async ev => {
        ev.preventDefault();
        if (await envoyer("notifs/annonce", { texte: texte.value })) { oublier(cle); notifier("Annonce envoyée.", true); afficher(); }
      },
    }, el("div", { class: "carte" }, texte), el("div", { class: "actions" }, el("button", { class: "btn principal large", type: "submit" }, "Envoyer"))),
    el("p", { class: "doux petit note" }, abonnes.length
      ? `Reçue par ceux qui ont activé les notifications : ${abonnes.join(", ")}.`
      : "Personne n'a encore activé les notifications."),
  ];
}
