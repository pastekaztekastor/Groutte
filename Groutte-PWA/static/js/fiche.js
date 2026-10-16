import { app, el, icone, avatar, compte, saisie, oublier, envoyer, televerser, reduireImage, notifier, afficher } from "./commun.js";

/* #fiche : Ma fiche. Une liste groupée, comme les Réglages de l'iPhone. Chaque champ s'enregistre dès qu'on le
   quitte (pas de bouton « Enregistrer »). Le nom ne se change pas ici : c'est le staff qui le corrige.
   Le thème et le mode sont dans Réglages. */

const ICONES = { prenom: "fa-fiche", pseudo: "fa-fiche", discord: "fa-discord", telephone: "fa-appeler", allergies: "fa-regime" };

/* Un champ texte : enregistré quand on le quitte, s'il a changé. */
function champ(m, cle, libelle, props = {}) {
  const entree = saisie("fiche." + cle, { valeur: m[cle] || "", placeholder: libelle, "aria-label": libelle, ...props });
  entree.addEventListener("change", async () => {
    if (await envoyer("profil", { [cle]: entree.value }, { siLibre: true })) oublier("fiche." + cle);
  });
  return el("label", { class: "ligne ligne-contact" },
    el("span", { class: "icone-contact" }, icone(ICONES[cle] || "fa-info")),
    el("span", { class: "ligne-texte" }, el("span", { class: "libelle-contact" }, libelle), entree));
}

function interrupteur(libelle, actif, changer, detail) {
  const coche = el("input", { type: "checkbox", role: "switch", checked: actif });
  coche.onchange = () => changer(coche.checked);
  return el("label", { class: "ligne" }, el("span", { class: "ligne-texte" }, libelle, detail && el("span", { class: "doux petit" }, detail)), coche);
}

/* Un sélecteur de photo : réduite dans le navigateur (512 px) puis envoyée ; elle remplace l'ancienne. */
function choixPhoto() {
  const entree = el("input", { type: "file", accept: "image/*", class: "cache" });
  entree.onchange = async () => {
    const fichier = entree.files[0];
    entree.value = "";
    if (!fichier) return;
    notifier("Envoi de la photo...", true);
    if (await televerser({ type: "avatar" }, await reduireImage(fichier, 512))) { afficher(); notifier("Photo enregistrée.", true); }
  };
  return entree;
}

/* La photo, qu'on touche pour la changer, et le nom en lecture seule. */
function tete(m) {
  return el("section", { class: "contact-tete" },
    el("label", { class: "photo-modifiable", title: "Changer la photo" }, avatar(m.nom, 112), choixPhoto()),
    el("h1", {}, m.nom),
    el("div", { class: "rangee" },
      el("label", { class: "discret" }, m.avatar ? "Changer la photo" : "Ajouter une photo", choixPhoto()),
      m.avatar && el("button", { class: "discret danger", type: "button", onclick: () => { if (confirm("Retirer ta photo ?")) envoyer("avatar/supprimer"); } }, "Retirer")),
    el("p", { class: "doux petit" }, "Ton nom ne se change pas ici : demande au staff s'il y a une faute."));
}

/* Les catégories de dépenses (Réglages compta) : obligatoires sans case, facultatives avec un interrupteur.
   Une catégorie supprimée que j'avais cochée reste affichée, pour que je voie pourquoi j'ai payé. */
function partage(m) {
  const { categories, supprimees } = app.etat.categories;
  const cochees = m.categories || [];
  const changer = (id, actif) => envoyer("profil", {
    categories: actif ? [...cochees, id] : cochees.filter(x => x !== id),
  });
  return el("div", { class: "liste-groupee" },
    categories.filter(c => c.type !== "speciale").map(c => c.type === "obligatoire"
      ? el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, c.nom), el("span", { class: "ligne-valeur" }, "Tu participes d'office"))
      : [interrupteur(c.nom, cochees.includes(c.id), actif => changer(c.id, actif)),
        c.sam && !cochees.includes(c.id) && el("div", { class: "ligne encart-sam" }, el("span", { class: "ligne-texte petit" },
          "Tu ne bois pas ? Propose-toi SAM pour un soir, et merci d'avance : grâce à toi, tout le monde rentre en sécurité."))]),
    supprimees.filter(c => c.type === "facultative" && cochees.includes(c.id)).map(c => el("div", { class: "ligne" },
      el("span", { class: "ligne-texte" }, c.nom, el("span", { class: "doux petit" }, "Catégorie supprimée : tu y participais")))));
}

export function vueFiche() {
  const m = compte(app.moi);
  const regimes = app.etat.regimes;
  const rolesLibres = app.etat.roles.filter(r => r.type === "libre");
  const autresRoles = app.etat.roles.filter(r => r.type !== "libre" && m.roles.includes(r.id));
  const incomplete = !m.prenom || !m.telephone;

  return [
    tete(m),
    incomplete && el("section", { class: "carte bandeau" },
      el("p", {}, "Complète ta fiche : ton prénom et ton téléphone aident les autres à te joindre.")),

    el("h2", {}, "Identité"),
    el("div", { class: "liste-groupee" },
      champ(m, "prenom", "Prénom", { maxlength: 40, autocomplete: "given-name" }),
      champ(m, "pseudo", "Pseudo", { maxlength: 40, autocomplete: "nickname" })),

    el("h2", {}, "Contact"),
    el("div", { class: "liste-groupee" },
      champ(m, "discord", "Discord", { maxlength: 40, autocomplete: "off", spellcheck: "false" }),
      champ(m, "telephone", "Téléphone", { maxlength: 20, type: "tel", autocomplete: "tel" })),

    el("h2", {}, "Ce que je partage"),
    partage(m),
    el("p", { class: "doux petit note" }, "Une coche ne vaut que pour les dépenses validées ensuite. ", el("a", { href: "#faq/categories" }, "Comment ça marche ?")),

    el("h2", {}, "Alimentation"),
    el("div", { class: "liste-groupee" },
      regimes.map(r => interrupteur(r, m.regimes.includes(r), actif => {
        const choisis = actif ? [...m.regimes, r] : m.regimes.filter(x => x !== r);
        envoyer("profil", { regimes: choisis });
      })),
      champ(m, "allergies", "Allergies", { maxlength: 300 })),

    el("h2", {}, "Photos et vidéos"),
    el("div", { class: "liste-groupee" },
      interrupteur("D'accord pour apparaître sur les photos et vidéos", m.photo_ok !== false,
        actif => envoyer("profil", { photo_ok: actif }), "Une simple information pour les autres : rien n'est bloqué.")),

    el("h2", {}, "Mes rôles"),
    el("div", { class: "liste-groupee" },
      rolesLibres.map(r => interrupteur(r.nom, m.roles.includes(r.id), actif => envoyer("roles/miens", { role: r.id, actif }))),
      autresRoles.map(r => el("div", { class: "ligne" }, el("span", { class: "ligne-texte" }, r.nom),
        el("span", { class: "ligne-valeur" }, r.type === "staff" ? "attribué par le staff" : "automatique")))),
    el("p", { class: "doux petit note" }, "Tes rôles s'affichent dans le carnet d'adresses. Ils ne donnent aucun droit sur l'appli."),
    el("p", { class: "doux petit note" }, el("a", { href: "#reglages" }, "Thème, mode sombre et code"), " : dans Réglages."),
  ];
}

export function resumeFiche() {
  const m = compte(app.moi);
  return !m.prenom || !m.telephone ? "À compléter" : [m.prenom, m.pseudo && `« ${m.pseudo} »`].filter(Boolean).join(" ");
}
