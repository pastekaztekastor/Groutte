import { el, notifier } from "./commun.js";
import qrcode from "./qrcode.js";

/* Montants et moyens de paiement, repris de NextSession (budget.js). Montants en centimes, affichés en euros.
   moyensPaiement() fabrique la page « Payer » : utilisée par l'aperçu de Me rembourser, puis par Mes comptes et
   Créances (jalon 2). */

const formatEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const euros = c => formatEuros.format(c / 100);
export const enSaisie = c => (c / 100).toFixed(2).replace(".", ",");
const enLien = c => (c / 100).toFixed(2);

/* Les moyens, dans l'ordre d'affichage par défaut (le moyen préféré passe en premier). */
export const MOYENS = {
  virement: "Virement", wero: "Wero", paypal: "PayPal", lydia: "Lydia / Sumeria", revolut: "Revolut", especes: "Espèces",
};

export const moyenRenseigne = (p, cle) => Boolean(cle === "virement" ? p.iban : p[cle]);

export async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); notifier("Copié.", true); }
  catch (e) { prompt("Copie ceci :", texte); }
}

/* QR code de virement au format EPC (« QR code SEPA ») : lu par les applis bancaires qui le gèrent.
   Sans montant (null), le virement est pré-rempli sans somme. */
export function qrVirement(montant, iban, titulaire, libelle) {
  const somme = montant ? "EUR" + enLien(montant) : "";
  const donnees = ["BCD", "002", "1", "SCT", "", titulaire.slice(0, 70), iban, somme, "", "", libelle.slice(0, 140)].join("\n");
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
  const q = qrcode(0, "M");
  q.addData(donnees, "Byte");
  q.make();
  const n = q.getModuleCount();
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `-4 -4 ${n + 8} ${n + 8}`);
  svg.setAttribute("class", "qr");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "QR code du virement");
  const fond = document.createElementNS(NS, "rect");
  for (const [k, v] of Object.entries({ x: -4, y: -4, width: n + 8, height: n + 8, fill: "#ffffff" })) fond.setAttribute(k, v);
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  const points = document.createElementNS(NS, "path");
  points.setAttribute("d", d);
  points.setAttribute("fill", "#000000");
  svg.append(fond, points);
  return svg;
}

function ligneCopie(libelle, valeur, affiche = valeur) {
  return el("li", {},
    el("span", { class: "copie" }, el("span", { class: "doux petit" }, libelle), el("span", { class: "valeur" }, affiche)),
    el("button", { class: "discret", type: "button", onclick: () => copier(valeur) }, "Copier"));
}

/* Les moyens de paiement de `nom` (son `paiement`, tiré de Me rembourser) pour `montant` (centimes, ou null).
   Seulement ceux qu'il a renseignés, son moyen préféré en premier. */
export function moyensPaiement(nom, p, montant, libelle) {
  const somme = montant ? euros(montant) : "le montant";
  const blocs = {
    virement: () => el("section", { class: "carte" },
      el("h3", {}, "Virement"),
      el("ul", { class: "liste-simple" },
        el("li", {}, el("span", { class: "copie" }, el("span", { class: "doux petit" }, "Titulaire"), el("span", { class: "valeur" }, p.titulaire || nom))),
        ligneCopie("IBAN", p.iban, p.iban.replace(/(.{4})/g, "$1 ").trim()),
        montant && ligneCopie("Montant", enSaisie(montant), euros(montant)),
        ligneCopie("Libellé", libelle)),
      el("div", { class: "bloc-qr" }, qrVirement(montant, p.iban, p.titulaire || nom, libelle),
        el("p", { class: "doux petit" }, "Scanne ce QR code avec ton appli bancaire, si elle le permet : le virement est pré-rempli. Sinon, copie l'IBAN."))),
    wero: () => el("section", { class: "carte" },
      el("h3", {}, "Wero"),
      el("ul", { class: "liste-simple" }, ligneCopie("Numéro ou adresse", p.wero)),
      el("p", { class: "doux petit" }, `Dans ton appli bancaire : Wero, Envoyer, puis ce numéro et ${somme}.`)),
    paypal: () => el("a", { class: "btn large", href: `https://paypal.me/${encodeURIComponent(p.paypal)}${montant ? "/" + enLien(montant) + "EUR" : ""}`, target: "_blank", rel: "noopener" },
      montant ? `Payer ${euros(montant)} avec PayPal` : "Ouvrir PayPal"),
    lydia: () => el("a", { class: "btn large", href: p.lydia, target: "_blank", rel: "noopener noreferrer" },
      `Ouvrir Lydia / Sumeria (${somme} à saisir)`),
    revolut: () => el("a", { class: "btn large", href: `https://revolut.me/${encodeURIComponent(p.revolut)}`, target: "_blank", rel: "noopener" },
      `Ouvrir Revolut (${somme} à saisir)`),
    especes: () => el("section", { class: "carte" }, el("p", {}, `${nom} accepte les espèces en main propre.`)),
  };
  const ordre = Object.keys(MOYENS).filter(cle => moyenRenseigne(p, cle));
  if (p.prefere && ordre.includes(p.prefere)) ordre.sort((a, b) => (b === p.prefere) - (a === p.prefere));
  return ordre.map(cle => blocs[cle]());
}
