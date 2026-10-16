import { app, brouillons, estStaff, compte, tronquer, el, saisie, oublier, texteLisible, qui, modeModeration, boutonIcone, flecheVote, notifier, envoyer, lire, urlApercu, ilYa, pastilleNouveau, afficher, lireLocal, ecrireLocal } from "./commun.js";
import { barreReactions } from "./reactions.js";
import { imagesEnAttente, selecteurImages, envoyerImages, galerie } from "./images.js";
import { texteMentions, suggestionsMentions } from "./mentions.js";
import { zoneMessage } from "./zone-message.js";

/* Communauté > Forum, repris de NextSession (façon Reddit). #forum : les posts (flairs). #forum/<id> : un post et ses
   commentaires en arbre. #forum/<id>/<commentaire> : un commentaire ouvert comme un topic, avec ses réponses. On répond
   toujours depuis la zone collée en bas de l'écran, à ce qui est ouvert (le post ou le commentaire).
   L'état général ne contient que la liste des posts ; un post et ses commentaires sont chargés à part (GET /api/forum).
   Différences avec NextSession : la modération par le staff (mode modération, Réglages), la cloche pour suivre un fil,
   les flairs réservés au staff, et le membre muet qui ne peut plus écrire. */

const ouvert = { id: null, donnees: null, introuvable: false, erreur: false };
let typeNouveau = "texte";         // texte | lien
let filtreFlair = "";              // "" : tous les flairs
let triCommentaires = "meilleurs"; // meilleurs | nouveaux
let triPosts = lireLocal("tri-posts") || "date";   // date | reponses | votes, mémorisé sur l'appareil
let edition = null;                // "post" ou id du commentaire en cours de modification
const replies = new Set();         // commentaires repliés

export async function chargerSujet(id) {
  try {
    Object.assign(ouvert, { id, donnees: await lire("forum", { sujet: id }), introuvable: false, erreur: false });
  } catch (e) {
    if (/introuvable/.test(e.message)) return void Object.assign(ouvert, { id, donnees: null, introuvable: true, erreur: false });
    // On note quand même l'id : sinon la page relancerait le chargement en boucle.
    if (ouvert.id !== id) Object.assign(ouvert, { id, donnees: null, introuvable: false, erreur: true });
    notifier("Impossible de charger le post.");
  }
}

/* Appelé par le rafraîchissement automatique : recharge le post affiché, s'il y en a un. */
export async function rafraichirSujet() {
  const [onglet, id] = location.hash.slice(1).split("/");
  if (onglet === "forum" && id && id !== "nouveau") await chargerSujet(decodeURIComponent(id));
}

/* « Nouveau post » (bulle en bas à droite sur téléphone, icône en haut sur ordinateur) : un écran à part,
   #forum/nouveau, avec seulement le formulaire, comme « Nouveau message » sur iPhone. */
export function ouvrirCreation() {
  location.hash = "#forum/nouveau";
}

function fermerCreation() {
  imagesEnAttente.delete("nouveau");
  if (history.length > 1) history.back();
  else location.hash = "#forum";
}

export function vueForum(id) {
  if (id === "nouveau") return formulaireNouveau();
  return id ? vuePost(id) : vueListe();
}

/* --- Petits éléments ------------------------------------------------------------------ */

function colorerFlair(e, nom) {
  const f = app.etat.flairs.find(x => x.nom === nom);
  if (f) {
    e.style.setProperty("--flair", f.couleur);
    e.style.setProperty("--flair-texte", texteLisible(f.couleur));
  }
  return e;
}

function flair(nom) {
  return nom ? colorerFlair(el("span", { class: "flair" }, nom), nom) : null;
}

function domaine(lien) {
  try { return new URL(lien).hostname.replace(/^www\./, ""); } catch (e) { return lien; }
}

/* Flèche « +1 » et score. Vote immédiat à l'écran, le serveur confirme ensuite. */
function boutonVote(element, envoi) {
  return el("button", {
    type: "button", class: "bouton-vote" + (element.a_vote ? " vote" : ""), disabled: Boolean(element.supprime),
    "aria-label": element.a_vote ? `Retirer mon vote (${element.score})` : `Voter (${element.score})`,
    onclick: async ev => {
      ev.preventDefault();
      element.score += element.a_vote ? -1 : 1;
      element.a_vote = !element.a_vote;
      afficher();
      if (!await envoi()) { if (ouvert.id) await chargerSujet(ouvert.id); afficher(); }
    },
  }, flecheVote(), el("span", {}, String(element.score)));
}

