import { app, el, icone, avatar, compte, sansAccent, envoyer, afficher, notifier, ouvrirFeuille, ilYa, jourCourt, pluriel, lienContact } from "./commun.js";
import { lireEuros } from "./paiement.js";
import { CRENEAUX, LIBELLES, presentsA } from "./sejour.js";

/* #annonces : Staff > Annonces. Des filtres (calculés par le serveur, annonces.py, sauf trois calculés ici : présents à
   un créneau, un rôle, doit plus de X €), combinés en « au moins un » ou « tous » ; puis des personnes ajoutées ou
   retirées à la main. Ceux qui n'ont pas les notifications sont signalés : ils verront l'annonce à leur prochaine
   ouverture de l'appli (Pings reçus), mais mieux vaut les prévenir aussi autrement. */

const FILTRES = [
  ["Groupe", [["tous", "Tout le monde"], ["viennent", "Qui vient"], ["presents", "Présents"], ["staff", "Staff"], ["role", "Rôle"],
    ["tardifs", "Inscriptions tardives"]]],
  ["Argent", [["gite", "Pas payé le gîte"], ["salle", "Pas payé la salle"], ["doit", "Doit plus de"], ["sans_moyen", "Pas de moyen de paiement"]]],
  ["À compléter", [["presence", "Présence non renseignée"], ["lit", "Pas de lit, alors qu'il en restait"], ["literie", "Literie non renseignée"],
    ["fiche", "Fiche incomplète"], ["alcool", "Alcool non coché (pour le SAM)"]]],
];
export const PAGES = [["#pings", "Pings reçus"], ["#presence", "Présence"], ["#lits", "Lits"], ["#repas", "Mes repas"], ["#menu", "Menu"],
  ["#comptes", "Mes comptes"], ["#creances", "Créances gîte et salle"], ["#depenses", "Dépenses"], ["#faq", "Comment ça marche"],
  ["#fiche", "Ma fiche"], ["#rembourser", "Me rembourser"], ["#notifications", "Notifications"], ["#forum", "Forum"],
  ["#contact", "Contacter le staff"], ["#carnet", "Carnet d'adresses"]];
const PAGE_DU_FILTRE = { gite: "#creances", salle: "#creances", doit: "#comptes", sans_moyen: "#rembourser", presence: "#presence",
  tardifs: "#presence", lit: "#lits", literie: "#fiche", fiche: "#fiche", alcool: "#fiche" };
const TEXTE_MAX = 120;

/* « dans 12 min » d'après un horodatage à venir. */
export const dans = horodatage => `dans ${Math.max(1, Math.round((new Date(horodatage) - Date.now()) / 60000))} min`;

const choix = {
  coches: new Set(), combinaison: "ou", ajoutes: new Set(), retires: new Set(),
  presents: null, role: "", seuil: "20", titre: "", texte: "", lien: "", lienChoisi: false,
};

/* {id: [noms] ou null (grisé)} : ceux du serveur, et les trois calculés ici. */
function listes() {
  const a = app.etat.annonces;
  const actifs = new Set(a.filtres.tous);
  choix.presents ??= { date: app.etat.sejour.jours[0], creneau: "soir" };
  const seuil = lireEuros(choix.seuil) ?? 0;
  return {
    ...a.filtres,
    presents: presentsA(choix.presents.date, choix.presents.creneau).presents.filter(n => actifs.has(n)),
    role: choix.role ? app.etat.comptes.filter(c => actifs.has(c.nom) && c.roles.includes(choix.role)).map(c => c.nom) : [],
    doit: Object.entries(a.soldes).filter(([, s]) => -s > seuil).map(([n]) => n),
  };
}

function destinataires(l) {
  const choisis = [...choix.coches].filter(id => l[id]);
  let base = [];
  if (choisis.length) {
    const ensembles = choisis.map(id => new Set(l[id]));
    base = choix.combinaison === "et"
      ? [...ensembles[0]].filter(n => ensembles.every(e => e.has(n)))
      : [...new Set(ensembles.flatMap(e => [...e]))];
  }
  const tous = new Set([...base, ...choix.ajoutes]);
  for (const n of choix.retires) tous.delete(n);
  return [...tous].filter(n => compte(n) && !compte(n).desactive).sort((x, y) => x.localeCompare(y, "fr"));
}

function cocher(id, actif) {
  actif ? choix.coches.add(id) : choix.coches.delete(id);
  if (!choix.lienChoisi) choix.lien = PAGE_DU_FILTRE[[...choix.coches].find(x => PAGE_DU_FILTRE[x])] || "#pings";
  afficher();
}

