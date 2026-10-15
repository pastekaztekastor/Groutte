import { app, el, notifier, envoyer, afficher } from "./commun.js";

/* Notifications push : activer cet appareil, choisir ce qu'on reçoit, envoyer un test.
   L'abonnement est propre à chaque appareil (téléphone, ordinateur) ; les préférences, au compte. */

let appareil = null;   // null : pas encore vérifié ; sinon "actif" ou "inactif"

export const pris_en_charge = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/* Clé publique du serveur (base64url) au format attendu par le navigateur. */
function enOctets(cle) {
  const base64 = (cle + "=".repeat((4 - cle.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/* navigator.serviceWorker.ready peut ne jamais aboutir (service worker refusé) : on n'attend pas plus de 5 s. */
async function enregistrementPret() {
  const delai = new Promise((_, refus) => setTimeout(() => refus(new Error("service worker indisponible")), 5000));
  return Promise.race([navigator.serviceWorker.ready, delai]);
}

async function abonnementActuel() {
  return (await enregistrementPret()).pushManager.getSubscription();
}

/* État de cet appareil pour l'écran d'accueil de l'appli installée (installation.js) : null tant que
   la vérification n'a pas répondu, puis "actif" ou "inactif". */
export function etatAppareil() {
  if (appareil === null && pris_en_charge()) verifierAppareil();
  return appareil;
}

async function verifierAppareil() {
  try {
    appareil = (await abonnementActuel()) && Notification.permission === "granted" ? "actif" : "inactif";
  } catch (e) {
    appareil = "inactif";
  }
  afficher();
}

export async function activer() {
  if (await Notification.requestPermission() !== "granted") {
    notifier("Notifications refusées. Tu peux les autoriser dans les réglages du navigateur.");
    return;
  }
  try {
    const enregistrement = await enregistrementPret();
    const options = { userVisibleOnly: true, applicationServerKey: enOctets(app.etat.notifs.cle) };
    let abonnement;
    try {
      abonnement = await enregistrement.pushManager.subscribe(options);
    } catch (e) {
      // Ancien abonnement fait avec une autre clé serveur : on repart de zéro.
      await (await enregistrement.pushManager.getSubscription())?.unsubscribe();
      abonnement = await enregistrement.pushManager.subscribe(options);
    }
    if (await envoyer("notifs/abonner", { abonnement: abonnement.toJSON() })) {
      appareil = "actif";
      afficher();
      notifier("Notifications activées sur cet appareil.", true);
    }
  } catch (e) {
    notifier("Impossible d'activer les notifications : " + e.message);
  }
}

/* Aussi appelé à la déconnexion : l'appareil cesse de recevoir les notifications de ce compte. */
export async function desactiverAppareil() {
  if (!pris_en_charge()) return;
  try {
    const abonnement = await abonnementActuel();
    if (!abonnement) return;
    await envoyer("notifs/desabonner", { endpoint: abonnement.endpoint });
    await abonnement.unsubscribe();
  } catch (e) { /* rien à faire : au pire le serveur l'oubliera au prochain envoi refusé */ }
  appareil = "inactif";
}

/* Résumé pour la ligne « Notifications » (panneau, Réglages). */
export function resumeNotifications() {
  if (!app.etat.notifs.disponible || !pris_en_charge()) return "Indisponibles";
  if (Notification.permission === "denied") return "Bloquées";
  const etat = etatAppareil();
  return etat === "actif" ? "Activées" : etat === "inactif" ? "Désactivées" : "";
}

/* Page Notifications : cet appareil, puis ce que je veux recevoir (valable sur tous mes appareils). */
export function blocNotifications() {
  const n = app.etat.notifs;
  const blocs = [el("h2", {}, "Cet appareil")];
  if (!n.disponible) {
    blocs.push(el("section", { class: "carte" }, el("p", { class: "doux petit" }, "Les notifications ne sont pas disponibles sur ce serveur.")));
    return blocs;
  }

  const carte = el("section", { class: "carte" });
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!window.isSecureContext) {
    carte.append(el("p", { class: "doux petit" }, "Les notifications demandent le site en HTTPS (ou 127.0.0.1 sur l'ordinateur). Une adresse http://192.168... ne suffit pas."));
  } else if (!pris_en_charge()) {
    carte.append(el("p", { class: "doux petit" }, iphone
      ? "Sur iPhone, installe d'abord l'appli (Réglages > Installer l'appli), puis ouvre-la depuis l'écran d'accueil pour activer les notifications."
      : "Ce navigateur ne gère pas les notifications."));
  } else if (Notification.permission === "denied") {
    carte.append(el("p", { class: "doux petit" }, "Les notifications sont bloquées pour ce site : autorise-les dans les réglages du navigateur, puis reviens ici."));
  } else if (appareil === null) {
    verifierAppareil();
    carte.append(el("p", { class: "doux petit" }, "Vérification..."));
  } else if (appareil === "actif") {
    carte.append(
      el("p", { class: "doux petit" }, "Cet appareil reçoit les notifications."),
      el("div", { class: "actions" },
        el("button", {
          class: "btn large", type: "button",
          onclick: async () => { if (await envoyer("notifs/test")) notifier("Notification de test envoyée.", true); },
        }, "Envoyer un test"),
        el("button", {
          class: "btn danger large", type: "button",
          onclick: async () => { await desactiverAppareil(); afficher(); },
        }, "Désactiver sur cet appareil")));
  } else {
    carte.append(
      el("p", { class: "doux petit" }, "Reçois une notification quand il se passe quelque chose, même appli fermée."),
      el("button", { class: "btn principal large", type: "button", onclick: activer }, "Activer sur cet appareil"));
  }

  blocs.push(carte);
  // Préférences du compte : valables sur tous ses appareils. Un interrupteur par catégorie.
  blocs.push(el("h2", {}, "Me prévenir pour"),
    el("div", { class: "liste-groupee" }, Object.entries(n.categories).map(([cle, libelle]) => {
      const coche = el("input", { type: "checkbox", role: "switch", checked: n.prefs[cle] });
      coche.onchange = () => envoyer("notifs/prefs", { prefs: { [cle]: coche.checked } });
      return el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, libelle), coche);
    })),
    el("p", { class: "doux petit note" }, "Les annonces de l'admin et les mentions @ arrivent toujours."));
  return blocs;
}
