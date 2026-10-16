import { $, el, icone, boutonIcone, urlApercu, telechargerFichier } from "./commun.js";

/* Visionneuse plein écran pour les images (galeries, carrousels) :
   - zoom : pincer à deux doigts, double-toucher, ou molette ; une fois zoomé, glisser pour se déplacer ;
   - image suivante ou précédente : glisser à gauche ou à droite (flèches et clavier sur ordinateur) ;
   - télécharger le fichier ; fermer avec la croix, Échap ou le geste « retour » du téléphone. */

const ZOOM_MAX = 5;
let images = [];    // [{ id, nom }]
let index = 0;
let vue = { echelle: 1, x: 0, y: 0 };
const doigts = new Map();   // pointeurs posés sur l'image : id -> { x, y }
let geste = null;           // départ du geste en cours (pincement, déplacement ou glissement)
let dernierToucher = 0;     // pour reconnaître le double-toucher

function boite() { return $("visionneuse"); }

/* `liste` : identifiants d'images, ou { id, nom } quand on connaît le nom d'origine (fichiers joints). */
export function ouvrirVisionneuse(liste, depart = 0) {
  images = liste.map(i => typeof i === "string" ? { id: i, nom: "" } : i);
  index = depart;
  remettreAZero();
  dessiner();
  boite().hidden = false;
  document.body.classList.add("sans-defilement");
  // Le geste « retour » du téléphone ferme la visionneuse au lieu de quitter la page.
  history.pushState({ visionneuse: true }, "");
}

function fermer() {
  boite().hidden = true;
  document.body.classList.remove("sans-defilement");
  doigts.clear();
}

window.addEventListener("popstate", () => { if (!boite().hidden) fermer(); });
document.addEventListener("keydown", ev => {
  if (boite().hidden) return;
  if (ev.key === "Escape") history.back();
  if (ev.key === "ArrowRight") aller(1);
  if (ev.key === "ArrowLeft") aller(-1);
});

function remettreAZero() { vue = { echelle: 1, x: 0, y: 0 }; }

function aller(sens) {
  const suivant = index + sens;
  if (suivant < 0 || suivant >= images.length) return;
  index = suivant;
  remettreAZero();
  dessiner();
}

/* Nom du fichier enregistré : le nom d'origine, sinon « image-2.jpg » (extension de l'original). */
function nomFichier(image) {
  return image.nom || `image-${index + 1}.${image.id.split(".").pop()}`;
}

function dessiner() {
  const image = images[index];
  // L'aperçu tout de suite, puis l'original (sans compression) dès qu'il est arrivé. L'original est gardé en
  // mémoire : « Enregistrer » ouvre alors le menu de partage du téléphone sans attendre (voir telechargerFichier).
  const img = el("img", { class: "v-image", src: urlApercu(image.id), alt: image.nom || "Image", draggable: "false" });
  if (image.fichier) img.src = URL.createObjectURL(image.fichier);
  else {
    fetch("media/" + image.id).then(r => r.ok ? r.blob() : null).then(contenu => {
      if (!contenu) return;
      image.fichier = new File([contenu], nomFichier(image), { type: contenu.type });
      if (images[index] === image) img.src = URL.createObjectURL(image.fichier);
    }).catch(() => {});
  }
  const scene = el("div", { class: "v-scene" }, img);
  brancherGestes(scene, img);
  boite().replaceChildren(...[
    el("div", { class: "v-barre" },
      el("span", { class: "v-compteur" }, images.length > 1 ? `${index + 1} / ${images.length}` : ""),
      el("span", { class: "v-outils" },
        boutonIcone("telecharger", "Enregistrer", () => telechargerFichier(`media/${image.id}?nom=${encodeURIComponent(nomFichier(image))}`, nomFichier(image), image.fichier)),
        boutonIcone("fermer", "Fermer", () => history.back()))),
    scene,
    images.length > 1 && index > 0 && el("button", { type: "button", class: "v-fleche gauche", "aria-label": "Image précédente", onclick: () => aller(-1) }, icone("chevron-gauche")),
    images.length > 1 && index < images.length - 1 && el("button", { type: "button", class: "v-fleche droite", "aria-label": "Image suivante", onclick: () => aller(1) }, icone("chevron-droite")),
  ].filter(Boolean));   // les flèches absentes (première ou dernière image) ne doivent rien afficher
  appliquer(img);
}

