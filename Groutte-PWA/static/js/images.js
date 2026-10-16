import { el, notifier, urlApercu, televerserImage, afficher } from "./commun.js";
import { ouvrirVisionneuse } from "./visionneuse.js";

/* Images jointes à un message (commentaires, notes, messages) : choix, aperçus avant envoi, envoi,
   et galerie à l'affichage (toucher ouvre la visionneuse). */

export const imagesEnAttente = new Map(); // clé du formulaire -> images choisies, pas encore envoyées
const apercus = new WeakMap();            // image choisie -> adresse d'aperçu (une seule par fichier)

/* --- Images --------------------------------------------------------------------------- */

export function apercu(fichier) {
  if (!apercus.has(fichier)) apercus.set(fichier, URL.createObjectURL(fichier));
  return apercus.get(fichier);
}

/* Images choisies pour un formulaire : le champ (caché, dans un label), les aperçus avec une croix pour en retirer une. */
export function entreeImages(cle, maxi) {
  const entree = el("input", { type: "file", accept: "image/*", multiple: true, class: "cache" });
  entree.onchange = () => {
    const tous = [...(imagesEnAttente.get(cle) || []), ...entree.files];
    if (tous.length > maxi) notifier(`${maxi} images au plus.`);
    imagesEnAttente.set(cle, tous.slice(0, maxi));
    afficher();
  };
  return entree;
}

export function vignettesImages(cle) {
  const fichiers = imagesEnAttente.get(cle) || [];
  return fichiers.map((f, i) => el("span", { class: "vignette-attente" },
    el("img", { src: apercu(f), alt: "" }),
    el("button", {
      type: "button", class: "retirer-image", "aria-label": "Retirer cette image",
      onclick: () => { fichiers.splice(i, 1); imagesEnAttente.set(cle, fichiers); afficher(); },
    }, "×")));
}

export function selecteurImages(cle, maxi) {
  const nb = (imagesEnAttente.get(cle) || []).length;
  return el("div", { class: "selecteur-images" }, vignettesImages(cle),
    nb < maxi && el("label", { class: "btn ajout-image" }, nb ? "+ Image" : "Ajouter des images", entreeImages(cle, maxi)));
}

/* Envoie les images choisies (réduites avant) ; renvoie leurs identifiants, ou null si un envoi échoue.
   La progression s'écrit dans `etat` (le bouton d'envoi, ou un texte à côté). */
export async function envoyerImages(cle, etat) {
  const fichiers = imagesEnAttente.get(cle) || [];
  const ids = [];
  for (let i = 0; i < fichiers.length; i++) {
    etat.textContent = `Envoi de l'image ${i + 1}/${fichiers.length}...`;
    const id = await televerserImage({ type: "image" }, fichiers[i]);
    if (!id) return null;
    ids.push(id);
  }
  return ids;
}

/* Une image : en grand. Plusieurs : galerie qu'on fait défiler au doigt, avec « 2/5 ». */
export function galerie(images, petite = false) {
  if (!images?.length) return null;
  return el("div", { class: "galerie-post" + (images.length > 1 ? " plusieurs" : "") + (petite ? " petite" : "") },
    images.map((id, i) => el("a", {
      class: "diapo", href: "media/" + id, target: "_blank", rel: "noopener",
      onclick: ev => { ev.preventDefault(); ouvrirVisionneuse(images, i); },
    },
      el("img", { src: urlApercu(id), alt: images.length > 1 ? `Image ${i + 1} sur ${images.length}` : "Image", loading: "lazy" }),
      images.length > 1 && !petite && el("span", { class: "compteur" }, `${i + 1}/${images.length}`))));
}