/* Le réglage à côté de certains filtres : le créneau, le rôle, le montant. */
function reglageFiltre(id) {
  if (id === "presents") {
    const jour = el("select", { "aria-label": "Jour" }, app.etat.sejour.jours.map(j => el("option", { value: j, selected: j === choix.presents.date }, jourCourt(j))));
    const creneau = el("select", { "aria-label": "Créneau" }, CRENEAUX.map(c => el("option", { value: c, selected: c === choix.presents.creneau }, LIBELLES[c])));
    jour.onchange = creneau.onchange = () => { choix.presents = { date: jour.value, creneau: creneau.value }; afficher(); };
    return [jour, creneau];
  }
  if (id === "role") {
    const r = el("select", { "aria-label": "Rôle" }, el("option", { value: "" }, "choisir..."),
      app.etat.roles.map(x => el("option", { value: x.id, selected: x.id === choix.role }, x.nom)));
    r.onchange = () => { choix.role = r.value; afficher(); };
    return r;
  }
  if (id === "doit") {
    const m = el("input", { inputmode: "decimal", value: choix.seuil, class: "champ-montant court", "aria-label": "Montant en euros" });
    m.onchange = () => { choix.seuil = m.value; afficher(); };
    return [m, el("span", { class: "doux" }, "€")];
  }
  return null;
}

function filtres(l) {
  return FILTRES.map(([titre, ids]) => [el("h3", { class: "sous-titre" }, titre), el("div", { class: "liste-groupee" }, ids.map(([id, libelle]) => {
    const grise = l[id] === null || l[id] === undefined;
    const coche = el("input", { type: "checkbox", checked: choix.coches.has(id), disabled: grise, "aria-label": libelle });
    coche.onchange = () => cocher(id, coche.checked);
    return el("div", { class: "ligne ligne-filtre" + (grise ? " grise" : "") },
      el("label", { class: "ligne-texte" }, libelle,
        el("span", { class: "doux petit" }, grise ? "Les paiements ne sont pas encore ouverts" : pluriel(l[id].length, "personne"))),
      coche, reglageFiltre(id) && el("span", { class: "reglage-filtre" }, reglageFiltre(id)));
  }))]);
}

/* Les pastilles des destinataires, et « @ » pour en ajouter. */
function pastilles(noms) {
  const entree = el("input", { type: "search", placeholder: "@ puis un nom", "aria-label": "Ajouter quelqu'un", autocomplete: "off" });
  const suggestions = el("div", { class: "suggestions-staff", role: "listbox" });
  entree.addEventListener("input", () => {
    const texte = sansAccent(entree.value.replace(/^@/, "").trim());
    const trouves = texte ? app.etat.comptes.filter(c => !c.desactive && !noms.includes(c.nom) && sansAccent(c.nom).includes(texte)).slice(0, 6) : [];
    suggestions.replaceChildren(...trouves.map(c => el("button", {
      type: "button", class: "ligne entree", role: "option",
      onclick: () => { choix.ajoutes.add(c.nom); choix.retires.delete(c.nom); afficher(); },
    }, avatar(c.nom, 28), el("span", { class: "ligne-texte" }, c.nom))));
  });
  return el("div", { class: "carte choix-membres" },
    el("div", { class: "pastilles" }, noms.map(nom => el("button", {
      type: "button", class: "puce actif", "aria-label": `Retirer ${nom}`,
      onclick: () => { choix.retires.add(nom); choix.ajoutes.delete(nom); afficher(); },
    }, avatar(nom, 20), nom, !compte(nom).notifs && icone("cloche-barree"), " ×")), entree),
    suggestions);
}

/* Ceux qui n'ont pas les notifications : un lien vers leur contact, pour les prévenir autrement. */
function sansNotifs(noms, titre) {
  if (!noms.length) return null;
  return el("div", { class: "alerte-ligne colonne" },
    el("span", {}, icone("cloche-barree"), " ", titre),
    el("span", { class: "liens-faq" }, noms.map(n => el("a", { href: lienContact(n) }, n))));
}

