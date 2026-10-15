import { el, icone, saisie, brouillons, notifier, afficher } from "./commun.js";
import { imagesEnAttente, entreeImages, vignettesImages, envoyerImages } from "./images.js";
import { suggestionsMentions } from "./mentions.js";

/* Zone d'envoi collée en bas (commentaires, messages), la même partout, comme dans les messageries :
   une seule ligne, [ champ qui grandit avec le texte, l'icône image dedans ] [ envoyer ].
   Les images choisies s'affichent en vignettes au-dessus ; « @ » propose les comptes.
   `envoi(texte, images)` envoie et renvoie true si c'est passé (le brouillon et les images sont alors oubliés).
   `verrou` : un texte à afficher à la place (fil verrouillé). */
export function zoneMessage({ cle, placeholder, maxImages = 4, envoi, verrou }) {
  if (verrou) return el("div", { class: "composer collant" }, el("p", { class: "doux petit verrou" }, verrou));

  const champ = saisie(cle, { maxlength: 10000, rows: 1, placeholder, "aria-label": "Message" }, true);
  // Le champ grandit avec le texte, jusqu'à 40 % de l'écran.
  const ajuster = () => { champ.style.height = "auto"; champ.style.height = Math.min(champ.scrollHeight + 2, innerHeight * 0.4) + "px"; };
  champ.addEventListener("input", ajuster);
  requestAnimationFrame(ajuster);

  const nbImages = (imagesEnAttente.get(cle) || []).length;
  const etat = el("p", { class: "etat doux petit" });
  const bouton = el("button", { class: "bouton-icone envoyer", type: "submit", "aria-label": "Envoyer", title: "Envoyer" }, icone("envoyer"));
  return el("form", {
    class: "composer collant",
    onsubmit: async ev => {
      ev.preventDefault();
      if (!champ.value.trim() && !nbImages) return notifier("Écris quelque chose ou ajoute une image.");
      bouton.disabled = true;
      const images = await envoyerImages(cle, etat);
      if (images && await envoi(champ.value, images)) {
        delete brouillons[cle];
        imagesEnAttente.delete(cle);
        afficher();   // zone vidée (texte et vignettes)
      } else {
        bouton.disabled = false;
      }
      etat.textContent = "";
    },
  },
  nbImages > 0 && el("div", { class: "selecteur-images" }, vignettesImages(cle)),
  suggestionsMentions(champ),
  etat,
  el("div", { class: "ligne-saisie" },
    el("div", { class: "champ-saisie" },
      champ,
      nbImages < maxImages && el("label", { class: "bouton-icone image-saisie", "aria-label": "Ajouter des images", title: "Ajouter des images" },
        icone("image"), entreeImages(cle, maxImages))),
    bouton));
}
