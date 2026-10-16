import { app, el, icone, avatar, qui, sansAccent, envoyer, notifier, afficher, dateCourte, iso, ilYa, urlApercu,
  televerserImage, boutonIcone } from "./commun.js";
import { euros, enSaisie, lireEuros } from "./paiement.js";
import { ouvrirVisionneuse } from "./visionneuse.js";

/* #depenses : Budget > Dépenses, la liste de mes dépenses. #depenses/nouvelle : l'écran de saisie. #depenses/<id> : une
   dépense (modifiable tant qu'elle est en brouillon, chez son auteur). Le détail sert aussi à Staff > Validation.
   Brouillon -> En attente (envoyée) -> Validée par un staff ; un refus la remet en brouillon, avec un motif. */

export const ETATS = { brouillon: "Brouillon", attente: "En attente", validee: "Validée" };
const MODES = { egales: "Parts égales", exacts: "Montants exacts", communaute: "Pour la communauté" };
const REMBOURSEMENT = { remboursee: "remboursée", partielle: "remboursée en partie", "a-rembourser": "à rembourser" };
export const trouverDepense = id => app.etat.depenses.find(d => d.id === id);

/* Les personnes concernées : celles des parts figées, sinon celles qu'on a choisies. */
function concernes(d) {
  if (d.etat === "validee") return Object.keys(d.parts);
  if (d.mode === "egales") return d.concernes;
  if (d.mode === "exacts") return d.lignes.map(l => l.nom);
  return d.apercu ? Object.keys(d.apercu) : [];
}

function avatars(noms) {
  return el("span", { class: "avatars" }, noms.slice(0, 5).map(n => avatar(n, 24)), noms.length > 5 && el("span", { class: "doux petit" }, `+${noms.length - 5}`));
}

export function ligneDepense(d, lien) {
  return el("a", { class: "ligne ligne-depense", href: lien },
    el("span", { class: "ligne-texte" },
      el("span", { class: "rangee-depense" }, el("span", { class: "doux petit" }, dateCourte(d.date)), el("strong", {}, d.motif || "Sans motif")),
      el("span", { class: "rangee-depense" },
        el("span", { class: "etat-depense " + d.etat }, ETATS[d.etat] + (d.remboursement ? ` · ${REMBOURSEMENT[d.remboursement]}` : "")),
        d.etat === "brouillon" && d.refus && el("span", { class: "badge refus" }, "refusée"),
        d.mode === "communaute" && d.etat !== "validee" ? el("span", { class: "doux petit" }, "Communauté") : avatars(concernes(d)))),
    el("span", { class: "ligne-valeur montant" }, euros(d.montant)));
}

export function vueDepenses() {
  const miennes = app.etat.depenses.filter(d => d.auteur === app.moi);
  return [
    miennes.length
      ? el("div", { class: "liste-groupee liste-elements" }, miennes.map(d => ligneDepense(d, "#depenses/" + d.id)))
      : el("p", { class: "doux" }, "Tu n'as saisi aucune dépense. Tu as payé quelque chose pour le groupe ? Touche +."),
    el("p", { class: "note" }, el("a", { href: "#faq/paye-pour-groupe" }, "Comment ça marche ?")),
  ];
}

/* --- Saisie ------------------------------------------------------------------------------------------------
   Le formulaire garde son brouillon ici (la page se redessine toutes les 30 s) ; les champs le mettent à jour
   sans redessiner, les changements de structure (mode, personnes, lignes) redessinent. */

const formulaires = {};   // id ou "nouvelle" -> brouillon du formulaire

function nouveauFormulaire(d) {
  if (d) {
    return {
      date: d.date, motif: d.motif, montant: d.montant ? enSaisie(d.montant) : "", mode: d.mode, ticket: d.ticket, fichier: null,
      concernes: d.mode === "egales" ? [...d.concernes] : d.mode === "exacts" ? d.lignes.map(l => l.nom) : [app.moi],
      exacts: Object.fromEntries(d.mode === "exacts" ? d.lignes.map(l => [l.nom, enSaisie(l.montant)]) : []),
      categories: d.mode === "communaute" ? d.lignes.map(l => ({ categorie: l.categorie, montant: enSaisie(l.montant) })) : [{ categorie: "alimentaire", montant: "" }],
    };
  }
  const premiere = app.etat.categories.categories[0]?.id || "non-gere";
  return { date: iso(new Date()), motif: "", montant: "", mode: "egales", ticket: "", fichier: null, concernes: [app.moi], exacts: {},
    categories: [{ categorie: premiere, montant: "" }] };
}