const plusRecent = (a, b) => b.cree_le.localeCompare(a.cree_le);

function segments(options, actuel, choisir) {
  return el("div", { class: "segments" }, options.map(([valeur, libelle]) => el("button", {
    type: "button", class: valeur === actuel ? "choisi" : "", onclick: () => { choisir(valeur); afficher(); },
  }, libelle)));
}


/* --- Liste des posts ------------------------------------------------------------------- */

function cartePost(s) {
  const nouveaux = app.etat.non_lus.forum[s.id];
  return el("article", { class: "carte post" },
    el("div", { class: "colonne-vote" }, boutonVote(s, () => envoyer("forum/voter", { sujet: s.id }))),
    el("a", { class: "post-corps", href: "#forum/" + encodeURIComponent(s.id) },
      el("span", { class: "post-meta petit doux" },
        s.epingle && el("span", { class: "badge" }, "Épinglé"),
        flair(s.flair),
        s.auteur ? qui(s.auteur) : "[supprimé]", ilYa(s.cree_le)),
      el("strong", { class: "post-titre" }, s.titre),
      s.type === "lien" && s.lien && el("span", { class: "post-domaine petit" }, domaine(s.lien)),
      s.images?.length > 0 && el("span", { class: "vignette-post" },
        el("img", { class: "post-vignette", src: urlApercu(s.images[0]), alt: "", loading: "lazy" }),
        s.images.length > 1 && el("span", { class: "compteur" }, `+${s.images.length - 1}`)),
      el("span", { class: "post-pied petit doux" },
        `${s.nb} commentaire${s.nb > 1 ? "s" : ""}`, s.verrouille && " · verrouillé",
        pastilleNouveau(nouveaux, " nouveau" + (nouveaux > 1 ? "x" : "")))));
}

/* Les épinglés en haut, puis selon le tri choisi (égalités : le plus récemment actif d'abord). */
const CLES_TRI = { date: () => 0, reponses: s => s.nb, votes: s => s.score };

function vueListe() {
  const cle = CLES_TRI[triPosts] || CLES_TRI.date;
  const posts = app.etat.forum
    .filter(s => !filtreFlair || s.flair === filtreFlair)
    .sort((a, b) => (b.epingle - a.epingle) || (cle(b) - cle(a)) || b.activite.localeCompare(a.activite));
  return [
    app.etat.flairs.length > 0 && el("div", { class: "filtre-flairs" },
      el("button", { type: "button", class: "flair tous" + (filtreFlair ? "" : " actif"), onclick: () => { filtreFlair = ""; afficher(); } }, "Tous"),
      app.etat.flairs.map(f => colorerFlair(el("button", {
        type: "button", class: "flair" + (filtreFlair === f.nom ? " actif" : ""),
        onclick: () => { filtreFlair = filtreFlair === f.nom ? "" : f.nom; afficher(); },
      }, f.nom), f.nom))),
    segments([["date", "Date"], ["reponses", "Réponses"], ["votes", "Votes"]], triPosts, v => {
      triPosts = v;
      ecrireLocal("tri-posts", v);
    }),
    posts.length ? el("div", { class: "liste-sujets" }, posts.map(cartePost))
      : el("p", { class: "doux" }, filtreFlair ? "Aucun post avec ce flair." : "Pas encore de post. Lance la discussion !"),
  ];
}

/* Les flairs qu'on peut choisir : ceux réservés au staff ne sont proposés qu'au staff. */
const flairsPermis = () => app.etat.flairs.filter(f => !f.staff || estStaff());
const muet = () => Boolean(compte(app.moi)?.muet);