function message(noms) {
  const a = app.etat.annonces;
  const titre = el("input", { value: choix.titre, maxlength: 50, placeholder: "Gîte : dernier rappel", "aria-label": "Titre" });
  titre.addEventListener("input", () => { choix.titre = titre.value; });
  const compteur = el("span", { class: "doux petit compteur-texte" }, `${choix.texte.length}/${TEXTE_MAX}`);
  const texte = el("textarea", { maxlength: TEXTE_MAX, rows: 3, placeholder: "Il te reste 3 jours pour payer ta part du gîte !", "aria-label": "Texte" });
  texte.value = choix.texte;
  texte.addEventListener("input", () => { choix.texte = texte.value; compteur.textContent = `${texte.value.length}/${TEXTE_MAX}`; });
  const lien = el("select", { "aria-label": "Page qui s'ouvre" }, PAGES.map(([v, l]) => el("option", { value: v, selected: v === (choix.lien || "#pings") }, l)));
  lien.onchange = () => { choix.lien = lien.value; choix.lienChoisi = true; };
  const silencieux = noms.filter(n => !compte(n).notifs);
  const envoi = async () => {
    if (!noms.length) return notifier("Il n'y a aucun destinataire.");
    if (!choix.titre.trim() || !choix.texte.trim()) return notifier("Écris un titre et un texte.");
    const question = `Envoyer à ${pluriel(noms.length, "personne")} ?` + (silencieux.length ? ` ${silencieux.length} n'${silencieux.length > 1 ? "ont" : "a"} pas les notifications : ${silencieux.join(", ")}. Ils la verront à leur prochaine ouverture de l'appli.` : "");
    if (!confirm(question)) return;
    if (await envoyer("annonces/envoyer", { titre: choix.titre, texte: choix.texte, lien: choix.lien || "#pings", destinataires: noms,
      filtres: [...choix.coches], combinaison: choix.combinaison })) {
      Object.assign(choix, { coches: new Set(), ajoutes: new Set(), retires: new Set(), titre: "", texte: "", lien: "", lienChoisi: false });
      notifier("Annonce envoyée.", true);
      afficher();
    }
  };
  return [
    el("div", { class: "carte" },
      el("label", { class: "champ" }, "Titre (« Groutte - » est ajouté devant)", titre),
      el("label", { class: "champ" }, el("span", { class: "rangee" }, "Texte", compteur), texte),
      el("label", { class: "champ" }, "La page qui s'ouvre", lien)),
    a.prochaine && el("p", { class: "alerte-ligne" }, icone("info"), `Une annonce par heure : la prochaine ${dans(a.prochaine)}.`),
    el("div", { class: "actions" }, el("button", { class: "btn principal large", type: "button", disabled: Boolean(a.prochaine), onclick: envoi }, "Envoyer")),
  ];
}

function detailAnnonce(x) {
  ouvrirFeuille(x.titre, [
    el("p", {}, x.texte),
    el("p", { class: "doux petit" }, `Par ${x.par}, ${ilYa(x.quand)} · ouvre ${PAGES.find(([v]) => v === x.lien)?.[1] || x.lien}`),
    el("h3", {}, pluriel(x.destinataires.length, "destinataire")),
    el("p", { class: "petit" }, x.destinataires.join(", ")),
  ]);
}

export function vueAnnonces() {
  const a = app.etat.annonces;
  const l = listes();
  const noms = destinataires(l);
  const silencieux = noms.filter(n => !compte(n).notifs);
  return [
    el("h2", {}, "Filtres"),
    filtres(l),
    el("div", { class: "segments large", role: "radiogroup", "aria-label": "Combinaison des filtres" },
      [["ou", "Au moins un filtre"], ["et", "Tous les filtres"]].map(([v, libelle]) => el("button", {
        type: "button", class: choix.combinaison === v ? "choisi" : "", role: "radio", "aria-checked": String(choix.combinaison === v),
        onclick: () => { choix.combinaison = v; afficher(); },
      }, libelle))),
    el("h2", {}, `Destinataires (${noms.length})`),
    pastilles(noms),
    sansNotifs(silencieux, `${silencieux.join(", ")} n'${silencieux.length > 1 ? "ont" : "a"} pas les notifications : ils la verront à leur prochaine ouverture de l'appli. Préviens-les aussi autrement :`),
    el("h2", {}, "Message"),
    message(noms),
    el("h2", {}, "Notifications désactivées"),
    a.sans_notifs.length
      ? [el("p", { class: "doux petit note" }, "Ils ne reçoivent aucune notification : on ne peut pas les joindre par l'appli, seulement à leur ouverture."),
        el("div", { class: "liste-groupee" }, a.sans_notifs.map(n => el("a", { class: "ligne", href: lienContact(n) }, avatar(n, 28),
          el("span", { class: "ligne-texte" }, n), icone("chevron-droite"))))]
      : el("p", { class: "doux note" }, "Tout le monde a activé les notifications."),
    el("h2", {}, "Annonces envoyées"),
    a.envoyees.length
      ? el("div", { class: "liste-groupee liste-elements" }, a.envoyees.map(x => el("button", { type: "button", class: "ligne entree", onclick: () => detailAnnonce(x) },
        el("span", { class: "ligne-texte" }, el("strong", {}, x.titre), el("span", { class: "doux petit" }, `${x.par} · ${ilYa(x.quand)}`)),
        el("span", { class: "ligne-valeur" }, `${x.destinataires.length} dest.`), icone("chevron-droite"))))
      : el("p", { class: "doux note" }, "Aucune pour l'instant."),
  ];
}

export function resumeAnnonces() {
  const n = app.etat.annonces.sans_notifs?.length || 0;
  return n ? `${pluriel(n, "personne")} sans notifications` : "Prévenir des ploucs choisis";
}