function champTexte(f, cle, props) {
  const e = el("input", { value: f[cle], ...props });
  e.addEventListener("input", () => { f[cle] = e.value; });
  return e;
}

/* Les personnes concernées : pastilles, et « @ » puis un nom pour en ajouter (comme dans le forum). */
function choixPersonnes(f) {
  const entree = el("input", { type: "search", placeholder: "@ puis un nom", "aria-label": "Ajouter une personne", autocomplete: "off" });
  const suggestions = el("div", { class: "suggestions-staff", role: "listbox" });
  entree.addEventListener("input", () => {
    const texte = sansAccent(entree.value.replace(/^@/, "").trim());
    const trouves = texte ? app.etat.comptes.filter(c => !c.desactive && !f.concernes.includes(c.nom) && sansAccent(c.nom).includes(texte)).slice(0, 6) : [];
    suggestions.replaceChildren(...trouves.map(c => el("button", {
      type: "button", class: "ligne entree", role: "option", onclick: () => { f.concernes.push(c.nom); afficher(); },
    }, avatar(c.nom, 28), el("span", { class: "ligne-texte" }, c.nom))));
  });
  const tous = () => { for (const c of app.etat.comptes) if (!c.desactive && !f.concernes.includes(c.nom)) f.concernes.push(c.nom); afficher(); };
  return el("div", { class: "carte choix-membres" },
    el("div", { class: "pastilles" }, f.concernes.map(nom => el("button", {
      type: "button", class: "puce actif", "aria-label": `Retirer ${nom}`, onclick: () => { f.concernes = f.concernes.filter(n => n !== nom); afficher(); },
    }, avatar(nom, 20), nom === app.moi ? "Moi" : nom, " ×")), entree),
    suggestions,
    el("button", { type: "button", class: "discret", onclick: tous }, "Tout le monde"));
}

function lignesExactes(f) {
  if (!f.concernes.length) return null;
  return el("div", { class: "liste-groupee" }, f.concernes.map(nom => {
    const champ = el("input", { inputmode: "decimal", value: f.exacts[nom] || "", placeholder: "0,00", "aria-label": `Montant de ${nom}`, class: "champ-montant" });
    champ.addEventListener("input", () => { f.exacts[nom] = champ.value; majTotal(f); });
    return el("label", { class: "ligne" }, avatar(nom, 28), el("span", { class: "ligne-texte" }, nom === app.moi ? "Moi" : nom), champ, el("span", { class: "doux" }, "€"));
  }));
}

function lignesCategories(f) {
  const proposees = app.etat.categories.categories;
  return el("div", { class: "liste-groupee" }, f.categories.map((l, i) => {
    const choix = el("select", { "aria-label": "Catégorie" }, proposees.map(c => el("option", { value: c.id, selected: c.id === l.categorie }, c.nom)),
      !proposees.some(c => c.id === l.categorie) && el("option", { value: l.categorie, selected: true }, "Catégorie supprimée"));
    choix.onchange = () => { l.categorie = choix.value; };
    const champ = el("input", { inputmode: "decimal", value: l.montant, placeholder: "0,00", "aria-label": "Montant", class: "champ-montant" });
    champ.addEventListener("input", () => { l.montant = champ.value; majTotal(f); });
    return el("div", { class: "ligne" }, choix, champ, el("span", { class: "doux" }, "€"),
      f.categories.length > 1 && boutonIcone("fermer", "Retirer cette ligne", () => { f.categories.splice(i, 1); afficher(); }));
  }), el("button", { type: "button", class: "ligne entree", onclick: () => { f.categories.push({ categorie: "non-gere", montant: "" }); afficher(); } },
    el("span", { class: "ligne-texte" }, "Ajouter une catégorie")));
}

/* « Reste à répartir » sous les lignes, mis à jour en tapant (sans redessiner la page). */
function totalLignes(f) {
  const montants = f.mode === "exacts" ? f.concernes.map(n => f.exacts[n]) : f.categories.map(l => l.montant);
  return montants.reduce((t, m) => t + (lireEuros(m) || 0), 0);
}

function texteTotal(f) {
  const total = lireEuros(f.montant) || 0;
  const reste = total - totalLignes(f);
  return reste === 0 ? "Le compte est bon." : reste > 0 ? `Reste ${euros(reste)} à répartir.` : `${euros(-reste)} de trop.`;
}