function formulaireNouveau() {
  if (muet()) return el("p", { class: "doux" }, "Tu ne peux plus écrire pour le moment.");
  const titre = saisie("forum.nouveau.titre", { maxlength: 300, required: true, placeholder: "Titre" });
  const choixFlair = el("select", { "aria-label": "Flair" },
    el("option", { value: "" }, "Sans flair"),
    flairsPermis().map(f => el("option", { value: f.nom, selected: brouillons["forum.nouveau.flair"] === f.nom }, f.nom)));
  choixFlair.onchange = () => { brouillons["forum.nouveau.flair"] = choixFlair.value; };
  const corps = saisie("forum.nouveau.texte", {
    maxlength: 20000, placeholder: typeNouveau === "texte" ? "Ton message" : "Un mot pour accompagner (facultatif)",
  }, true);
  const lien = saisie("forum.nouveau.lien", { type: "url", maxlength: 1000, required: true, placeholder: "https://..." });

  const publier = el("button", { class: "btn principal large", type: "submit" }, "Publier");
  const echec = () => { publier.disabled = false; publier.textContent = "Publier"; };
  return el("form", {
    class: "carte",
    onsubmit: async ev => {
      ev.preventDefault();
      const post = { titre: titre.value, flair: choixFlair.value, type: typeNouveau, texte: corps.value };
      if (typeNouveau === "lien") post.lien = lien.value;
      const avecImages = (imagesEnAttente.get("nouveau") || []).length > 0;
      if (typeNouveau === "texte" && !corps.value.trim() && !avecImages) return notifier("Écris un message ou ajoute une image.");
      publier.disabled = true;
      post.images = await envoyerImages("nouveau", publier);
      if (!post.images) return echec();
      if (!await envoyer("forum/sujet", post)) return echec();
      oublier("forum.nouveau.");
      imagesEnAttente.delete("nouveau");
      // Le serveur renvoie l'identifiant du post créé : on l'ouvre.
      if (app.etat.sujet) location.replace("#forum/" + encodeURIComponent(app.etat.sujet));
    },
  },
  segments([["texte", "Texte"], ["lien", "Lien"]], typeNouveau, v => { typeNouveau = v; }),
  el("label", { class: "champ" }, "Titre", titre),
  el("label", { class: "champ" }, "Flair", choixFlair),
  typeNouveau === "lien" && el("label", { class: "champ" }, "Lien", lien),
  el("label", { class: "champ" }, typeNouveau === "texte" ? "Texte" : "Description", suggestionsMentions(corps), corps),
  el("div", { class: "champ" }, "Images (facultatif)", selecteurImages("nouveau", 10)),
  el("div", { class: "actions" }, publier,
    el("button", { class: "btn large", type: "button", onclick: fermerCreation }, "Annuler")));
}

/* --- Un post et ses commentaires --------------------------------------------------------- */

function mentionSupprime(element) {
  return element.supprime === "staff" ? "[retiré par le staff]" : "[supprimé]";
}

function editeur(cle, valeur, requis, envoi) {
  const champ = saisie(cle, { valeur, maxlength: 20000, required: requis }, true);
  return el("form", {
    onsubmit: async ev => {
      ev.preventDefault();
      if (await envoi(champ.value)) {
        oublier(cle);
        edition = null;
        await chargerSujet(ouvert.id);
        afficher();
      }
    },
  }, champ, el("div", { class: "actions" },
    el("button", { class: "btn principal large", type: "submit" }, "Enregistrer"),
    el("button", { class: "btn large", type: "button", onclick: () => { edition = null; oublier(cle); afficher(); } }, "Annuler")));
}

const lienForum = (sujet, commentaire) =>
  "#forum/" + encodeURIComponent(sujet) + (commentaire ? "/" + encodeURIComponent(commentaire) : "");

/* Zone de réponse collée en bas : la même que dans les messages privés (zone-message.js). Répond au post
   (parent null) ou au commentaire ouvert. */
function composer(s, parent, peutCommenter) {
  return zoneMessage({
    cle: `forum.${s.id}.${parent || "post"}`,
    placeholder: parent ? "Ta réponse..." : "Ajouter un commentaire...",
    verrou: muet() ? "Tu ne peux plus écrire pour le moment."
      : !peutCommenter && "Verrouillé par le staff : plus de nouveaux commentaires.",
    envoi: async (texte, images) => {
      if (!await envoyer("forum/commenter", { sujet: s.id, parent, texte, images })) return false;
      await chargerSujet(s.id);
      afficher();
      return true;
    },
  });
}

async function supprimer(s, commentaire) {
  if (!confirm(commentaire ? "Supprimer ce commentaire ?" : "Supprimer ce post ?")) return;
  const parent = commentaire && s.commentaires.find(c => c.id === commentaire)?.parent;
  if (!await envoyer("forum/supprimer", commentaire ? { sujet: s.id, commentaire } : { sujet: s.id })) return;
  if (!commentaire && !app.etat.forum.some(x => x.id === s.id)) return void (location.hash = "#forum");
  await chargerSujet(s.id);
  // Le commentaire ouvert a disparu (il n'avait pas de réponse) : on remonte à son parent.
  if (commentaire && commentaire === commentaireOuvert() && !ouvert.donnees?.commentaires.some(c => c.id === commentaire)) {
    location.hash = lienForum(s.id, parent);
  } else afficher();
}

