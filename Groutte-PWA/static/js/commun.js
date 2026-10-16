import { ICONES_PLEINES } from "./icones-fa.js";

/* Briques communes à toutes les pages : état partagé, construction du DOM, échanges avec le serveur, dates,
   avatars, icônes, fenêtres, connexion (choix du compte, code, inscription), pastilles « nouveau ». */

/* Préfixe de tout ce qui est rangé dans le navigateur (localStorage) : change-le d'une appli à l'autre,
   sinon deux applis servies depuis le même domaine se mélangeraient. */
export const PREFIXE = "groutte";
const CLE = PREFIXE + "-compte";
const CLE_JETON = PREFIXE + "-jeton";   // jeton remis par le serveur à la saisie du code (acces.py)

export const formatLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/* État partagé entre les modules (un module ne peut pas réassigner la variable d'un autre). */
export const app = {
  etat: null,           // la réponse de /api/etat (etat.py), remplacée à chaque chargement et chaque action
  moi: null,            // le nom du compte choisi sur cet appareil
  jeton: "",
  installation: null,   // invitation « Installer l'appli » d'Android, quand le navigateur la propose
};
export const brouillons = {};    // saisies en cours, gardées quand la page se redessine

/* Hors production, le serveur pose l'environnement sur <html> (environnement.py) : « test », « local », ou rien.
   Il s'ajoute au nom de l'appli, pour ne pas confondre deux applis installées côte à côte. */
export const ENVIRONNEMENT = document.documentElement.dataset.environnement || "";
export const ICONES_APPLI = "static/icones/" + (ENVIRONNEMENT ? ENVIRONNEMENT + "/" : "");   // les icônes de l'appli, celles de l'environnement
export const titreAppli = () => app.etat.titre + (ENVIRONNEMENT ? ` (${ENVIRONNEMENT})` : "");
export const nomCourtAppli = () => app.etat?.nom_court && app.etat.nom_court + (ENVIRONNEMENT ? " " + ENVIRONNEMENT : "");
try { app.moi = localStorage.getItem(CLE); app.jeton = localStorage.getItem(CLE_JETON) || ""; } catch (e) { app.jeton = ""; }

/* Lire et écrire dans le navigateur sans planter (navigation privée, stockage bloqué). */
export const lireLocal = cle => { try { return localStorage.getItem(PREFIXE + "-" + cle); } catch (e) { return null; } };
export const ecrireLocal = (cle, valeur) => { try { localStorage.setItem(PREFIXE + "-" + cle, valeur); } catch (e) { /* tant pis */ } };

/* En-têtes de chaque demande au serveur : le jeton de l'appareil, s'il y en a un. */
export const entetes = (autres = {}) => app.jeton ? { ...autres, "X-Jeton": app.jeton } : autres;

function oublierJeton() {
  app.jeton = "";
  try { localStorage.removeItem(CLE_JETON); } catch (e) {}
}