function majTotal(f) {
  const e = document.getElementById("reste-depense");
  if (e) e.textContent = texteTotal(f);
}

function choixTicket(f) {
  const entree = el("input", { type: "file", accept: "image/*", class: "cache" });
  entree.onchange = () => { f.fichier = entree.files[0] || null; entree.value = ""; afficher(); };
  const apercu = f.fichier ? URL.createObjectURL(f.fichier) : f.ticket ? urlApercu(f.ticket) : null;
  return el("div", { class: "carte ticket" },
    apercu && el("img", { src: apercu, alt: "Photo du ticket", class: "apercu-ticket" }),
    el("div", { class: "rangee" },
      el("label", { class: "discret" }, apercu ? "Changer la photo" : "Ajouter la photo du ticket", entree),
      apercu && el("button", { type: "button", class: "discret danger", onclick: () => { f.fichier = null; f.ticket = ""; afficher(); } }, "Retirer")));
}

async function sauver(id, f, envoi) {
  const montant = lireEuros(f.montant);
  if (montant === null && (envoi || f.montant)) return notifier("Indique un montant valable, par exemple 12,50.");
  let ticket = f.ticket;
  if (f.fichier) {
    notifier("Envoi de la photo...", true);
    ticket = await televerserImage({ type: "image" }, f.fichier);
    if (!ticket) return;
    f.ticket = ticket;
    f.fichier = null;
  }
  const corps = { date: f.date, motif: f.motif, montant: montant || 0, mode: f.mode, ticket, envoyer: envoi };
  if (id) corps.id = id;
  if (f.mode === "egales") corps.concernes = f.concernes;
  else if (f.mode === "exacts") corps.lignes = f.concernes.map(nom => ({ nom, montant: lireEuros(f.exacts[nom]) || 0 }));
  else corps.lignes = f.categories.map(l => ({ categorie: l.categorie, montant: lireEuros(l.montant) || 0 }));
  if (!await envoyer("depenses/enregistrer", corps)) return;
  delete formulaires[id || "nouvelle"];
  notifier(envoi ? "Dépense envoyée : un staff va la valider." : "Brouillon enregistré.", true);
  location.replace(envoi || !id ? "#depenses" : "#depenses/" + id);
}

export function vueSaisie(d) {
  const id = d?.id || "";
  const f = formulaires[id || "nouvelle"] ??= nouveauFormulaire(d);
  const mode = el("div", { class: "segments segments-trois", role: "radiogroup", "aria-label": "Mode de répartition" },
    Object.entries(MODES).map(([cle, libelle]) => el("button", {
      type: "button", class: f.mode === cle ? "choisi" : "", role: "radio", "aria-checked": String(f.mode === cle),
      onclick: () => { f.mode = cle; afficher(); },
    }, libelle)));
  return [
    d?.refus && el("section", { class: "carte bandeau" }, el("p", {}, el("strong", {}, "Refusée : "), d.refus)),
    el("div", { class: "carte" },
      el("label", { class: "champ" }, "Date du ticket", champTexte(f, "date", { type: "date" })),
      el("label", { class: "champ" }, "Motif", champTexte(f, "motif", { maxlength: 120, placeholder: "Courses Leclerc, McDo..." })),
      el("label", { class: "champ" }, "Montant total (en euros)", (() => {
        const e = champTexte(f, "montant", { inputmode: "decimal", placeholder: "0,00" });
        e.addEventListener("input", () => majTotal(f));
        return e;
      })())),
    el("h2", {}, "Photo du ticket"),
    choixTicket(f),
    el("h2", {}, "Répartition"),
    mode,
    f.mode === "egales" && [el("p", { class: "doux petit note" }, "Le montant est divisé entre les personnes concernées. Les centimes en trop sont pour toi."), choixPersonnes(f)],
    f.mode === "exacts" && [el("p", { class: "doux petit note" }, "Une ligne par personne, avec ce qu'elle a pris."), choixPersonnes(f), lignesExactes(f)],
    f.mode === "communaute" && [el("p", { class: "doux petit note" }, "Le montant est découpé par catégories, chacune réparti selon sa règle. NON GÉRÉ met de côté un achat perso : il reste pour toi."),
      lignesCategories(f)],
    f.mode !== "egales" && el("p", { class: "note", id: "reste-depense", "aria-live": "polite" }, texteTotal(f)),
    el("div", { class: "actions" },
      el("button", { class: "btn principal large", type: "button", onclick: () => sauver(id, f, true) }, "Envoyer"),
      el("button", { class: "btn large", type: "button", onclick: () => sauver(id, f, false) }, "Enregistrer le brouillon"),
      id && el("button", { class: "btn danger large", type: "button", onclick: async () => {
        if (confirm("Supprimer ce brouillon ?") && await envoyer("depenses/supprimer", { id })) { delete formulaires[id]; location.replace("#depenses"); }
      } }, "Supprimer le brouillon")),
    el("p", { class: "doux petit note" }, "Envoyer : un staff la valide, puis elle compte dans les comptes de chacun. Une dépense envoyée ne se modifie plus."),
  ];
}

