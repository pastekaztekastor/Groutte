import { app, el, icone, avatar, compte, saisie, sansAccent, afficher, brouillons } from "./commun.js";
import { copier } from "./paiement.js";

/* #carnet : le carnet d'adresses, repris des Personnages de NextSession (répertoire par lettre) et de sa fiche
   contact façon Contacts de l'iPhone. #carnet/<nom> : la fiche d'une personne. */

const numero = valeur => valeur.replace(/[^\d+]/g, "");
const nomRole = id => app.etat.roles.find(r => r.id === id)?.nom || id;
const actifs = () => app.etat.comptes.filter(c => !c.desactive);
let filtres = new Set();   // rôles cochés dans les puces (ids)

/* Les rôles affichés d'une personne : ses rôles, plus Staff. */
function badges(c) {
  return [c.staff && el("span", { class: "badge staff" }, "Staff"), c.roles.map(r => el("span", { class: "badge" }, nomRole(r)))];
}

function ligne(c) {
  // Ma propre ligne ouvre Ma fiche, pour la modifier.
  return el("a", { class: "ligne ligne-perso", href: c.nom === app.moi ? "#fiche" : "#carnet/" + encodeURIComponent(c.nom) },
    avatar(c.nom, 40),
    el("span", { class: "ligne-texte" },
      el("strong", {}, c.nom, c.pseudo && el("span", { class: "doux" }, ` « ${c.pseudo} »`)),
      el("span", { class: "badges" }, badges(c))),
    icone("chevron-droite"));
}

/* Contacts utiles : les hébergeurs (jalon 2), la personne qui a les clés, puis le staff. Chacun une fois. */
function contactsUtiles() {
  const rang = c => c.roles.includes("hebergeur") ? 0 : c.roles.includes("cles") ? 1 : c.staff ? 2 : 9;
  return actifs().filter(c => rang(c) < 9).sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
}

export function vueCarnet() {
  const rolesPresents = app.etat.roles.filter(r => actifs().some(c => c.roles.includes(r.id)));
  filtres = new Set([...filtres].filter(id => rolesPresents.some(r => r.id === id)));
  const liste = el("div", { class: "liste-carnet" });
  // La recherche ne redessine que la liste : redessiner la page fermerait le clavier.
  const recherche = saisie("carnet.recherche", { type: "search", placeholder: "Rechercher", "aria-label": "Rechercher dans le carnet" });
  recherche.addEventListener("input", () => remplir(liste));
  remplir(liste);

  const puces = rolesPresents.length > 0 && el("div", { class: "puces-filtre" }, rolesPresents.map(r => el("button", {
    type: "button", class: "puce" + (filtres.has(r.id) ? " actif" : ""), "aria-pressed": String(filtres.has(r.id)),
    onclick: () => { filtres.has(r.id) ? filtres.delete(r.id) : filtres.add(r.id); afficher(); },
  }, r.nom)));
  return [el("div", { class: "recherche-carnet" }, recherche), puces, liste];
}

function remplir(liste) {
  const texte = sansAccent(brouillons["carnet.recherche"] || "");
  const trouves = actifs().filter(c =>
    (!texte || [c.nom, c.prenom, c.pseudo].some(v => sansAccent(v).includes(texte)))
    && [...filtres].every(id => c.roles.includes(id)));
  const groupes = new Map();
  for (const c of trouves) {
    const lettre = sansAccent(c.nom).charAt(0).toUpperCase();
    if (!groupes.has(lettre)) groupes.set(lettre, []);
    groupes.get(lettre).push(c);
  }
  const utiles = !texte && !filtres.size ? contactsUtiles() : [];
  liste.replaceChildren(...[
    utiles.length > 0 && [el("h2", {}, "Contacts utiles"), el("div", { class: "liste-groupee" }, utiles.map(ligne))],
    trouves.length
      ? [...groupes].map(([lettre, l]) => [el("h2", {}, lettre), el("div", { class: "liste-groupee" }, l.map(ligne))])
      : el("section", { class: "carte" }, el("p", { class: "doux" }, "Personne ne correspond."),
        el("button", { class: "btn large", type: "button", onclick: () => { filtres.clear(); delete brouillons["carnet.recherche"]; afficher(); } }, "Retirer les filtres")),
  ].flat(3).filter(Boolean));
}

/* --- La fiche d'une personne, façon Contacts de l'iPhone -------------------------------------------- */

function boutonsContact(c) {
  const tel = c.telephone && numero(c.telephone);
  const rond = (nomIcone, libelle, lien) => el(lien ? "a" : "span", {
    class: "action-contact" + (lien ? "" : " inactive"), href: lien || null, "aria-disabled": lien ? null : "true",
  }, el("span", { class: "rond" }, icone(nomIcone)), libelle);
  // « Message » (message privé dans l'appli) arrivera avec la Communauté.
  return el("div", { class: "actions-contact deux" },
    rond("fa-appeler", "Appeler", tel && "tel:" + tel),
    rond("fa-sms", "SMS", tel && "sms:" + tel));
}

function ligneInfo(nomIcone, libelle, contenu, action) {
  return el("div", { class: "ligne ligne-contact" },
    el("span", { class: "icone-contact" }, icone(nomIcone)),
    el("span", { class: "ligne-texte" }, el("span", { class: "libelle-contact" }, libelle), contenu),
    action);
}

export function vueContact(nom) {
  const c = compte(nom);
  if (!c || c.desactive) return [el("p", { class: "doux" }, "Cette personne n'est pas dans le carnet.")];
  const infos = [
    c.telephone && ligneInfo("fa-appeler", "Téléphone", el("a", { href: "tel:" + numero(c.telephone) }, c.telephone)),
    c.discord && ligneInfo("fa-discord", "Discord", el("span", {}, c.discord),
      el("button", { class: "discret", type: "button", onclick: () => copier(c.discord) }, "Copier")),
    (c.regimes.length > 0 || c.allergies) && ligneInfo("fa-regime", "Alimentation",
      el("span", { class: "texte-libre" }, [c.regimes.join(", "), c.allergies && `Allergies : ${c.allergies}`].filter(Boolean).join("\n"))),
    c.photo_ok === false && ligneInfo("fa-photo", "Photos et vidéos", el("span", {}, "Préfère ne pas apparaître sur les photos")),
  ].filter(Boolean);
  return [
    el("section", { class: "contact-tete" },
      avatar(c.nom, 112),
      el("h1", {}, c.nom),
      (c.prenom || c.pseudo) && el("p", { class: "doux" }, [c.prenom, c.pseudo && `« ${c.pseudo} »`].filter(Boolean).join(" ")),
      el("span", { class: "badges centre" }, badges(c))),
    boutonsContact(c),
    infos.length ? el("div", { class: "liste-groupee" }, infos) : el("p", { class: "doux note" }, "Pas d'infos renseignées."),
  ];
}

export const titreContact = nom => compte(nom)?.nom || "Carnet";
export const resumeCarnet = () => `${actifs().length} personnes`;
