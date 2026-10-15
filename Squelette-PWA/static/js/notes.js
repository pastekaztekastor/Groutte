import { app, el, saisie, oublier, avatarNomme, estAdmin, boutonIcone, ilYa, notifier, envoyer, lire, ouvrirModale, pastilleNouveau,
  couverture, indiceDe, reglageCouverture, televerserImage, urlApercu, afficher } from "./commun.js";
import { galerie, selecteurImages, envoyerImages, imagesEnAttente } from "./images.js";
import { zoneMessage } from "./zone-message.js";
import { texteMentions, suggestionsMentions } from "./mentions.js";

/* Module d'exemple « Notes » (serveur : notes.py). Il montre les gestes d'un module, à copier :
   - #notes : la liste, depuis l'état général (la plus récente en grande affiche, les autres en vignettes) ;
   - #notes/nouvelle : un écran d'écriture (« Annuler » en haut, images jointes) ;
   - #notes/<id> : le détail, chargé à part (GET /api/note) et relu toutes les 30 s ; outils de l'auteur et de
     l'admin ; commentaires en bulles et zone d'envoi collée en bas. */

/* --- Liste ------------------------------------------------------------------------------------------------ */

const couvertureNote = n => couverture(n.couverture, indiceDe(n.id), n.titre.trim().charAt(0).toUpperCase());

function afficheNote(n) {
  return el("a", { class: "affiche", href: "#notes/" + n.id },
    couvertureNote(n),
    el("div", { class: "voile-affiche" }),
    pastilleNouveau(app.etat.non_lus.notes?.[n.id]),
    el("div", { class: "texte-affiche" },
      el("span", { class: "etiquette-affiche" }, "La plus récente"),
      el("strong", { class: "titre-affiche" }, n.titre),
      el("span", { class: "meta-affiche" }, `${n.auteur} · ${ilYa(n.cree_le)}`),
      n.extrait && el("span", { class: "resume-affiche" }, n.extrait)));
}

function vignetteNote(n) {
  return el("a", { class: "vignette", href: "#notes/" + n.id },
    couvertureNote(n),
    el("div", { class: "voile-affiche" }),
    n.nb_commentaires > 0 && el("span", { class: "etiquette-affiche" }, String(n.nb_commentaires)),
    pastilleNouveau(app.etat.non_lus.notes?.[n.id]),
    el("div", { class: "texte-affiche" },
      el("strong", { class: "titre-vignette" }, n.titre),
      el("span", { class: "meta-affiche petit" }, n.auteur)));
}

export function vueNotes() {
  const notes = app.etat.notes;
  if (!notes.length) return el("p", { class: "doux" }, "Pas encore de note. Touche + pour en écrire une.");
  return [
    afficheNote(notes[0]),
    notes.length > 1 && [el("h2", {}, "Les autres"), el("div", { class: "grille-affiches" }, notes.slice(1).map(vignetteNote))],
  ];
}

/* --- Écrire une note --------------------------------------------------------------------------------------- */

export function vueNouvelleNote() {
  const cle = "note.nouvelle";
  const titre = saisie(cle + ".titre", { maxlength: 150, required: true, placeholder: "Titre", "aria-label": "Titre" });
  const texte = saisie(cle + ".texte", { maxlength: 20000, rows: 6, placeholder: "Texte (facultatif, « @ » pour mentionner)", "aria-label": "Texte" }, true);
  const etat = el("p", { class: "doux petit" });
  const bouton = el("button", { class: "btn principal large", type: "submit" }, "Publier");
  return el("form", {
    onsubmit: async ev => {
      ev.preventDefault();
      bouton.disabled = true;
      const images = await envoyerImages(cle, etat);
      if (images && await envoyer("notes/creer", { titre: titre.value, texte: texte.value, images })) {
        oublier(cle);
        imagesEnAttente.delete(cle);
        location.replace("#notes");
      }
      bouton.disabled = false;
      etat.textContent = "";
    },
  },
  el("div", { class: "carte" }, el("label", { class: "champ" }, titre), el("label", { class: "champ" }, texte), suggestionsMentions(texte)),
  el("h2", {}, "Images"), selecteurImages(cle, 12), etat,
  el("div", { class: "actions" }, bouton));
}

/* --- Détail -------------------------------------------------------------------------------------------------
   Chargé à part (trop lourd pour l'état général) : gardé ici, relu toutes les 30 s (rafraichirNote, rubriques.js). */

let ouverte = { id: null, donnees: null, erreur: false };

async function chargerNote(id) {
  try { ouverte = { id, donnees: await lire("note", { id }), erreur: false }; }
  catch (e) { ouverte = { id, donnees: null, erreur: true }; }
}

export async function rafraichirNote() {
  const [rubrique, id] = location.hash.slice(1).split("/");
  if (rubrique === "notes" && id && id !== "nouvelle") await chargerNote(id);
}