export function oublierSaisie(id) {
  delete formulaires[id || "nouvelle"];
}

/* --- Détail (lecture) ---------------------------------------------------------------------------------------- */

function lignesParts(parts) {
  return el("div", { class: "liste-groupee" }, Object.entries(parts).sort((a, b) => b[1] - a[1]).map(([nom, m]) => el("div", { class: "ligne" },
    avatar(nom, 28), el("span", { class: "ligne-texte" }, nom), el("span", { class: "ligne-valeur" }, euros(m)))));
}

const PHRASES = { envoyee: "envoyée", validee: "validée", refusee: "refusée" };

export function detailDepense(d, actions = null) {
  return [
    el("section", { class: "carte entete-depense" },
      el("div", { class: "rangee" }, qui(d.auteur, true), el("strong", {}, d.auteur), el("span", { class: "doux" }, `· ${dateCourte(d.date)}`)),
      el("p", { class: "montant-grand" }, euros(d.montant)),
      el("span", { class: "etat-depense " + d.etat }, ETATS[d.etat] + (d.remboursement ? ` · ${REMBOURSEMENT[d.remboursement]}` : ""))),
    d.ticket && el("button", { type: "button", class: "ticket-grand", onclick: () => ouvrirVisionneuse([d.ticket], 0) },
      el("img", { src: urlApercu(d.ticket), alt: "Photo du ticket" })),
    el("h2", {}, MODES[d.mode]),
    d.mode === "egales" && el("div", { class: "carte" }, el("p", {}, d.concernes.join(", "))),
    d.mode !== "egales" && el("div", { class: "liste-groupee" }, d.lignes.map(l => el("div", { class: "ligne" },
      el("span", { class: "ligne-texte" }, l.nom_categorie || l.nom), el("span", { class: "ligne-valeur" }, euros(l.montant))))),
    d.etat === "validee" && [el("h2", {}, "Les parts, figées à la validation"), lignesParts(d.parts)],
    d.apercu && [el("h2", {}, "Les parts si on validait maintenant"), lignesParts(d.apercu)],
    d.apercu_erreur && el("p", { class: "alerte-ligne" }, icone("info"), `Impossible à valider : ${d.apercu_erreur}.`),
    actions,
    d.historique.length > 0 && [el("h2", {}, "Historique"), el("div", { class: "liste-groupee" }, d.historique.map(h => el("div", { class: "ligne" },
      el("span", { class: "ligne-texte" }, `${PHRASES[h.action] || h.action} par ${h.par}`, h.detail && el("span", { class: "doux petit" }, h.detail)),
      el("span", { class: "ligne-valeur petit" }, ilYa(h.quand)))))],
  ];
}

export function vueDepense(id) {
  const d = trouverDepense(id);
  if (!d) return el("p", { class: "doux" }, "Cette dépense n'existe pas, ou tu ne peux pas la voir.");
  if (d.auteur === app.moi && d.etat === "brouillon") return vueSaisie(d);
  return detailDepense(d);
}

export const titreDepense = id => trouverDepense(id)?.motif || "Dépense";

export function resumeDepenses() {
  const miennes = app.etat.depenses.filter(d => d.auteur === app.moi);
  const attente = miennes.filter(d => d.etat === "attente").length;
  const refusees = miennes.filter(d => d.etat === "brouillon" && d.refus).length;
  return refusees ? `${refusees} refusée${refusees > 1 ? "s" : ""}, à corriger` : attente ? `${attente} en attente` : miennes.length ? `${miennes.length} saisie${miennes.length > 1 ? "s" : ""}` : "Ce que j'ai payé pour le groupe";
}

export const nouvelleDepense = () => { oublierSaisie(""); location.hash = "#depenses/nouvelle"; };