export const $ = id => document.getElementById(id);
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const depuisIso = s => { const [a, m, j] = s.split("-").map(Number); return new Date(a, m - 1, j); };
export const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
export const dateLongue = jour => majuscule(formatLong.format(depuisIso(jour)));
export const compte = nom => app.etat.comptes.find(c => c.nom === nom);
export const estStaff = () => !!compte(app.moi)?.staff;
export const sansAccent = t => (t || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export const tronquer = (t, n) => t.length > n ? t.slice(0, n).trimEnd() + "..." : t;
export const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
export const dateCourte = jour => `${jour.slice(8, 10)}/${jour.slice(5, 7)}`;   // « 28/12 »
export const jourCourt = jour => majuscule(depuisIso(jour).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" }));

/* Mode modération (staff, sur cet appareil) : les outils de modération du forum s'affichent. Actif par défaut. */
export function modeModeration() {
  return estStaff() && lireLocal("moderation") !== "0";
}

export function changerModeModeration(actif) {
  ecrireLocal("moderation", actif ? "1" : "0");
}

/* Construit un élément. Les enfants texte deviennent des nœuds texte : rien n'est interprété comme du HTML
   (aucune injection possible depuis le texte d'un utilisateur). false, null et undefined sont ignorés, ce qui
   permet d'écrire `condition && el(...)`. Les tableaux d'enfants sont aplatis. */
export function el(tag, props = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e[k] = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of enfants.flat(Infinity)) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

/* Champ de saisie dont la valeur survit aux rafraîchissements de la page (la page est redessinée en entier
   à chaque changement d'état : sans ça, ce qu'on tape disparaîtrait). `cle` : unique par champ. */
export function saisie(cle, props = {}, multiligne = false) {
  const { valeur = "", ...attributs } = props;
  const e = el(multiligne ? "textarea" : "input", attributs);
  e.value = cle in brouillons ? brouillons[cle] : valeur;
  e.addEventListener("input", () => { brouillons[cle] = e.value; });
  return e;
}

export function oublier(prefixe) {
  for (const cle of Object.keys(brouillons)) if (cle.startsWith(prefixe)) delete brouillons[cle];
}

export function texteLisible(couleur) {
  const n = parseInt(couleur.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#1f1b18" : "#f2ebd8";
}

/* Thèmes (config.json, « themes ») : une couleur (boutons, liens, sélection, initiale sans photo) et la couleur
   du texte posé dessus. tokens.css en tire toute l'échelle, en clair et en sombre. Une couleur qui n'est celle
   d'aucun thème prend le premier. */
export const themes = () => app.etat?.themes?.length ? app.etat.themes : [{ nom: "Persian plum", couleur: "#5c1f2e", texte: "#fdfdfc" }];
export const themeDe = couleur => themes().find(t => t.couleur === couleur?.toLowerCase()) || themes()[0];
export const couleurTheme = couleur => themeDe(couleur).couleur;

/* Photo du compte, ou à défaut un rond de sa couleur avec son initiale. */
export function avatar(nom, taille = 22) {
  const c = compte(nom);
  const couleur = couleurTheme(c?.couleur);
  const e = el("span", { class: "avatar", title: nom });
  if (taille) e.style.setProperty("--taille", taille + "px");
  e.style.setProperty("--couleur", couleur);
  if (c?.avatar) e.append(el("img", { src: c.avatar, alt: "", loading: "lazy" }));
  else {
    e.textContent = (nom || "?").charAt(0).toUpperCase();
    e.style.color = texteLisible(couleur);
  }
  return e;
}

/* Un compte : sa photo seule (le nom au survol et pour les lecteurs d'écran), avec `lien` vers sa fiche du carnet.
   avatarNomme : photo et nom. */
export function qui(nom, lien = false) {
  return el(lien ? "a" : "span", { class: "qui", href: lien ? lienContact(nom) : null, title: nom, "aria-label": nom }, avatar(nom, 26));
}

/* La fiche d'une personne dans le carnet (la mienne : Ma fiche). */
export const lienContact = nom => nom === app.moi ? "#fiche" : "#carnet/" + encodeURIComponent(nom);

export function avatarNomme(nom) {
  return el("span", { class: "qui" }, avatar(nom), nom);
}

/* Apparence (Réglages, mémorisée sur l'appareil) : clair, sombre, ou auto (comme le téléphone, par défaut).
   Appliquée aussi dès le <head> d'index.html, pour éviter un éclair blanc. */
export function modeAffichage() {
  return lireLocal("mode") || "auto";
}

export function appliquerMode() {
  const mode = modeAffichage();
  const sombre = mode === "sombre" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("sombre", sombre);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", sombre ? "#111110" : "#f1f0ef");
}

export function changerMode(mode) {
  ecrireLocal("mode", mode);
  appliquerMode();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", appliquerMode);

/* Pictogrammes en traits SVG (viewBox 24, trait réglé en CSS), pour les petits boutons d'action. Pas d'emoji. */
const ICONES = {
  crayon: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  poubelle: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
  "chevron-bas": ["M6 9l6 6 6-6"],
  "chevron-droite": ["M9 6l6 6-6 6"],
  "chevron-gauche": ["M15 6l-6 6 6 6"],
  telecharger: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  fermer: ["M6 6l12 12", "M18 6L6 18"],
  coche: ["M5 12.5l4.5 4.5L19 7"],
  image: ["M4 5h16v14H4z", "M4 16l5-5 4 4 3-3 4 4", "M15.5 7.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z"],
  envoyer: ["M4 12L20 4l-5 16-4-7z", "M11 13l9-9"],
  epingle: ["M9 4h6", "M10 4v6l-3 4h10l-3-4V4", "M12 14v6"],
  cadenas: ["M6 11h12v9H6z", "M9 11V8a3 3 0 0 1 6 0v3"],
  cloche: ["M6 16V11a6 6 0 0 1 12 0v5l2 2H4z", "M10 20a2 2 0 0 0 4 0"],
  "cloche-barree": ["M6 16V11a6 6 0 0 1 9-5.2", "M18 11v5l2 2H8", "M10 20a2 2 0 0 0 4 0", "M4 4l16 16"],
  plus: ["M12 5v14", "M5 12h14"],
  info: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 11v5", "M12 8h.01"],
};

/* Une icône dessinée à la main (static/icones/ui/<nom>.svg, listée par le serveur) remplace le pictogramme. */
const iconeDessinee = nom => app.etat?.icones?.includes(nom)
  ? el("img", { class: "icone dessinee", src: `static/icones/ui/${nom}.svg`, alt: "", "aria-hidden": "true" }) : null;

/* Pictogramme en traits (ICONES), ou icône pleine de Font Awesome Free (« fa-... », icones-fa.js). */
export function icone(nom) {
  const dessin = iconeDessinee(nom);
  if (dessin) return dessin;
  const pleine = ICONES_PLEINES[nom];
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", pleine ? pleine[0] : "0 0 24 24");
  svg.setAttribute("class", pleine ? "icone pleine" : "icone");
  svg.setAttribute("aria-hidden", "true");
  for (const d of pleine ? pleine[1] : ICONES[nom] || []) {
    const trace = document.createElementNS(NS, "path");
    trace.setAttribute("d", d);
    svg.append(trace);
  }
  return svg;
}

/* Flèche du vote « +1 » du forum (pleine quand j'ai voté, en CSS). */
export function flecheVote() {
  const dessin = iconeDessinee("vote");
  if (dessin) return dessin;
  const NS = "http://www.w3.org/2000/svg";
  const fleche = document.createElementNS(NS, "svg");
  fleche.setAttribute("viewBox", "0 0 24 24");
  fleche.setAttribute("aria-hidden", "true");
  const trace = document.createElementNS(NS, "path");
  trace.setAttribute("d", "M12 4l7 9h-4v7H9v-7H5z");
  fleche.append(trace);
  return fleche;
}

export function boutonIcone(nom, libelle, onclick, actif = false) {
  return el("button", { type: "button", class: "bouton-icone" + (actif ? " actif" : ""), "aria-label": libelle, title: libelle, onclick }, icone(nom));
}

/* Message en bas de l'écran : erreur (6 s) ou confirmation (`ok`, 2,5 s). */
export function notifier(message, ok = false) {
  const n = $("notification");
  n.textContent = message;
  n.className = ok ? "ok" : "";
  n.hidden = false;
  clearTimeout(notifier.minuteur);
  notifier.minuteur = setTimeout(() => { n.hidden = true; }, ok ? 2500 : 6000);
}

/* --- Échanges avec le serveur ---------------------------------------------------------------------------
   charger() : relit tout l'état (ouverture, toutes les 30 s, retour sur l'appli).
   envoyer(route, corps) : une action POST ; le serveur répond avec l'état complet, qu'on redessine.
   Le nom du compte est ajouté à chaque envoi : le serveur vérifie ce qu'il a le droit de faire. */
export async function charger(auto = false) {
  try {
    const r = await fetch("api/etat?nom=" + encodeURIComponent(app.moi || ""), { cache: "no-store", headers: entetes() });
    if (r.status === 401) return codeRefuse();
    app.etat = await r.json();
    // Le staff a corrigé le nom de ce compte : l'appareil le suit.
    if (app.etat.renomme) { app.moi = app.etat.renomme; try { localStorage.setItem(CLE, app.moi); } catch (e) {} }
  } catch (e) {
    notifier("Impossible de joindre le serveur.");
    return;
  }
  // Pas de redessin automatique pendant qu'on tape : le clavier du téléphone se fermerait.
  if (auto && document.activeElement?.matches("input, textarea, select")) return;
  afficher();
}

/* `options.siLibre` : ne redessine pas si un champ a le focus (Ma fiche enregistre chaque champ quand on le quitte :
   le redessin fermerait le clavier ouvert sur le champ suivant). */
export async function envoyer(route, corps = {}, options = {}) {
  try {
    const r = await fetch("api/" + route, {
      method: "POST",
      headers: entetes({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...corps, nom: app.moi }),
    });
    if (r.status === 401) { codeRefuse(); return false; }
    const reponse = await r.json();
    if (!r.ok) throw new Error(reponse.erreur || r.statusText);
    app.etat = reponse;
    if (!(options.siLibre && document.activeElement?.matches("input, textarea, select"))) afficher();
    return true;
  } catch (e) {
    notifier("Pas enregistré : " + e.message);
    return false;
  }
}

/* Lecture à part (détail trop lourd pour l'état général, ex. GET /api/note?id=). */
export async function lire(route, parametres = {}) {
  const r = await fetch("api/" + route + "?" + new URLSearchParams({ ...parametres, nom: app.moi || "" }), { cache: "no-store", headers: entetes() });
  if (r.status === 401) { codeRefuse(); throw new Error("code demandé"); }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || r.statusText);
  return r.json();
}

/* Envoie un fichier brut (photo de profil, image). */
export async function televerser(parametres, contenu) {
  try {
    const requete = new URLSearchParams({ ...parametres, nom: app.moi });
    const r = await fetch("api/televerser?" + requete, { method: "POST", body: contenu, headers: entetes() });
    const reponse = await r.json().catch(() => ({ erreur: r.status === 413 ? "fichier trop gros" : r.statusText }));
    if (!r.ok) throw new Error(reponse.erreur || r.statusText);
    app.etat = reponse;
    return true;
  } catch (e) {
    notifier("Envoi impossible : " + e.message);
    return false;
  }
}

/* Réduit une image dans le navigateur (moins de forfait, moins de place). Les GIF restent tels quels.
   Si le navigateur n'y arrive pas (format inconnu, ou trop lent), on renvoie l'original. */
export async function reduireImage(fichier, cote = 2560, qualite = 0.92) {
  if (fichier.type === "image/gif") return fichier;
  const delai = new Promise(ok => setTimeout(() => ok(fichier), 8000));
  return Promise.race([reduire(fichier, cote, qualite), delai]);
}

async function reduire(fichier, cote, qualite) {
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, cote / Math.max(image.width, image.height));
    const toile = document.createElement("canvas");
    toile.width = Math.round(image.width * echelle);
    toile.height = Math.round(image.height * echelle);
    toile.getContext("2d").drawImage(image, 0, 0, toile.width, toile.height);
    const blob = await new Promise(ok => toile.toBlob(ok, "image/jpeg", qualite));
    return blob && blob.size < fichier.size ? blob : fichier;
  } catch (e) {
    return fichier;
  }
}

/* Aperçu léger d'une image pour l'affichage dans les pages (l'original sert à la visionneuse et au téléchargement). */
export function urlApercu(id) {
  return "media/" + id.split(".")[0] + "-a.jpg";
}

/* Envoie une image telle quelle, sans compression, puis un aperçu léger fait ici pour l'affichage.
   Renvoie l'identifiant de l'original (à joindre ensuite à une action), ou null si l'envoi a échoué. */
export async function televerserImage(parametres, fichier) {
  // Format que le site ne garde pas tel quel (HEIC d'iPhone...) : converti en JPEG très haute qualité.
  const original = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(fichier.type)
    ? fichier : await reduireImage(fichier, 8192, 0.95);
  if (!await televerser({ ...parametres, nom_fichier: fichier.name }, original)) return null;
  const id = app.etat.televerse;
  const leger = await reduireImage(original, 1280, 0.82);
  if (leger !== original) await televerser({ type: "apercu", de: id }, leger);   // en cas d'échec, l'original sert d'aperçu
  app.etat.televerse = id;
  return id;
}

/* Télécharger sans quitter l'appli. Dans l'appli installée sur téléphone, un lien de téléchargement fait sortir de
   l'appli (qui redémarre) : on récupère le fichier dans la page, puis on ouvre le menu de partage du téléphone. */
const fichiersPrets = new Map();   // url -> File, pour un second toucher si le premier a expiré

export async function telechargerFichier(url, nom, fichier = null) {
  try {
    fichier ??= fichiersPrets.get(url);
    if (!fichier) {
      notifier("Préparation du fichier...", true);
      const reponse = await fetch(url, { cache: "no-store" });
      if (!reponse.ok) throw new Error(reponse.statusText);
      const contenu = await reponse.blob();
      fichier = new File([contenu], nom, { type: contenu.type || "application/octet-stream" });
      fichiersPrets.set(url, fichier);
    }
    const telephone = matchMedia("(display-mode: standalone)").matches || navigator.standalone || matchMedia("(pointer: coarse)").matches;
    if (telephone && navigator.canShare?.({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier] });
        fichiersPrets.delete(url);
      } catch (e) {
        // Le téléphone n'accepte le partage que juste après un toucher : si la préparation a été longue, on redemande.
        if (e.name === "NotAllowedError") notifier("Fichier prêt : touche encore pour l'enregistrer.", true);
        else if (e.name !== "AbortError") throw e;
      }
      return;
    }
    const lien = URL.createObjectURL(fichier);
    const a = el("a", { href: lien, download: nom });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(lien), 60000);
    fichiersPrets.delete(url);
  } catch (e) {
    notifier("Téléchargement impossible pour l'instant.");
  }
}