/* Garde l'image zoomée dans le cadre : on ne la perd pas en la faisant glisser trop loin. */
function borner(img) {
  const largeur = img.clientWidth, hauteur = img.clientHeight;
  const maxX = Math.max(0, (largeur * vue.echelle - largeur) / 2);
  const maxY = Math.max(0, (hauteur * vue.echelle - hauteur) / 2);
  vue.x = Math.min(maxX, Math.max(-maxX, vue.x));
  vue.y = Math.min(maxY, Math.max(-maxY, vue.y));
}

function appliquer(img, glissement = 0) {
  img.style.transform = `translate(${vue.x + glissement}px, ${vue.y}px) scale(${vue.echelle})`;
}

function brancherGestes(scene, img) {
  const centre = () => {
    const [a, b] = [...doigts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, ecart: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  scene.addEventListener("pointerdown", ev => {
    scene.setPointerCapture(ev.pointerId);
    img.style.willChange = "transform";   // fluide pendant le geste
    doigts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (doigts.size === 2) {
      const c = centre();
      geste = { type: "pincer", ecart: c.ecart, echelle: vue.echelle, x: vue.x, y: vue.y, cx: c.x, cy: c.y };
    } else if (doigts.size === 1) {
      geste = { type: vue.echelle > 1 ? "deplacer" : "glisser", dx: ev.clientX, dy: ev.clientY, x: vue.x, y: vue.y };
    }
  });

  scene.addEventListener("pointermove", ev => {
    if (!doigts.has(ev.pointerId) || !geste) return;
    doigts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (geste.type === "pincer" && doigts.size === 2) {
      const c = centre();
      vue.echelle = Math.min(ZOOM_MAX, Math.max(1, geste.echelle * c.ecart / geste.ecart));
      vue.x = geste.x + (c.x - geste.cx);
      vue.y = geste.y + (c.y - geste.cy);
      borner(img);
      appliquer(img);
    } else if (geste.type === "deplacer") {
      vue.x = geste.x + (ev.clientX - geste.dx);
      vue.y = geste.y + (ev.clientY - geste.dy);
      borner(img);
      appliquer(img);
    } else if (geste.type === "glisser" && images.length > 1) {
      appliquer(img, ev.clientX - geste.dx);   // l'image suit le doigt
    }
  });

  const lever = ev => {
    if (!doigts.has(ev.pointerId)) return;
    doigts.delete(ev.pointerId);
    if (geste?.type === "glisser") {
      const dx = ev.clientX - geste.dx, dy = ev.clientY - geste.dy;
      const maintenant = Date.now();
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        // Double-toucher : zoom x2,5 (ou retour à la taille normale).
        if (maintenant - dernierToucher < 300) { vue.echelle = vue.echelle > 1 ? 1 : 2.5; vue.x = vue.y = 0; appliquer(img); dernierToucher = 0; }
        else dernierToucher = maintenant;
      } else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        aller(dx < 0 ? 1 : -1);
        geste = null;
        return;
      }
      appliquer(img);
    }
    if (vue.echelle <= 1.02) { remettreAZero(); appliquer(img); }
    // Geste fini : sans « will-change », le navigateur redessine l'image zoomée à pleine résolution (sinon il
    // agrandit la version figée à la taille de l'écran, et l'image paraît compressée).
    if (!doigts.size) img.style.willChange = "auto";
    // Un doigt reste posé après un pincement : on continue en déplacement.
    geste = doigts.size === 1 && vue.echelle > 1
      ? (() => { const [d] = doigts.values(); return { type: "deplacer", dx: d.x, dy: d.y, x: vue.x, y: vue.y }; })()
      : null;
  };
  scene.addEventListener("pointerup", lever);
  scene.addEventListener("pointercancel", lever);

  // Ordinateur : molette pour zoomer, double-clic pour basculer.
  scene.addEventListener("wheel", ev => {
    ev.preventDefault();
    vue.echelle = Math.min(ZOOM_MAX, Math.max(1, vue.echelle * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (vue.echelle === 1) remettreAZero();
    borner(img);
    appliquer(img);
  }, { passive: false });
  scene.addEventListener("dblclick", () => { vue.echelle = vue.echelle > 1 ? 1 : 2.5; vue.x = vue.y = 0; appliquer(img); });
}
