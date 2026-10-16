/* Service worker : rend l'appli installable et garde une copie de la page pour les coupures de réseau.
   Toujours le réseau d'abord : après une mise à jour du site, on n'utilise jamais une vieille copie. */
const CACHE = "appli";   /* un nom par appli servie sur le même domaine */
/* Hors production, le serveur remplace null par {id, nom} (environnement.py) : les notifications prennent
   l'icône de cet environnement et son nom en tête du titre, pour ne pas les confondre avec la production. */
const ENVIRONNEMENT = null;
const ICONES = "static/icones/" + (ENVIRONNEMENT ? ENVIRONNEMENT.id + "/" : "");

const HORS_LIGNE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors ligne</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f0ef;color:#21201c;font-family:system-ui,sans-serif;text-align:center;padding:16px">
<div><h1 style="font-size:1.3rem">Pas de réseau</h1><p style="color:#9a90a8">Reconnecte-toi, puis recharge la page.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", ev => ev.waitUntil(self.clients.claim()));

self.addEventListener("fetch", ev => {
  const requete = ev.request;
  const url = new URL(requete.url);
  if (requete.method !== "GET" || url.origin !== location.origin) return;
  // Données vivantes et fichiers envoyés : jamais de copie, c'est le réseau ou rien.
  if (/\/(api|media)\//.test(url.pathname)) return;
  ev.respondWith((async () => {
    try {
      const reponse = await fetch(requete);
      if (reponse.ok) (await caches.open(CACHE)).put(requete, reponse.clone());
      return reponse;
    } catch (e) {
      const copie = await caches.match(requete, { ignoreSearch: true });
      if (copie) return copie;
      if (requete.mode === "navigate") return new Response(HORS_LIGNE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      throw e;
    }
  })());
});

/* Notification reçue du serveur : on l'affiche, et une pastille apparaît sur l'icône de l'appli. */
self.addEventListener("push", ev => {
  let donnees = {};
  try { donnees = ev.data ? ev.data.json() : {}; } catch (e) { /* message illisible : notification générique */ }
  ev.waitUntil(Promise.all([
    self.registration.showNotification((ENVIRONNEMENT ? ENVIRONNEMENT.nom + " · " : "") + (donnees.titre || "Notification"), {
      body: donnees.texte || "",
      tag: donnees.tag || undefined,          // même page : la nouvelle remplace l'ancienne
      renotify: Boolean(donnees.tag),
      icon: ICONES + "icone-192.png",
      badge: ICONES + "badge-96.png",          // petite silhouette de la barre d'état Android
      data: { lien: donnees.lien || "#" },
    }),
    augmenterPastille(),
  ]));
});

/* Pastille de l'icône : iOS n'affiche qu'un nombre, il faut donc compter. Le service worker ne garde rien
   en mémoire entre deux notifications : le compteur est rangé dans le cache, et la page l'efface à l'ouverture. */
const PASTILLE = new URL("__pastille", self.registration.scope).href;

async function augmenterPastille() {
  if (!self.navigator.setAppBadge) return;
  try {
    const cache = await caches.open(CACHE);
    const actuel = Number(await (await cache.match(PASTILLE))?.text()) || 0;
    await cache.put(PASTILLE, new Response(String(actuel + 1)));
    await self.navigator.setAppBadge(actuel + 1);
  } catch (e) { /* pas de pastille sur ce système : la notification suffit */ }
}

/* Toucher la notification ouvre l'appli sur la bonne page (ou la ramène au premier plan). */
self.addEventListener("notificationclick", ev => {
  ev.notification.close();
  const cible = new URL(ev.notification.data?.lien || "#", self.registration.scope).href;
  ev.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const fenetre = fenetres.find(f => f.url.startsWith(self.registration.scope));
    if (fenetre) {
      await fenetre.focus();
      try { return await fenetre.navigate(cible); } catch (e) { /* fenêtre non contrôlée : on en ouvre une */ }
    }
    return self.clients.openWindow(cible);
  })());
});