/* --- Fenêtre (feuille) : formulaire court par-dessus la page, qui ne défile plus tant qu'elle est ouverte.
   `action` renvoie true si c'est passé (la fenêtre se ferme), false sinon (elle reste, l'erreur est affichée). */
export function fermerModale() {
  $("modale").hidden = true;
  document.body.classList.remove("sans-defilement");
}

export function ouvrirModale(titre, contenu, libelle, action) {
  const boite = $("modale-contenu");
  const valider = el("button", { class: "btn principal large", type: "submit" }, libelle);
  const formulaire = el("form", {
    onsubmit: async ev => {
      ev.preventDefault();
      valider.disabled = true;
      if (await action()) fermerModale();
      valider.disabled = false;
    },
  }, contenu, el("div", { class: "actions" }, valider,
    el("button", { class: "btn large", type: "button", onclick: fermerModale }, "Annuler")));
  boite.replaceChildren(el("h2", {}, titre), formulaire);
  $("modale").hidden = false;
  document.body.classList.add("sans-defilement");
  boite.querySelector("input, select, textarea")?.focus();
}

/* Une feuille à lire seulement (qui est là à ce créneau, le détail d'une dette...) : un seul bouton, Fermer. */
export function ouvrirFeuille(titre, contenu) {
  const boite = $("modale-contenu");
  const fermer = el("button", { class: "btn large", type: "button", onclick: fermerModale }, "Fermer");
  boite.replaceChildren(el("h2", {}, titre), el("div", { class: "contenu-feuille" }, contenu), el("div", { class: "actions" }, fermer));
  $("modale").hidden = false;
  document.body.classList.add("sans-defilement");
  fermer.focus();
}

