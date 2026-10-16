import { estStaff } from "./commun.js";
import { vueReglages, vueNotifications, vueAppli, vueAnnonce } from "./reglages.js";
import { resumeNotifications } from "./notifs.js";
import { estInstallee } from "./installation.js";
import { vueFiche, resumeFiche } from "./fiche.js";
import { vueRembourser, resumeRembourser } from "./rembourser.js";
import { vueCarnet, vueContact, titreContact, resumeCarnet } from "./carnet.js";
import { vueStaffComptes } from "./staff.js";

/* Les écrans de l'appli (ecran), ce que montre le panneau (groupesPanneau), ce qui se relit tout seul (A_RAFRAICHIR).
   Le reste (main.js, panneau.js) est générique.

   Jalon 1 : le socle. Compte (Ma fiche, Me rembourser, Notifications, Carnet d'adresses, Réglages) et
   Staff (Comptes, Annonce). Les autres groupes (Communauté, Gîte, Repas, Tournois, Budget, Drop box) viendront
   avec les jalons suivants. */

/* Ce qu'affiche une adresse « #rubrique/argument ». Renvoie :
   - titre       : le grand titre de la page, ou le titre de la barre du haut pour un écran poussé ;
   - retour      : [lien, libellé] pour un écran poussé (barre avec flèche). « Annuler » : écran d'écriture ;
   - action      : [icône, libellé, fonction] : la bulle ronde en bas à droite sur téléphone, en haut à droite sinon ;
   - avecEnvoi   : l'écran finit par une zone d'envoi collée en bas (zone-message.js) ;
   - lu          : la clé de nouveautés que cet écran marque comme lue ;
   - vue         : la fonction qui renvoie le contenu (éléments, tableaux d'éléments, ou rien). */
export function ecran(rubrique, argument) {
  if (rubrique === "fiche") return { titre: "Ma fiche", vue: vueFiche };
  if (rubrique === "rembourser") return { titre: "Me rembourser", vue: vueRembourser };
  if (rubrique === "carnet" || rubrique === "") {
    if (argument) return { titre: titreContact(argument), retour: ["#carnet", "Carnet"], vue: () => vueContact(argument) };
    return { titre: "Carnet d'adresses", vue: vueCarnet };
  }
  if (rubrique === "reglages") return { titre: "Réglages", vue: vueReglages };
  if (rubrique === "notifications") return { titre: "Notifications", vue: vueNotifications };
  if (rubrique === "appli") return { titre: "Installer l'appli", retour: ["#reglages", "Réglages"], vue: vueAppli };
  if (rubrique === "staff" && estStaff()) return { titre: "Comptes", vue: vueStaffComptes };
  if (rubrique === "annonce" && estStaff()) return { titre: "Annonce", vue: vueAnnonce };
  return ecran("carnet", "");
}

/* Le panneau latéral : des groupes (titre, classe de couleur des icônes dans style.css) d'entrées
   { lien, icone, titre, resume, nouveau }. Une entrée false est ignorée (ex. réservée au staff). */
export function groupesPanneau() {
  return [
    { titre: "Mon compte", classe: "groupe-compte", entrees: [
      { lien: "#fiche", icone: "fa-fiche", titre: "Ma fiche", resume: resumeFiche() },
      { lien: "#rembourser", icone: "fa-rembourser", titre: "Me rembourser", resume: resumeRembourser() },
      { lien: "#notifications", icone: "fa-cloche", titre: "Notifications", resume: resumeNotifications() },
      { lien: "#carnet", icone: "fa-carnet", titre: "Carnet d'adresses", resume: resumeCarnet() },
      !estInstallee() && { lien: "#appli", icone: "fa-installer", titre: "Installer l'appli", resume: "Icône, plein écran, notifications" },
      { lien: "#reglages", icone: "fa-reglages", titre: "Réglages", resume: "Thème, mode, code" },
    ] },
    { titre: "Staff", classe: "groupe-admin", entrees: [
      estStaff() && { lien: "#staff", icone: "fa-staff", titre: "Comptes", resume: "Droits, codes, rôles, journal" },
      estStaff() && { lien: "#annonce", icone: "fa-annonces", titre: "Annonce", resume: "Notifier tout le monde" },
    ] },
  ];
}

/* Relus toutes les 30 s et au retour sur l'appli, en plus de l'état général : les détails chargés à part. */
export const A_RAFRAICHIR = [];

