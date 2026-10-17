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

/* Les repas pris sur la réserve, calculés par le serveur (compta.py) : les repas gérés de la présence, cochés
   (mon choix, sinon le défaut du créneau). */
export const repasPris = nom => presenceDe(nom)?.repas || [];

/* Un repas géré par la communauté (Réglages compta) : il se coche dans Mes repas, et le Menu peut le viser. */
export const estGere = (jour, creneau) => app.etat.sejour.repas_geres.includes(jour + "/" + creneau);

/* Ceux qui mangent sur la réserve à un repas (Mes repas). */
export const mangeurs = (jour, creneau) => venants().filter(n => repasPris(n).some(([x, y]) => x === jour && y === creneau));

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
