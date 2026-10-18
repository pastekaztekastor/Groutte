import { app, estStaff, nombreNouveautes } from "./commun.js";
import { vueReglages, vueNotifications, vueAppli } from "./reglages.js";
import { resumeNotifications } from "./notifs.js";
import { estInstallee } from "./installation.js";
import { vueFiche, resumeFiche } from "./fiche.js";
import { vueRembourser, resumeRembourser } from "./rembourser.js";
import { vueCarnet, vueContact as vueFicheContact, titreContact, resumeCarnet } from "./carnet.js";
import { vueStaffComptes } from "./staff.js";
import { vueForum, ouvrirCreation, rafraichirSujet } from "./forum.js";
import { vueContact } from "./contact.js";
import { vuePresence, resumePresence } from "./presence.js";
import { vueLits, resumeLits, ouvrirPlan } from "./lits.js";
import { vueRepas, resumeRepas } from "./repas.js";
import { vueComptes, vueRembourserA, resumeComptes, aConfirmerComptes } from "./mes-comptes.js";
import { vueCreances, vuePayer, titrePayer, resumeCreances, aConfirmer } from "./creances.js";
import { vueDepenses, vueSaisie, vueDepense, titreDepense, resumeDepenses, nouvelleDepense } from "./depenses.js";
import { vueFaq } from "./faq.js";
import { vueGiteSalle, resumeGiteSalle } from "./gite-salle.js";
import { vueReglagesCompta, resumeReglagesCompta } from "./reglages-compta.js";
import { vueValidation, vueValidationDepense, titreValidation, resumeValidation, enAttente } from "./validation.js";
import { vueMenu, vueMenuDetail, vueSaisieMenu, nouveauMenu, titreMenu, resumeMenu } from "./menu.js";
import { vuePings, resumePings, nonLus } from "./pings.js";
import { vueAnnonces, resumeAnnonces } from "./annonces.js";
import { vueSuivi, resumeSuivi } from "./suivi.js";
import { vueReglagesLlm, resumeReglagesLlm } from "./reglages-llm.js";
import { vueAccueil } from "./accueil.js";
import { vueBienvenue, titreBienvenue } from "./bienvenue.js";

/* Les écrans de l'appli (ecran), ce que montre le panneau (groupesPanneau), ce qui se relit tout seul (A_RAFRAICHIR).
   Le reste (main.js, panneau.js) est générique.

   Jalon 1 : le socle (Mon compte, Staff > Comptes et Annonce). Jalon 2 : Communauté (Forum, Contacter le staff),
   Gîte (Présence, Lits), Repas (Mes repas), Budget (Remboursement, Créances, Dépenses, FAQ), et pour le
   staff Gîte et salle, Réglages compta, Validation des dépenses. Jalon 3 : Pings reçus, Menu, et pour le staff
   Réglages LLM, Suivi des dépenses, Annonces. */

/* Ce qu'affiche une adresse « #rubrique/argument ». Renvoie :
   - titre       : le grand titre de la page, ou le titre de la barre du haut pour un écran poussé ;
   - retour      : [lien, libellé] pour un écran poussé (barre avec flèche). « Annuler » : écran d'écriture ;
                   lien vide : on revient d'où l'on vient ;
   - action      : [icône, libellé, fonction] : la bulle ronde en bas à droite sur téléphone, en haut à droite sinon ;
   - avecEnvoi   : l'écran finit par une zone d'envoi collée en bas (zone-message.js) ;
   - lu          : la clé de nouveautés que cet écran marque comme lue ;
   - sansPanneau : ni panneau latéral ni bulle de compte (le guide de bienvenue : on n'en sort que par ses boutons) ;
   - vue         : la fonction qui renvoie le contenu (éléments, tableaux d'éléments, ou rien). */
