import { app, estAdmin, pluriel, nombreNouveautes } from "./commun.js";
import { vueNotes, vueNouvelleNote, vueNote, titreNote, rafraichirNote } from "./notes.js";
import { vueReglages, vueNotifications, vueAppli, vueAnnonce } from "./reglages.js";
import { resumeNotifications } from "./notifs.js";
import { estInstallee } from "./installation.js";

/* LE fichier à adapter pour une nouvelle appli : quels écrans existent (ecran), ce que montre le panneau
   (groupesPanneau), ce qui se relit tout seul (A_RAFRAICHIR). Le reste (main.js, panneau.js) est générique. */

/* Ce qu'affiche une adresse « #rubrique/argument ». Renvoie :
   - titre       : le grand titre de la page, ou le titre de la barre du haut pour un écran poussé ;
   - retour      : [lien, libellé] pour un écran poussé (barre avec flèche). « Annuler » : écran d'écriture ;
   - action      : [icône, libellé, fonction] : la bulle ronde en bas à droite sur téléphone, en haut à droite sinon ;
   - avecEnvoi   : l'écran finit par une zone d'envoi collée en bas (zone-message.js) ;
   - lu          : la clé de nouveautés que cet écran marque comme lue (« notes/<id> ») ;
   - vue         : la fonction qui renvoie le contenu (éléments, tableaux d'éléments, ou rien). */
export function ecran(rubrique, argument) {
  if (rubrique === "notes" || rubrique === "") {
    if (!argument) return { titre: "Notes", action: ["fa-ajouter", "Nouvelle note", () => { location.hash = "#notes/nouvelle"; }], vue: vueNotes };
    if (argument === "nouvelle") return { titre: "Nouvelle note", retour: ["#notes", "Annuler"], vue: vueNouvelleNote };
    return { titre: titreNote(argument), retour: ["#notes", "Notes"], avecEnvoi: true, lu: "notes/" + argument, vue: () => vueNote(argument) };
  }
  if (rubrique === "reglages") return { titre: "Réglages", vue: vueReglages };
  if (rubrique === "notifications") return { titre: "Notifications", vue: vueNotifications };
  if (rubrique === "appli") return { titre: "Installer l'appli", retour: ["#reglages", "Réglages"], vue: vueAppli };
  if (rubrique === "annonce" && estAdmin()) return { titre: "Annonce", vue: vueAnnonce };
  return ecran("notes", "");
}

/* Le panneau latéral : des groupes (titre, classe de couleur des icônes dans style.css) d'entrées
   { lien, icone, titre, resume, nouveau }. Une entrée false est ignorée (ex. réservée à l'admin). */
export function groupesPanneau() {
  const notes = app.etat.notes;
  return [
    { titre: "Contenu", classe: "groupe-1", entrees: [
      { lien: "#notes", icone: "fa-episodes", titre: "Notes", nouveau: nombreNouveautes("notes"),
        resume: notes.length ? `${pluriel(notes.length, "note")} · dernière : ${notes[0].titre}` : "Aucune note" },
    ] },
    { titre: "Mon compte", classe: "groupe-compte", entrees: [
      { lien: "#notifications", icone: "fa-annonces", titre: "Notifications", resume: resumeNotifications() },
      !estInstallee() && { lien: "#appli", icone: "fa-info", titre: "Installer l'appli", resume: "Icône, plein écran, notifications" },
      { lien: "#reglages", icone: "fa-reglages", titre: "Réglages", resume: "Photo, thème, mode" },
    ] },
    { titre: "Admin", classe: "groupe-admin", entrees: [
      estAdmin() && { lien: "#annonce", icone: "fa-annonces", titre: "Annonce", resume: "Notifier tout le monde" },
    ] },
  ];
}

/* Relus toutes les 30 s et au retour sur l'appli, en plus de l'état général : les détails chargés à part. */
export const A_RAFRAICHIR = [rafraichirNote];