/* Titre de la barre du haut : depuis l'état général, sans attendre le détail. */
export function titreNote(id) {
  return app.etat.notes.find(n => n.id === id)?.titre || "Note";
}

/* Une action sur la note ouverte : envoyer, puis relire le détail (l'état général ne contient pas les commentaires). */
async function agir(route, corps) {
  if (!await envoyer(route, { id: ouverte.id, ...corps })) return false;
  await chargerNote(ouverte.id);
  afficher();
  return true;
}

export function vueNote(id) {
  if (ouverte.id !== id) { chargerNote(id).then(afficher); return el("p", { class: "doux" }, "Chargement..."); }
  if (ouverte.erreur) return [el("p", { class: "doux" }, "Cette note n'existe plus, ou le serveur ne répond pas."),
    el("button", { class: "btn large", type: "button", onclick: () => chargerNote(id).then(afficher) }, "Réessayer")];
  const n = ouverte.donnees;
  const gere = n.auteur === app.moi || estAdmin();
  return [
    el("div", { class: "affiche entete" },
      couvertureNote(n),
      el("div", { class: "voile-affiche" }),
      el("div", { class: "texte-affiche" }, el("strong", { class: "titre-affiche" }, n.titre))),
    gere && reglageCouverture(n.couverture, image => agir("notes/couverture", { image })),
    el("section", { class: "carte" },
      el("div", { class: "post-meta" }, avatarNomme(n.auteur), ilYa(n.cree_le), n.modifie_le && "(modifiée)",
        gere && el("span", { class: "outils" },
          boutonIcone("crayon", "Modifier", () => modaleModifier(n)),
          boutonIcone("poubelle", "Supprimer", async () => {
            if (confirm(`Supprimer « ${n.titre} » ?`) && await envoyer("notes/supprimer", { id: n.id })) location.replace("#notes");
          }))),
      n.texte && el("p", { class: "texte-libre texte-note" }, texteMentions(n.texte))),
    n.images.length > 0 && el("div", { class: "carrousel" }, galerie(n.images)),
    gere && gestionImages(n),
    el("h2", {}, n.commentaires.length ? `${n.commentaires.length} commentaire${n.commentaires.length > 1 ? "s" : ""}` : "Commentaires"),
    n.commentaires.length > 0 && el("div", { class: "fil" }, n.commentaires.map(c => commentaire(n, c))),
    zoneMessage({
      cle: "note." + n.id, placeholder: "Commenter",
      envoi: (texte, images) => agir("notes/commenter", { texte, images }),
    }),
  ];
}

function commentaire(n, c) {
  const peutRetirer = c.auteur === app.moi || estAdmin();
  return el("div", { class: "commentaire" },
    el("div", { class: "commentaire-entete" }, avatarNomme(c.auteur), ilYa(c.cree_le),
      peutRetirer && el("span", { class: "outils" }, boutonIcone("poubelle", "Supprimer", () => {
        if (confirm("Supprimer ce commentaire ?")) agir("notes/commentaire/supprimer", { commentaire: c.id });
      }))),
    el("div", { class: "commentaire-corps" }, el("div", { class: "commentaire-texte" },
      c.texte && el("p", { class: "texte-libre" }, texteMentions(c.texte)),
      galerie(c.images, true))));
}

function modaleModifier(n) {
  const titre = el("input", { maxlength: 150, required: true, value: n.titre });
  const texte = el("textarea", { maxlength: 20000, rows: 6 });
  texte.value = n.texte;
  ouvrirModale("Modifier la note", [el("label", { class: "champ" }, "Titre", titre), el("label", { class: "champ" }, "Texte", texte)],
    "Enregistrer", () => agir("notes/modifier", { titre: titre.value, texte: texte.value }));
}

/* Auteur et admin : miniatures des images (une croix pour en retirer une), « Ajouter des images ». */
function gestionImages(n) {
  const changer = images => agir("notes/images", { images });
  const entree = el("input", { type: "file", accept: "image/*", multiple: true, class: "cache" });
  entree.onchange = async () => {
    const fichiers = [...entree.files].slice(0, 12 - n.images.length);
    entree.value = "";
    const ajout = [];
    for (const [i, fichier] of fichiers.entries()) {
      notifier(`Envoi de l'image ${i + 1}/${fichiers.length}...`, true);
      const id = await televerserImage({ type: "image" }, fichier);
      if (!id) return;
      ajout.push(id);
    }
    if (ajout.length && await changer([...n.images, ...ajout])) notifier("Images ajoutées.", true);
  };
  return el("div", { class: "gestion-illustrations" },
    n.images.map(id => el("span", { class: "miniature" },
      el("img", { src: urlApercu(id), alt: "" }),
      el("button", {
        type: "button", class: "retirer-miniature", "aria-label": "Retirer cette image", title: "Retirer",
        onclick: () => { if (confirm("Retirer cette image ?")) changer(n.images.filter(x => x !== id)); },
      }, "×"))),
    n.images.length < 12 && el("label", { class: "discret" }, "Ajouter des images", entree));
}