export function ecran(rubrique, argument) {
  if (rubrique === "fiche") return { titre: "Ma fiche", vue: vueFiche };
  if (rubrique === "rembourser") return { titre: "Moyen de paiement", vue: vueRembourser };
  // Première connexion : le guide remplace l'accueil tant qu'il n'est pas vu (bienvenue.js).
  if (rubrique === "bienvenue" || (rubrique === "" && app.etat.moi.guide_vu === false)) return { titre: titreBienvenue(argument), sansPanneau: true, vue: () => vueBienvenue(argument) };
  if (rubrique === "") return { titre: "Accueil", vue: vueAccueil };
  if (rubrique === "carnet") {
    if (argument) return { titre: titreContact(argument), retour: ["", "Retour"], vue: () => vueFicheContact(argument) };
    return { titre: "Carnet d'adresses", vue: vueCarnet };
  }
  if (rubrique === "reglages") return { titre: "Réglages", vue: vueReglages };
  if (rubrique === "notifications") return { titre: "Notifications", vue: vueNotifications };
  if (rubrique === "appli") return { titre: "Installer l'appli", retour: ["#reglages", "Réglages"], vue: vueAppli };

  // Communauté
  if (rubrique === "forum") {
    if (argument === "nouveau") return { titre: "Nouveau post", retour: ["#forum", "Annuler"], vue: () => vueForum("nouveau") };
    if (argument) {
      const titre = app.etat.forum.find(s => s.id === argument)?.titre || "Post";
      return { titre, retour: ["#forum", "Forum"], avecEnvoi: true, lu: "forum/" + argument, vue: () => vueForum(argument) };
    }
    return { titre: "Forum", action: ["fa-ecrire", "Nouveau post", ouvrirCreation], vue: () => vueForum("") };
  }
  if (rubrique === "contact") return { titre: "Contacter le staff", vue: vueContact };
  if (rubrique === "pings") return { titre: "Pings reçus", vue: vuePings };

  // Gîte et repas
  if (rubrique === "presence") return { titre: "Présence", vue: vuePresence };
  if (rubrique === "lits") return { titre: "Lits", action: app.etat.gite.lits.length ? ["fa-plan", "Plan du gîte", ouvrirPlan] : null, vue: vueLits };
  if (rubrique === "repas") return { titre: "Mes repas", vue: vueRepas };
  if (rubrique === "menu") {
    if (argument === "nouveau") return { titre: "Proposer un menu", retour: ["#menu", "Annuler"], vue: () => vueSaisieMenu("") };
    if (argument) return { titre: titreMenu(argument), retour: ["#menu", "Menu"], lu: "menu/" + argument, vue: () => vueMenuDetail(argument) };
    return { titre: "Menu", action: ["fa-ajouter", "Proposer un menu", nouveauMenu], lu: "menu", vue: vueMenu };
  }
  if (rubrique === "menu-modifier" && argument) return { titre: "Modifier le menu", retour: ["#menu/" + argument, "Annuler"], vue: () => vueSaisieMenu(argument) };

  // Budget
  if (rubrique === "comptes") return { titre: "Remboursement", vue: vueComptes };
  if (rubrique === "rembourser-a" && argument) return { titre: `Rembourser ${argument}`, retour: ["#comptes", "Remboursement"], vue: () => vueRembourserA(argument) };
  if (rubrique === "creances") return { titre: "Créances gîte et salle", vue: vueCreances };
  if (rubrique === "payer") return { titre: titrePayer(argument), retour: ["#creances", "Créances"], vue: () => vuePayer(argument) };
  // Dépenses cachée (Réglages compta) : ni la liste ni la saisie, sauf pour le staff ; une dépense déjà liée reste lisible.
  if (rubrique === "depenses" && (depensesVisibles() || (argument && argument !== "nouvelle"))) {
    if (argument === "nouvelle") return { titre: "Nouvelle dépense", retour: ["#depenses", "Annuler"], vue: () => vueSaisie(null) };
    if (argument) return { titre: titreDepense(argument), retour: ["", "Retour"], vue: () => vueDepense(argument) };
    return { titre: "Dépenses", action: ["fa-ajouter", "Nouvelle dépense", nouvelleDepense], vue: vueDepenses };
  }
  if (rubrique === "faq") return { titre: "FAQ", vue: () => vueFaq(argument) };

  // Staff
  if (estStaff()) {
    if (rubrique === "staff") return { titre: "Comptes", vue: vueStaffComptes };
    if (rubrique === "annonces") return { titre: "Annonces", vue: vueAnnonces };
    if (rubrique === "suivi") return { titre: "Suivi des dépenses", vue: vueSuivi };
    if (rubrique === "reglages-llm") return { titre: "Réglages LLM", vue: vueReglagesLlm };
    if (rubrique === "gite-salle") return { titre: "Gîte et salle", vue: vueGiteSalle };
    if (rubrique === "reglages-compta") return { titre: "Réglages compta", vue: vueReglagesCompta };
    if (rubrique === "validation") {
      if (argument) return { titre: titreValidation(argument), retour: ["#validation", "Validation"], vue: () => vueValidationDepense(argument) };
      return { titre: "Validation des dépenses", vue: vueValidation };
    }
  }
  return ecran("", "");
}