async function moderer(s, action) {
  if (await envoyer("forum/moderer", { sujet: s.id, action })) { await chargerSujet(s.id); afficher(); }
}

function choixFlair(actuel) {
  return el("select", { class: "flair-choix", "aria-label": "Flair" },
    el("option", { value: "" }, "Sans flair"),
    app.etat.flairs.filter(f => !f.staff || estStaff() || f.nom === actuel).map(f => el("option", { value: f.nom, selected: f.nom === actuel }, f.nom)));
}

/* La cloche : je suis ce fil (notifications des réponses et réactions), ou je ne le suis plus. */
function cloche(s) {
  return boutonIcone(s.suivi ? "cloche" : "cloche-barree", s.suivi ? "Ne plus suivre ce fil" : "Suivre ce fil", async () => {
    const suivre = !s.suivi;
    if (await envoyer("forum/suivre", { sujet: s.id, suivre })) {
      notifier(suivre ? "Tu suis ce fil : tu seras prévenu des réponses." : "Tu ne suis plus ce fil.", true);
      await chargerSujet(s.id);
      afficher();
    }
  }, s.suivi);
}

function blocPost(s) {
  const auteur = s.auteur === app.moi;
  const moderation = modeModeration();
  const outils = !s.supprime && edition !== "post" && el("span", { class: "outils" },
    cloche(s),
    moderation && boutonIcone("epingle", s.epingle ? "Désépingler" : "Épingler", () => moderer(s, "epingle"), s.epingle),
    moderation && boutonIcone("cadenas", s.verrouille ? "Déverrouiller" : "Verrouiller", () => moderer(s, "verrouille"), s.verrouille),
    auteur && boutonIcone("crayon", "Modifier", () => { edition = "post"; afficher(); }),
    (auteur || moderation) && boutonIcone("poubelle", "Supprimer", () => supprimer(s, null)));
  const corps = el("div", { class: "post-corps" },
    el("div", { class: "post-meta petit doux" },
      s.epingle && el("span", { class: "badge" }, "Épinglé"),
      flair(s.flair),
      s.auteur ? qui(s.auteur, true) : "[supprimé]",
      `${ilYa(s.cree_le)}${s.modifie_le ? " (modifié)" : ""}`,
      outils),
    el("h2", { class: "titre-sujet" }, s.titre));

  if (s.supprime) corps.append(el("p", { class: "doux" }, mentionSupprime(s)));
  else if (edition === "post") {
    // L'auteur modifie son texte et son flair.
    const flairPost = choixFlair(s.flair);
    corps.append(el("label", { class: "champ" }, "Flair", flairPost),
      editeur(`forum.${s.id}.edition`, s.texte, s.type === "texte" && !s.images.length,
        texte => envoyer("forum/modifier", { sujet: s.id, texte, flair: flairPost.value })));
  } else {
    if (s.type === "lien" && s.lien) {
      corps.append(el("a", { class: "lien-post", href: s.lien, target: "_blank", rel: "noopener noreferrer ugc" },
        el("strong", {}, domaine(s.lien)), el("span", { class: "petit doux" }, s.lien)));
    }
    if (s.images.length) corps.append(galerie(s.images));
    if (s.texte) corps.append(el("p", { class: "texte-libre" }, texteMentions(s.texte)));
    corps.append(barreReactions("forum." + s.id, s,
      reaction => envoyer("forum/reagir", { sujet: s.id, reaction }), () => chargerSujet(s.id)));
    // Mode modération : le staff peut aussi changer le flair d'un post qui n'est pas le sien.
    if (moderation && !auteur) {
      const flairStaff = choixFlair(s.flair);
      flairStaff.onchange = async () => {
        if (await envoyer("forum/modifier", { sujet: s.id, flair: flairStaff.value })) { await chargerSujet(s.id); afficher(); }
      };
      corps.append(el("label", { class: "rangee petit doux" }, "Flair (staff)", flairStaff));
    }
  }
  return el("article", { class: "carte post detail" },
    el("div", { class: "colonne-vote" }, boutonVote(s, () => envoyer("forum/voter", { sujet: s.id }))), corps);
}

