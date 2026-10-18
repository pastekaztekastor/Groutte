// Captures d'écran de l'appli dans Chromium sans fenêtre (protocole DevTools), pour vérifier un rendu sans téléphone.
// Node 22 ou plus (WebSocket intégré), et chromium (ou google-chrome : variable NAVIGATEUR).
//
//   node outils/captures.mjs <dossier> [largeur=390] [clair|sombre] [compte:code] [#adresse ...]
//   ex. node outils/captures.mjs /tmp/captures 390 sombre Bob:2222 "#fiche" "#carnet"
//   Le code sert à se connecter (chaque compte a son code). Sans compte : l'écran « Qui es-tu ? ».
//
// Le serveur doit tourner sur http://127.0.0.1:9124/ (PORT=9124 python3 serveur/app.py, idéalement sur une COPIE du projet :
// les essais écrivent dans data/). Une image par adresse, nommée d'après elle ; les erreurs JS sont affichées à la fin.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const [DIR, largeurTexte = "390", MODE = "clair", COMPTE_CODE = "", ...ADRESSES] = process.argv.slice(2);
const [COMPTE = "", CODE = ""] = COMPTE_CODE.split(":");
if (!DIR) { console.error("usage : node outils/captures.mjs <dossier> [largeur] [clair|sombre] [compte] [#adresse ...]"); process.exit(1); }
const LARGEUR = Number(largeurTexte);
const PREFIXE = "groutte";   // le même que PREFIXE dans static/js/commun.js
const URL0 = "http://127.0.0.1:9124/";
mkdirSync(DIR, { recursive: true });

const chrome = spawn(process.env.NAVIGATEUR || "chromium", ["--headless=new", "--remote-debugging-port=9333", "--no-first-run",
  `--user-data-dir=${DIR}/profil`, "about:blank"], { stdio: "ignore" });
const attendre = ms => new Promise(r => setTimeout(r, ms));
await attendre(3500);
const cibles = await (await fetch("http://127.0.0.1:9333/json")).json();
const ws = new WebSocket(cibles.find(c => c.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const enAttente = new Map();
const journal = [];
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && enAttente.has(d.id)) { enAttente.get(d.id)(d); enAttente.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") journal.push("EXCEPTION " + JSON.stringify(d.params.exceptionDetails).slice(0, 500));
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") journal.push("console.error " + JSON.stringify(d.params.args).slice(0, 300));
};
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; enAttente.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const capture = async nom => { const r = await cdp("Page.captureScreenshot"); writeFileSync(`${DIR}/${nom}.png`, Buffer.from(r.result.data, "base64")); };

await cdp("Runtime.enable");
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: LARGEUR, height: 820, deviceScaleFactor: 1, mobile: LARGEUR < 900 });
await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
await cdp("Page.navigate", { url: URL0 });
await attendre(1200);
// Connexion (le jeton du compte), le mode, et le guide d'installation déjà vu (sinon il couvre tout sur téléphone).
const jeton = COMPTE ? (await (await fetch(URL0 + "api/connexion", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nom: COMPTE, code: CODE }) })).json()).jeton || "" : "";
await ev(`localStorage.setItem("${PREFIXE}-compte", ${JSON.stringify(COMPTE)}); localStorage.setItem("${PREFIXE}-jeton", ${JSON.stringify(jeton)});
  localStorage.setItem("${PREFIXE}-mode", "${MODE}");
  sessionStorage.setItem("${PREFIXE}-guide-vu", "1"); location.reload()`);
await attendre(1500);

for (const adresse of ADRESSES.length ? ADRESSES : ["#"]) {
  await ev(`location.hash = ${JSON.stringify(adresse)}`);
  await attendre(1300);
  await capture((adresse.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "accueil") + "-" + LARGEUR);
}
console.log(journal.length ? journal.join("\n") : "Aucune erreur JS.");
ws.close();
chrome.kill();
process.exit(0);
