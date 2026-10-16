import { app, el, envoyer, ouvrirModale, fermerModale, notifier } from "./commun.js";
import { MOYENS, moyenRenseigne, moyensPaiement } from "./paiement.js";

/* #rembourser : Me rembourser. Les moyens de recevoir l'argent qu'on me doit, repris de NextSession.
   Ils ne sont montrés qu'à ceux qui me doivent de l'argent (page « Payer », jalon 2) ; ici, un aperçu. */

const paiement = () => app.etat.moi.paiement || {};
const ibanMasque = iban => iban ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : "";

/* Ce qu'affiche la ligne d'un moyen renseigné. */
function valeur(cle, p) {
  if (cle === "virement") return `${ibanMasque(p.iban)} (${p.titulaire})`;
  if (cle === "paypal") return "paypal.me/" + p.paypal;
  if (cle === "revolut") return "@" + p.revolut;
  if (cle === "lydia") return "Lien enregistré";
  return p[cle];
}

/* La fenêtre d'un moyen : son ou ses champs, « Enregistrer », et « Retirer » s'il est renseigné. */
function modifier(cle) {
  const p = paiement();
  const champ = (nom, props) => el("input", { value: p[nom] || "", autocomplete: "off", spellcheck: "false", ...props });
  const champs = {
    virement: [["titulaire", "Titulaire du compte", champ("titulaire", { maxlength: 70, autocomplete: "name", required: true })],
      ["iban", "IBAN", champ("iban", { maxlength: 50, placeholder: "FR76 ...", required: true })]],
    wero: [["wero", "Numéro de téléphone ou adresse mail lié à Wero", champ("wero", { maxlength: 100, placeholder: "06 12 34 56 78", required: true })]],
    paypal: [["paypal", "Identifiant PayPal.me", champ("paypal", { maxlength: 100, placeholder: "paypal.me/ton-identifiant", required: true })]],
    lydia: [["lydia", "Lien Lydia / Sumeria", champ("lydia", { maxlength: 300, type: "url", placeholder: "https://...", required: true })]],
    revolut: [["revolut", "Identifiant Revolut", champ("revolut", { maxlength: 100, placeholder: "@ton-revtag", required: true })]],
  }[cle];
  const retirer = moyenRenseigne(p, cle) && el("button", {
    class: "btn danger large separe", type: "button",
    onclick: async () => {
      const vide = Object.fromEntries(champs.map(([nom]) => [nom, ""]));
      if (await envoyer("paiement", vide)) { fermerModale(); notifier(`${MOYENS[cle]} retiré.`, true); }
    },
  }, "Retirer");
  ouvrirModale(MOYENS[cle], [champs.map(([, libelle, e]) => el("label", { class: "champ" }, libelle, e)), retirer], "Enregistrer",
    () => envoyer("paiement", Object.fromEntries(champs.map(([nom, , e]) => [nom, e.value]))));
}

export function vueRembourser() {
  const p = paiement();
  const renseignes = Object.keys(MOYENS).filter(cle => moyenRenseigne(p, cle));
  const especes = el("input", { type: "checkbox", role: "switch", checked: Boolean(p.especes) });
  especes.onchange = () => envoyer("paiement", { especes: especes.checked });
  const prefere = el("select", { "aria-label": "Moyen préféré" },
    el("option", { value: "" }, renseignes.length ? "Aucun" : "Renseigne d'abord un moyen"),
    renseignes.map(cle => el("option", { value: cle, selected: p.prefere === cle }, MOYENS[cle])));
  prefere.onchange = () => envoyer("paiement", { prefere: prefere.value });

  return [
    el("p", { class: "doux petit note" }, "Comment on peut te rembourser. Seuls ceux qui te doivent de l'argent voient ces informations, au moment de payer. Tout est facultatif."),
    el("h2", {}, "Mes moyens de paiement"),
    el("div", { class: "liste-groupee" },
      Object.keys(MOYENS).filter(cle => cle !== "especes").map(cle => el("button", { type: "button", class: "ligne entree", onclick: () => modifier(cle) },
        el("span", { class: "ligne-texte" }, MOYENS[cle],
          moyenRenseigne(p, cle) && el("span", { class: "doux petit" }, valeur(cle, p), p.prefere === cle && " · préféré")),
        !moyenRenseigne(p, cle) && el("span", { class: "ligne-valeur" }, "Ajouter"))),
      el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, "J'accepte les espèces en main propre"), especes),
      el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, "Moyen préféré"), prefere)),
    el("h2", {}, "Ce que verront ceux qui te doivent"),
    renseignes.length
      ? el("div", { class: "moyens" }, moyensPaiement(app.moi, p, null, `Groutte - Remboursement - ${app.moi}`))
      : el("p", { class: "doux note" }, "Rien pour l'instant : ils verront « Demande-lui comment la rembourser »."),
  ];
}

export function resumeRembourser() {
  const p = paiement();
  const noms = Object.keys(MOYENS).filter(cle => moyenRenseigne(p, cle)).map(cle => MOYENS[cle]);
  return noms.length ? noms.join(", ") : "Aucun moyen renseigné";
}