/* Commentaire ouvert comme un topic : 3e morceau de l'adresse (#forum/<post>/<commentaire>). */
function commentaireOuvert() {
  try { return decodeURIComponent(location.hash.slice(1).split("/")[2] || ""); } catch (e) { return ""; }
}

/* Le commentaire ouvert, en carte comme un post : vote, auteur, texte, images, réactions. */
function carteCommentaire(s, c) {
  const auteur = c.auteur === app.moi;
  const actif = !c.supprime && edition !== c.id;
  const corps = el("div", { class: "post-corps" },
    el("div", { class: "post-meta petit doux" },
      c.auteur ? qui(c.auteur, true) : mentionSupprime(c),
      c.auteur && c.auteur === s.auteur && el("span", { class: "badge op" }, "OP"),
      `${ilYa(c.cree_le)}${c.modifie_le ? " (modifié)" : ""}`,
      actif && el("span", { class: "outils" },
        auteur && boutonIcone("crayon", "Modifier", () => { edition = c.id; afficher(); }),
        (auteur || modeModeration()) && boutonIcone("poubelle", "Supprimer", () => supprimer(s, c.id)))));
  if (c.supprime) corps.append(el("p", { class: "doux" }, mentionSupprime(c)));
  else if (edition === c.id) {
    corps.append(editeur(`forum.${s.id}.edition.${c.id}`, c.texte, !c.images.length,
      texte => envoyer("forum/modifier", { sujet: s.id, commentaire: c.id, texte })));
  } else {
    if (c.texte) corps.append(el("p", { class: "texte-libre" }, texteMentions(c.texte)));
    if (c.images.length) corps.append(galerie(c.images));
    corps.append(barreReactions("forum." + c.id, c,
      reaction => envoyer("forum/reagir", { sujet: s.id, commentaire: c.id, reaction }), () => chargerSujet(s.id)));
  }
  return el("article", { class: "carte post detail" },
    el("div", { class: "colonne-vote" }, boutonVote(c, () => envoyer("forum/voter", { sujet: s.id, commentaire: c.id }))), corps);
}