/* --- Connexion : « Qui es-tu ? » (les photos des comptes), puis le pavé du code -------------------------------
   Chaque compte a son code à 4 chiffres. Le serveur remet un jeton à l'appareil, joint à chaque demande.
   - Code provisoire (remis à zéro par le staff) : on choisit tout de suite un nouveau code (deux fois).
   - « Créer un compte » : le nom, puis le code, puis le même code une seconde fois ; on arrive sur Ma fiche. */

function memoriser(nom, jeton) {
  app.moi = nom;
  app.jeton = jeton;
  try { localStorage.setItem(CLE, nom); localStorage.setItem(CLE_JETON, jeton); } catch (e) {}
}

function fermerConnexion() {
  delete $("connexion").dataset.code;
  $("connexion").hidden = true;
}

export function choisirCompte(nom) {
  demanderCode({
    nom, titre: nom, texte: "Tape ton code.",
    valider: async code => {
      const reponse = await poster("api/connexion", { nom, code });
      memoriser(nom, reponse.jeton);
      if (reponse.changer_code) return nouveauCode(nom, "Ton code était provisoire : choisis ton code à toi.");
      fermerConnexion();
      charger();
    },
  });
}

export function deconnecter() {
  if (app.jeton) fetch("api/deconnexion", { method: "POST", headers: entetes() }).catch(() => {});
  oublierJeton();
  app.moi = null;
  try { localStorage.removeItem(CLE); } catch (e) {}
  afficherConnexion();
}