const depensesVisibles = () => estStaff() || app.etat.compta.depenses_visibles;

/* Le panneau latéral : des groupes (titre, classe de couleur des icônes dans style.css) d'entrées
   { lien, icone, titre, resume, nouveau }. Une entrée false est ignorée (ex. réservée au staff). */
export function groupesPanneau() {
  const forum = nombreNouveautes("forum");
  const aValider = enAttente().filter(d => d.auteur !== app.moi).length;
  const tardifs = app.etat.gite.tardifs?.length || 0;
  return [
    { classe: "groupe-compte", entrees: [
      { lien: "#", icone: "fa-accueil", titre: "Accueil", resume: "À faire, séjour, argent, nouveautés" },
    ] },
    { titre: "Communauté", classe: "groupe-1", entrees: [
      { lien: "#faq", icone: "fa-aide", titre: "FAQ", resume: "Fonctionnement de l'app" },
      { lien: "#forum", icone: "fa-forum", titre: "Forum", resume: forum ? `${forum} fil${forum > 1 ? "s" : ""} avec du nouveau` : "Règles, orga et blabla", nouveau: forum },
      { lien: "#pings", icone: "fa-pings", titre: "Pings reçus", resume: resumePings(), nouveau: nonLus() },
      { lien: "#contact", icone: "fa-contact", titre: "Contacter le staff", resume: "Discord, hébergeurs, staff" },
    ] },
    { titre: "Budget", classe: "groupe-3", entrees: [
      { lien: "#comptes", icone: "fa-comptes", titre: "Remboursement", resume: resumeComptes(), nouveau: aConfirmerComptes() },
      { lien: "#creances", icone: "fa-creances", titre: "Créances gîte et salle", resume: resumeCreances(), nouveau: aConfirmer() },
      depensesVisibles() && { lien: "#depenses", icone: "fa-depenses", titre: "Dépenses", resume: resumeDepenses() },
    ] },
    { titre: "Repas", classe: "groupe-4", entrees: [
      { lien: "#repas", icone: "fa-repas", titre: "Mes repas", resume: resumeRepas() },
      { lien: "#menu", icone: "fa-menu", titre: "Menu", resume: resumeMenu(), nouveau: nombreNouveautes("menu") },
    ] },
    { titre: "Gîte", classe: "groupe-2", entrees: [
      { lien: "#presence", icone: "fa-presence", titre: "Présence", resume: resumePresence() },
      { lien: "#lits", icone: "fa-lit", titre: "Lits", resume: resumeLits() },
    ] },
    { titre: "Mon compte", classe: "groupe-compte", entrees: [
      { lien: "#rembourser", icone: "fa-rembourser", titre: "Moyen de paiement", resume: resumeRembourser() },
      { lien: "#notifications", icone: "fa-cloche", titre: "Notifications", resume: resumeNotifications() },
      { lien: "#carnet", icone: "fa-carnet", titre: "Carnet d'adresses", resume: resumeCarnet() },
      !estInstallee() && { lien: "#appli", icone: "fa-installer", titre: "Installer l'appli", resume: "Icône, plein écran, notifications" },
      { lien: "#reglages", icone: "fa-reglages", titre: "Réglages", resume: "Thème, mode, code" },
    ] },
    { titre: "Staff", classe: "groupe-admin", entrees: [
      estStaff() && { lien: "#staff", icone: "fa-staff", titre: "Comptes", resume: "Droits, codes, rôles, journal" },
      estStaff() && { lien: "#gite-salle", icone: "fa-gite", titre: "Gîte et salle", resume: resumeGiteSalle(), nouveau: tardifs },
      estStaff() && { lien: "#reglages-compta", icone: "fa-categories", titre: "Réglages compta", resume: resumeReglagesCompta() },
      estStaff() && { lien: "#reglages-llm", icone: "fa-llm", titre: "Réglages LLM", resume: resumeReglagesLlm() },
      estStaff() && { lien: "#validation", icone: "fa-valider", titre: "Validation des dépenses", resume: resumeValidation(), nouveau: aValider },
      estStaff() && { lien: "#suivi", icone: "fa-suivi", titre: "Suivi des dépenses", resume: resumeSuivi() },
      estStaff() && { lien: "#annonces", icone: "fa-annonces", titre: "Annonces", resume: resumeAnnonces() },
    ] },
  ];
}

/* Relus toutes les 30 s et au retour sur l'appli, en plus de l'état général : les détails chargés à part. */
export const A_RAFRAICHIR = [rafraichirSujet];