function vuePost(id) {
  if (ouvert.id !== id) {
    edition = null;
    chargerSujet(id).then(afficher);
    return el("p", { class: "doux" }, "Chargement...");
  }
  if (ouvert.erreur) return [el("p", { class: "doux" }, "Impossible de charger ce post pour l'instant."),
    el("button", { class: "btn large", type: "button", onclick: () => chargerSujet(id).then(afficher) }, "Réessayer")];
  if (ouvert.introuvable || !ouvert.donnees) return el("p", { class: "doux" }, "Ce post n'existe plus.");

  const s = ouvert.donnees;
  const peutCommenter = !s.verrouille && !muet();

  // Arbre : enfants de chaque commentaire (clé "" pour ceux qui répondent directement au post).
  const enfants = new Map();
  for (const c of s.commentaires) {
    const cle = c.parent || "";
    if (!enfants.has(cle)) enfants.set(cle, []);
    enfants.get(cle).push(c);
  }
  const ordre = triCommentaires === "nouveaux" ? plusRecent
    : (a, b) => b.score - a.score || a.cree_le.localeCompare(b.cree_le);
  const descendants = cle => (enfants.get(cle) || []).reduce((n, c) => n + 1 + descendants(c.id), 0);

  // Au-delà de 4 niveaux, le fil continue sur la page du commentaire : le texte garde sa place sur téléphone.
  function branche(parent, profondeur) {
    const liste = (enfants.get(parent) || []).slice().sort(ordre);
    if (!liste.length) return null;
    if (profondeur >= 4) {
      const n = descendants(parent);
      return el("a", { class: "discret suite-fil", href: lienForum(s.id, parent) }, `Continuer le fil (${n} réponse${n > 1 ? "s" : ""})`);
    }
    return el("div", { class: "fil" }, liste.map(c => noeud(c, profondeur)));
  }

  function noeud(c, profondeur) {
    const replie = replies.has(c.id);
    const auteur = c.auteur === app.moi;
    const masques = descendants(c.id) + 1;
    const actif = !c.supprime && edition !== c.id;
    const entete = el("div", { class: "commentaire-entete petit" },
      // Flèche (et non « + ») pour ne pas confondre avec le « + » des réactions.
      boutonIcone(replie ? "chevron-droite" : "chevron-bas", replie ? "Déplier" : "Replier",
        () => { replie ? replies.delete(c.id) : replies.add(c.id); afficher(); }),
      c.auteur ? qui(c.auteur, true) : el("span", { class: "doux" }, mentionSupprime(c)),
      c.auteur && c.auteur === s.auteur && el("span", { class: "badge op" }, "OP"),
      el("span", { class: "doux" }, ilYa(c.cree_le) + (c.modifie_le ? " (modifié)" : "")),
      replie && el("span", { class: "doux" }, `· ${masques} masqué${masques > 1 ? "s" : ""}`),
      !replie && actif && el("span", { class: "outils" },
        auteur && boutonIcone("crayon", "Modifier", () => { edition = c.id; afficher(); }),
        (auteur || modeModeration()) && boutonIcone("poubelle", "Supprimer", () => supprimer(s, c.id))));
    if (replie) return el("div", { class: "commentaire replie" }, entete);

    const contenu = c.supprime ? el("p", { class: "doux" }, mentionSupprime(c))
      : edition === c.id ? editeur(`forum.${s.id}.edition.${c.id}`, c.texte, !c.images.length,
        texte => envoyer("forum/modifier", { sujet: s.id, commentaire: c.id, texte }))
      : el("div", { class: "commentaire-corps" },
        // Toucher le texte ouvre le commentaire comme un topic (pas sur une image, un lien ou un bouton).
        el("div", {
          class: "commentaire-texte ouvrable",
          onclick: ev => { if (!ev.target.closest("a, button, img")) location.hash = lienForum(s.id, c.id); },
        }, c.texte && el("p", { class: "texte-libre" }, texteMentions(c.texte)), galerie(c.images, true)),
        boutonVote(c, () => envoyer("forum/voter", { sujet: s.id, commentaire: c.id })));
    return el("div", { class: "commentaire" },
      entete, contenu,
      actif && el("div", { class: "commentaire-actions" },
        (peutCommenter || masques > 1) && el("a", { class: "discret", href: lienForum(s.id, c.id) },
          masques > 1 ? `${masques - 1} réponse${masques > 2 ? "s" : ""}` : "Répondre"),
        barreReactions("forum." + c.id, c,
          reaction => envoyer("forum/reagir", { sujet: s.id, commentaire: c.id, reaction }), () => chargerSujet(s.id))),
      branche(c.id, profondeur + 1));
  }

  const triage = nb => nb > 1 && segments([["meilleurs", "Meilleurs"], ["nouveaux", "Nouveaux"]], triCommentaires, v => { triCommentaires = v; });

  // Un commentaire ouvert : le contexte, sa carte, ses réponses ; la zone du bas lui répond, la flèche remonte d'un cran.
  const idCommentaire = commentaireOuvert();
  if (idCommentaire) {
    const c = s.commentaires.find(x => x.id === idCommentaire);
    if (!c) return [el("p", { class: "doux" }, "Ce commentaire n'existe plus."), el("a", { class: "btn large", href: lienForum(s.id) }, "Revenir au post")];
    const pere = c.parent && s.commentaires.find(x => x.id === c.parent);
    const nb = descendants(c.id);
    return [
      el("a", { class: "contexte petit", href: lienForum(s.id) }, "Post : ", el("strong", {}, s.titre)),
      pere && el("a", { class: "contexte petit", href: lienForum(s.id, pere.id) }, "En réponse à ",
        pere.auteur ? qui(pere.auteur) : mentionSupprime(pere), " ", pere.texte && el("span", { class: "doux" }, tronquer(pere.texte, 60))),
      carteCommentaire(s, c),
      el("div", { class: "entete-commentaires" }, el("h2", {}, `${nb} réponse${nb > 1 ? "s" : ""}`), triage(nb)),
      branche(c.id, 0) || el("p", { class: "doux" }, "Pas encore de réponse."),
      composer(s, c.id, peutCommenter),
    ];
  }

  const nb = s.commentaires.filter(c => !c.supprime).length;
  return [
    blocPost(s),
    el("div", { class: "entete-commentaires" }, el("h2", {}, `${nb} commentaire${nb > 1 ? "s" : ""}`), triage(nb)),
    branche("", 0) || el("p", { class: "doux" }, "Pas encore de commentaire."),
    composer(s, null, peutCommenter),
  ];
}