/* Le serveur ne reconnaît plus le jeton (code remis à zéro, appareil déconnecté) : on redemande le code. */
async function codeRefuse() {
  const nom = app.moi;
  oublierJeton();
  try { app.etat = await (await fetch("api/etat?nom=", { cache: "no-store" })).json(); } catch (e) { return; }
  if (app.etat.comptes.some(c => c.nom === nom)) choisirCompte(nom);
  else { app.moi = null; try { localStorage.removeItem(CLE); } catch (e) {} afficherConnexion(); }
}

async function poster(url, corps, avecJeton = false) {
  const r = await fetch(url, { method: "POST", headers: avecJeton ? entetes({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  const reponse = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(reponse.erreur || r.statusText);
  return reponse;
}

/* Choisir un nouveau code : deux fois le même, puis enregistré (le compte est déjà connecté avec son jeton). */
export function nouveauCode(nom, texte = "Choisis un nouveau code.", annulable = false) {
  demanderCode({
    nom, titre: "Nouveau code", texte, annulable,
    valider: async code => demanderCode({
      nom, titre: "Confirme ton code", texte: "Tape le même code une seconde fois.", annulable,
      valider: async confirmation => {
        if (confirmation !== code) { nouveauCode(nom, "Les deux codes étaient différents : recommence.", annulable); return; }
        const r = await poster("api/code/changer", { nom, code }, true);
        app.etat = r;
        fermerConnexion();
        notifier("Code enregistré.", true);
        afficher();
      },
    }),
  });
}

/* Créer un compte : le nom, puis le code deux fois. */
function creerCompte() {
  const boite = $("connexion");
  boite.dataset.code = "inscription";
  const champ = el("input", { maxlength: 30, required: true, autocomplete: "given-name", placeholder: "Ton prénom ou ton surnom", "aria-label": "Ton nom" });
  const message = el("p", { class: "message-code", role: "status" });
  boite.replaceChildren(el("form", {
    class: "inscription",
    onsubmit: ev => {
      ev.preventDefault();
      const nom = champ.value.trim().replace(/\s+/g, " ");
      if (!nom) return;
      if (app.etat.comptes.some(c => sansAccent(c.nom) === sansAccent(nom))) { message.textContent = "Ce nom est déjà pris : ajoute l'initiale de ton nom de famille."; return; }
      demanderCode({
        nom, titre: "Ton code", texte: "Choisis un code à 4 chiffres : il protège ton compte.",
        annuler: creerCompte,
        valider: async code => demanderCode({
          nom, titre: "Confirme ton code", texte: "Tape le même code une seconde fois.", annuler: creerCompte,
          valider: async confirmation => {
            if (confirmation !== code) throw new Error("les deux codes sont différents, recommence");
            const r = await poster("api/inscription", { nom, code });
            memoriser(r.nom, r.jeton);
            fermerConnexion();
            location.hash = "#fiche";
            await charger();
            notifier("Bienvenue ! Remplis ta fiche pour que les autres te reconnaissent.", true);
          },
        }),
      });
    },
  },
  el("h1", {}, "Créer un compte"),
  el("p", { class: "doux" }, "Le nom que les autres verront."),
  champ, message,
  el("button", { class: "btn principal large", type: "submit" }, "Continuer"),
  el("button", { class: "btn large", type: "button", onclick: () => { delete boite.dataset.code; afficherConnexion(); } }, "Annuler")));
  boite.hidden = false;
  champ.focus();
}

/* Pavé numérique, comme le code de déverrouillage de l'iPhone : 4 points, puis `valider(code)`.
   Si `valider` lève une erreur, la secousse et le message s'affichent, et l'on recommence. */
function demanderCode({ nom, titre, texte, valider, annuler, annulable = true }) {
  let saisi = "";
  const boite = $("connexion");
  boite.dataset.code = nom;
  const points = el("div", { class: "points-code", "aria-hidden": "true" });
  const message = el("p", { class: "message-code", role: "status" });
  const majPoints = () => points.replaceChildren(...[0, 1, 2, 3].map(i => el("span", { class: i < saisi.length ? "plein" : "" })));

  async function verifier() {
    document.removeEventListener("keydown", clavier);
    try {
      await valider(saisi);
    } catch (e) {
      document.addEventListener("keydown", clavier);
      message.textContent = majuscule(e.message) + ".";
      points.classList.remove("erreur");
      void points.offsetWidth;   // relance l'animation de secousse
      points.classList.add("erreur");
      saisi = "";
      majPoints();
    }
  }
  function taper(chiffre) {
    if (saisi.length >= 4) return;
    saisi += chiffre;
    message.textContent = "";
    majPoints();
    if (saisi.length === 4) verifier();
  }
  function effacer() { saisi = saisi.slice(0, -1); majPoints(); }
  function sortir() {
    document.removeEventListener("keydown", clavier);
    delete boite.dataset.code;
    if (annuler) annuler();
    else if (app.etat?.moi) { boite.hidden = true; afficher(); }   // changement de code volontaire : on revient
    else afficherConnexion();
  }
  function clavier(ev) {
    if (/^\d$/.test(ev.key)) taper(ev.key);
    else if (ev.key === "Backspace") effacer();
    else if (ev.key === "Escape" && annulable) sortir();
  }
  document.addEventListener("keydown", clavier);
  const touche = (contenu, action, libelle) => el("button", { type: "button", class: "touche", "aria-label": libelle || contenu, onclick: action }, contenu);
  majPoints();
  boite.replaceChildren(el("div", { class: "code-admin" },
    avatar(nom, 72),
    el("h1", {}, titre),
    el("p", { class: "doux" }, texte),
    points, message,
    el("div", { class: "pave" },
      ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(c => touche(c, () => taper(c))),
      annulable ? el("button", { type: "button", class: "touche texte", onclick: sortir }, "Annuler") : el("span"),
      touche("0", () => taper("0")),
      el("button", { type: "button", class: "touche texte", "aria-label": "Effacer", onclick: effacer }, icone("fa-effacer")))));
  boite.hidden = false;
}

export function afficherConnexion() {
  const boite = $("connexion");
  if (boite.dataset.code) { boite.hidden = false; return; }   // le pavé du code est affiché : on le laisse
  if (!$("choix-compte")) {
    boite.replaceChildren(el("h1", { id: "connexion-titre" }), el("p", {}, "Qui es-tu ?"), el("div", { class: "choix-compte", id: "choix-compte" }));
  }
  const choix = $("choix-compte");
  choix.replaceChildren();
  for (const c of app.etat.comptes.filter(c => !c.desactive)) {
    choix.append(el("button", { type: "button", class: "choix", onclick: () => choisirCompte(c.nom) },
      avatar(c.nom, 84), el("span", { class: "rangee" }, c.nom)));
  }
  if (!$("creer-compte")) boite.append(el("button", { type: "button", class: "btn large creer-compte", id: "creer-compte", onclick: creerCompte }, "Créer un compte"));
  $("connexion-titre").textContent = titreAppli();
  $("connexion").hidden = false;
}

/* « il y a 5 min », « hier », « le 12 oct. ». */
export function ilYa(horodatage) {
  const quand = new Date(horodatage);
  const minutes = Math.round((Date.now() - quand) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)} h`;
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  if (quand.toDateString() === hier.toDateString()) return "hier";
  return "le " + quand.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* --- Nouveautés (lus.py) ----------------------------------------------------------------------------------
   Pastille « nouveau » : un nombre (« 3 »), ou un simple point quand le nombre n'a pas de sens (true). */
export function pastilleNouveau(nombre, libelle = "") {
  if (!nombre) return null;
  return el("span", { class: "nouveau" + (nombre === true ? " point" : ""), "aria-label": `${nombre === true ? "" : nombre + " "}nouveau${nombre > 1 ? "x" : ""}` },
    nombre === true ? "" : `${nombre}${libelle}`);
}

/* Total des nouveautés d'un type (« notes ») : nombre d'éléments concernés, ou le nombre/booléen tel quel. */
export function nombreNouveautes(type) {
  const n = app.etat.non_lus?.[type];
  return n && typeof n === "object" ? Object.keys(n).length : n || 0;
}

/* Marque comme lu : tout de suite à l'écran, puis sur le serveur (sans redessiner). `cle` : "<type>" ou
   "<type>/<id>" ; null : tout (premier passage). */
export function marquerLu(cle) {
  const n = app.etat.non_lus;
  if (cle === null) {
    for (const type of Object.keys(n)) n[type] = typeof n[type] === "object" ? {} : 0;
    delete n.initialiser;
  } else {
    const [type, id] = cle.split("/");
    if (id && n[type]) delete n[type][id];
    else n[type] = typeof n[type] === "object" ? {} : 0;
  }
  fetch("api/lu", {
    method: "POST",
    headers: entetes({ "Content-Type": "application/json" }),
    body: JSON.stringify(cle === null ? { nom: app.moi } : { nom: app.moi, cle }),
  }).catch(() => {});
}

/* --- Rendu : défini dans main.js ; les autres modules appellent afficher() après un changement. ---------- */
let rendu = () => {};
export function definirRendu(fonction) { rendu = fonction; }
export function afficher() { rendu(); }

/* --- Couvertures (affiches et vignettes) ---------------------------------------------------------------------
   L'image de fond d'une affiche ou d'une vignette. Un dégradé de la palette, différent selon `indice`, reste
   toujours là : seul sans image (avec `filigrane` en grand, en transparence), en voile coloré sur l'image.
   Mets ici les couleurs de ta palette. */
const DEGRADES = [["#5c1f2e", "#3e3160"], ["#3e3160", "#33493a"], ["#33493a", "#8c4a28"], ["#8c4a28", "#5c1f2e"]];

export function couverture(image, indice, filigrane) {
  const fond = el("div", { class: "couverture" });
  const [a, b] = DEGRADES[Math.abs(indice) % DEGRADES.length];
  const degrade = `linear-gradient(135deg, ${a}, ${b})`;
  if (image) {
    fond.append(el("img", { src: urlApercu(image), alt: "", loading: "lazy" }), el("span", { class: "teinte", style: `background: ${degrade}` }));
  } else {
    fond.style.background = degrade;
    if (filigrane) fond.append(el("span", { class: "filigrane", "aria-hidden": "true" }, filigrane));
  }
  return fond;
}

/* Indice stable tiré d'un identifiant (pour que chaque élément garde son dégradé). */
export const indiceDe = id => [...id].reduce((t, c) => t + c.charCodeAt(0), 0);

/* Sous une affiche d'en-tête : « Changer l'image » / « Retirer l'image ». `changer(id)` enregistre ("" = retirer). */
export function reglageCouverture(actuelle, changer) {
  const entree = el("input", { type: "file", accept: "image/*", class: "cache" });
  entree.onchange = async () => {
    const fichier = entree.files[0];
    entree.value = "";
    if (!fichier) return;
    notifier("Envoi de l'image...", true);
    const id = await televerserImage({ type: "image" }, fichier);
    if (id && await changer(id)) notifier("Image changée.", true);
  };
  return el("div", { class: "rangee reglage-couverture" },
    el("label", { class: "discret" }, actuelle ? "Changer l'image" : "Ajouter une image", entree),
    actuelle && el("button", { class: "discret danger", type: "button", onclick: () => changer("") }, "Retirer l'image"));
}
