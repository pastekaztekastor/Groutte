import { app, el, avatar } from "./commun.js";

/* Mentions « @Nom » dans les textes. La personne citée reçoit une notification (serveur :
   notifications.mentionnes). Ici : suggestions en tapant « @ », et mise en valeur des mentions dans les textes. */

const sansAccent = t => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const echapper = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Le texte, avec chaque « @Nom » d'un compte en couleur (et surligné quand c'est moi). */
export function texteMentions(texte) {
  const noms = app.etat.comptes.map(j => j.nom).sort((a, b) => b.length - a.length);
  if (!texte || !noms.length) return texte;
  const motif = new RegExp(`(^|[^\\p{L}\\p{N}_@])@(${noms.map(echapper).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  const morceaux = [];
  let fin = 0;
  for (const m of texte.matchAll(motif)) {
    const debut = m.index + m[1].length;
    const nom = noms.find(n => n.toLowerCase() === m[2].toLowerCase());
    morceaux.push(texte.slice(fin, debut),
      el("span", { class: "mention" + (nom === app.moi ? " moi" : "") }, "@" + nom));
    fin = debut + 1 + m[2].length;
  }
  morceaux.push(texte.slice(fin));
  return morceaux;
}

/* Suggestions sous un champ : dès qu'on tape « @ » suivi du début d'un nom, les comptes correspondants en photo ;
   en toucher un remplace « @déb » par « @Nom ». Renvoie l'élément à placer à côté du champ. */
export function suggestionsMentions(champ) {
  const boite = el("div", { class: "suggestions-mention", hidden: true, role: "listbox", "aria-label": "Mentionner" });

  function enCours() {
    const avant = champ.value.slice(0, champ.selectionStart ?? champ.value.length);
    const m = avant.match(/(^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_-]*)$/u);
    return m ? { debut: avant.length - m[2].length - 1, prefixe: m[2] } : null;
  }

  function maj() {
    const e = enCours();
    const trouves = e ? app.etat.comptes.filter(j => j.nom !== app.moi && sansAccent(j.nom).startsWith(sansAccent(e.prefixe))) : [];
    boite.hidden = !trouves.length;
    boite.replaceChildren(...trouves.map(j => el("button", {
      type: "button", class: "suggestion", role: "option",
      onpointerdown: ev => ev.preventDefault(),   // le champ garde le focus (et le clavier reste ouvert)
      onclick: () => {
        const actuel = enCours();
        if (!actuel) return;
        const fin = champ.selectionStart ?? champ.value.length;
        champ.value = champ.value.slice(0, actuel.debut) + "@" + j.nom + " " + champ.value.slice(fin);
        const curseur = actuel.debut + j.nom.length + 2;
        champ.setSelectionRange(curseur, curseur);
        champ.dispatchEvent(new Event("input", { bubbles: true }));   // brouillon et hauteur du champ à jour
        champ.focus();
      },
    }, avatar(j.nom, 24), j.nom)));
  }

  champ.addEventListener("input", maj);
  champ.addEventListener("click", maj);
  champ.addEventListener("keyup", ev => { if (ev.key.startsWith("Arrow")) maj(); });
  champ.addEventListener("blur", () => setTimeout(() => { boite.hidden = true; }, 150));
  return boite;
}
