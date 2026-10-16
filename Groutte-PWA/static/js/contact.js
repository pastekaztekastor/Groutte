import { app, el, icone, avatar, lienContact } from "./commun.js";

/* #contact : Communauté > Contacter le staff. Une page provisoire, en attendant les messages privés (jalon 4) :
   le Discord de gestion, puis les hébergeurs et le staff, chacun avec Appeler et SMS. Tous les boutons qui devaient
   ouvrir un message privé (Demander à l'hébergeur, Demander un arrangement...) mènent ici. */

const numero = valeur => (valeur || "").replace(/[^\d+]/g, "");

function personne(c, detail) {
  const tel = numero(c.telephone);
  const bouton = (nomIcone, libelle, lien) => el(lien ? "a" : "span", {
    class: "btn petit-bouton" + (lien ? "" : " inactif"), href: lien || null, "aria-disabled": lien ? null : "true",
    "aria-label": `${libelle} ${c.nom}`,
  }, icone(nomIcone), libelle);
  return el("div", { class: "ligne ligne-perso" },
    el("a", { class: "qui-lien", href: lienContact(c.nom) }, avatar(c.nom, 40),
      el("span", { class: "ligne-texte" }, el("strong", {}, c.nom), detail && el("span", { class: "doux petit" }, detail))),
    el("span", { class: "boutons-contact" },
      bouton("fa-appeler", "Appeler", tel && "tel:" + tel),
      bouton("fa-sms", "SMS", tel && "sms:" + tel)));
}

export function vueContact() {
  const actifs = app.etat.comptes.filter(c => !c.desactive);
  const gite = app.etat.gite;
  const lieux = nom => [gite.gite.hebergeur === nom && "Gîte", gite.salle.hebergeur === nom && "Salle"].filter(Boolean).join(" et ");
  const hebergeurs = actifs.filter(c => lieux(c.nom));
  const staff = actifs.filter(c => c.staff && !lieux(c.nom));
  return [
    el("section", { class: "carte" },
      el("p", {}, "En attendant les messages privés dans l'appli, passe par Discord ou appelle."),
      app.etat.discord_gestion && el("a", { class: "btn principal large", href: app.etat.discord_gestion, target: "_blank", rel: "noopener" },
        icone("fa-discord"), "Ouvrir le Discord")),
    hebergeurs.length > 0 && [el("h2", {}, "Hébergeurs"), el("div", { class: "liste-groupee" }, hebergeurs.map(c => personne(c, lieux(c.nom))))],
    staff.length > 0 && [el("h2", {}, "Staff"), el("div", { class: "liste-groupee" }, staff.map(c => personne(c, "")))],
  ];
}
