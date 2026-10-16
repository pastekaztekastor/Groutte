import { app } from "./commun.js";

/* Le modèle de présence, côté page (le même que sejour.py) : créneaux, nuits et repas de chacun.
   L'état donne les dates du séjour (app.etat.sejour) et l'arrivée et le départ de chacun (app.etat.presences). */

export const CRENEAUX = ["matin", "midi", "soir", "nuit"];
export const REPAS = ["matin", "midi", "soir"];
export const LIBELLES = { matin: "Matin", midi: "Midi", soir: "Soir", nuit: "Nuit" };
export const COMPTE = { matin: "petit-déjeuner", midi: "déjeuner", soir: "dîner", nuit: "nuitée" };

const rang = (jour, creneau) => `${jour}/${CRENEAUX.indexOf(creneau)}`;

/* Tous les créneaux du séjour, dans l'ordre : [[date, créneau]]. Le dernier jour n'a pas de nuit. */
export function creneauxSejour() {
  const jours = app.etat.sejour.jours;
  return jours.flatMap(j => CRENEAUX.filter(c => !(j === jours[jours.length - 1] && c === "nuit")).map(c => [j, c]));
}

/* Les créneaux comptés d'une présence ({arrivee, depart}), bornés au séjour. */
export function creneauxDe(presence) {
  if (!presence) return [];
  const debut = rang(presence.arrivee.date, presence.arrivee.creneau);
  const fin = rang(presence.depart.date, presence.depart.creneau);
  return creneauxSejour().filter(([j, c]) => rang(j, c) >= debut && rang(j, c) <= fin);
}

export const presenceDe = nom => app.etat.presences[nom] || null;
export const nuitsDe = nom => creneauxDe(presenceDe(nom)).filter(([, c]) => c === "nuit").map(([j]) => j);
export const repasPossibles = nom => creneauxDe(presenceDe(nom)).filter(([, c]) => c !== "nuit");

/* Les repas pris sur la réserve : ceux de la présence, moins ceux décochés. */
export function repasPris(nom) {
  const decoches = new Set((presenceDe(nom)?.decoches || []).map(([j, c]) => j + "/" + c));
  return repasPossibles(nom).filter(([j, c]) => !decoches.has(j + "/" + c));
}

/* Ceux qui viennent : un compte actif avec au moins un créneau dans le séjour. */
export const venants = () => Object.keys(app.etat.presences).filter(n => creneauxDe(presenceDe(n)).length > 0);

/* Qui est là à un créneau donné, avec ceux qui arrivent et ceux qui repartent. */
export function presentsA(jour, creneau) {
  const cle = rang(jour, creneau);
  const presents = [], arrivent = [], partent = [];
  for (const nom of venants()) {
    const p = presenceDe(nom);
    const debut = rang(p.arrivee.date, p.arrivee.creneau), fin = rang(p.depart.date, p.depart.creneau);
    if (cle < debut || cle > fin) continue;
    presents.push(nom);
    if (cle === debut) arrivent.push(nom);
    if (cle === fin) partent.push(nom);
  }
  return { presents, arrivent, partent };
}

/* Un repas a commencé (son heure est passée) : il est figé. */
export function commence(jour, creneau) {
  const heure = app.etat.sejour.heures_repas[creneau] || "00:00";
  return new Date(`${jour}T${heure}`) <= new Date();
}
