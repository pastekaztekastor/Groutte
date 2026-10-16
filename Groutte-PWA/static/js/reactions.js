import { app, el, icone, afficher } from "./commun.js";

/* Réactions sous les posts et les commentaires du forum, reprises de NextSession.
   Volontairement en texte, pas en emoji. La liste vient de reactions.json (via l'état). */

let choixOuvert = null;   // clé de l'élément dont la liste des réactions est dépliée

export function choixDeplie(cle) {
  return choixOuvert === cle;
}

/* `cible` porte .reactions ({"XD": [noms...]}). `envoi(reaction)` enregistre côté serveur
   et renvoie false en cas d'échec ; `recharger()` relit alors les données du serveur. */
export function barreReactions(cle, cible, envoi, recharger) {
  const reactions = cible.reactions || {};

  async function basculerReaction(reaction) {
    choixOuvert = null;
    // Affichage immédiat, le serveur confirme ensuite.
    const noms = [...(reactions[reaction] || [])];
    const i = noms.indexOf(app.moi);
    i >= 0 ? noms.splice(i, 1) : noms.push(app.moi);
    if (noms.length) reactions[reaction] = noms;
    else delete reactions[reaction];
    cible.reactions = reactions;
    afficher();
    if (!await envoi(reaction)) { await recharger(); afficher(); }
  }

  // Fermé : seulement les réactions déjà données, et « + ». Ouvert : les cinq, avec leur compteur.
  const ouvert = choixOuvert === cle;
  const boutons = app.etat.reactions.filter(r => ouvert || reactions[r]?.length).map(r => {
    const noms = reactions[r] || [];
    return el("button", {
      type: "button", class: "reaction" + (noms.includes(app.moi) ? " moi" : ""),
      title: noms.join(", ") || null, "aria-label": noms.length ? `${r} : ${noms.join(", ")}` : `Réagir ${r}`,
      onclick: () => basculerReaction(r),
    }, el("span", { class: "visage" }, r), noms.length > 0 && el("span", { class: "nombre" }, String(noms.length)));
  });
  // Ajouter une réaction : l'icône « visage souriant » (Font Awesome), une croix quand la liste est dépliée.
  const bascule = el("button", {
    type: "button", class: "reaction ajout-reaction", "aria-label": ouvert ? "Fermer" : "Ajouter une réaction",
    title: ouvert ? "Fermer" : "Réagir",
    onclick: () => { choixOuvert = ouvert ? null : cle; afficher(); },
  }, icone(ouvert ? "fermer" : "fa-reagir"));

  // « vide » : personne n'a réagi et rien n'est déplié, il ne reste que « + » (affiché plus discrètement).
  return el("div", { class: "reactions" + (boutons.length ? "" : " vide") }, boutons, bascule);
}
