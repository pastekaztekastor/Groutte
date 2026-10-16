<!-- nav -->
[Précédent : Forum](../communaute/forum.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Gîte > Présence

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Dire quand j'arrive et quand je pars, et voir qui est là à chaque créneau de la semaine.
- Mes dates donnent mes nuits et les repas où je peux manger, qui servent ensuite partout : le prix du gîte ([Créances](../budget/creances.md)), les couchages ([Lits](lits.md), [Literie](literie.md)), et mes repas ([Mes repas](../repas/mes-repas.md)).
- Cette page remplace l'ancienne « Ma réservation » : saisir ses dates et voir le groupe se font au même endroit.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** saisit et modifie ses propres dates, et voit l'emploi du temps de tout le groupe. Les membres du staff font de même, en tant que ploucs.
- **Personne ne saisit les dates d'un autre**, pas même le staff. Celui qui n'utilise pas l'appli ne participe pas : l'appli est au centre de l'organisation, et l'entrée y est volontairement la plus simple possible.
- **Une inscription tardive pas encore acceptée** voit tout l'emploi du temps, mais ne peut pas saisir ses dates (voir [Inscription](../compte/inscription.md)).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Mes dates** :
   - l'arrivée et le départ, chacun sous la forme date + créneau, avec le texte d'aide ;
   - le résultat : mes nuits, mes repas, et ma part estimée du gîte ;
   - un bouton **« Je ne viens pas »**.
   - Pour une inscription tardive pas encore acceptée, ce bloc est remplacé par le bouton **« Demander à l'hébergeur »**.
2. **L'emploi du temps du groupe** : une ligne par jour, une colonne par créneau. Chaque case donne le nombre de présents, et la liste des noms quand on la touche, avec ceux qui arrivent et ceux qui repartent à ce créneau.
3. **Les nuits** : le nombre de personnes nuit par nuit, avec une alerte sur celles qui dépassent la capacité du gîte.
4. Un lien « Comment ça marche ? » vers la [FAQ du budget](../budget/comment-ca-marche.md), à la question sur les deux temps du prix.

```
┌───────────────────────────────────────────┐
│ Mes dates                                 │
│ Arrivée  [28/12 ▾] [Soir  ▾]              │
│ Départ   [31/12 ▾] [Matin ▾]              │
│ ⓘ L'arrivée est ton premier créneau sur   │
│   place, le départ ton dernier.           │
│ 3 nuits · 7 repas                         │
│ Gîte : environ 84 € (28 € la nuit)        │
│ ⓘ Estimation : baisse si d'autres         │
│   s'inscrivent.                           │
│                         [Je ne viens pas] │
├───────────────────────────────────────────┤
│ Le groupe      Matin  Midi  Soir  Nuit    │
│ 28/12            –     4    9     9       │
│ 29/12            9     9   11    11 ⚠     │
│ 30/12           11    11   11    11 ⚠     │
│ 31/12           10    10   10    10       │
│ …                                         │
│ ⚠ 11 personnes pour 10 couchages          │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Saisir ou modifier mes dates** : arrivée et départ, chacun sous la forme date + créneau (matin, midi, soir, nuit). L'enregistrement est immédiat, et tout ce qui en dépend est recalculé.
- **Je ne viens pas** : efface mes dates, avec une confirmation. Je ne compte plus nulle part. Je peux revenir sur ma décision en saisissant de nouvelles dates.
- **Toucher une case** de l'emploi du temps : la liste des présents à ce créneau, avec un lien vers leur contact dans le [Carnet d'adresses](../compte/carnet.md).
- **Demander à l'hébergeur** (inscription tardive) : ouvre [Contacter le staff](../communaute/contact-staff.md), en attendant les messages privés (jalon 4).

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/presences.json`**, pour chaque compte :
- l'arrivée : date + créneau ;
- le départ : date + créneau ;
- la date de la dernière modification.

Un compte absent de ce fichier ne vient pas.

**Ce qui est lu ailleurs** :
- les dates du séjour, dans `config.json` ;
- la capacité du gîte, c'est-à-dire la somme des places des lits, dans [Gîte et salle](../staff/gite-salle.md) (voir [Lits](lits.md)) ;
- le prix du gîte et les exemptions, dans [Gîte et salle](../staff/gite-salle.md) ;
- l'inscription tardive acceptée ou non, dans `data/comptes.json`.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les créneaux** suivent le [modèle de présence](../../README.md#le-modèle-de-présence-commun-à-gîte-repas-et-budget) : matin = petit-déjeuner, midi = déjeuner, soir = dîner, nuit = nuitée. Dans une journée, ils se suivent dans cet ordre.
- **L'arrivée est le premier créneau compté, le départ le dernier.** Tous les créneaux entre les deux sont comptés.
  - Exemple : arrivée le 28 au soir, départ le 31 au matin. Cela donne le dîner du 28, les nuits du 28, du 29 et du 30, et tous les repas jusqu'au petit-déjeuner du 31 compris.
  - Le texte d'aide reprend cet exemple.
- **Mes nuits** = le nombre de créneaux « nuit » comptés. Les créneaux matin, midi et soir comptés sont les repas où je peux manger : je dis ensuite lesquels je prends sur la réserve dans [Mes repas](../repas/mes-repas.md).
- **Un seul séjour par personne** : pas d'allers-retours.
- **Ma part estimée du gîte** = le calcul de [Créances](../budget/creances.md) (prix du gîte / total des nuitées des non-exemptés × mes nuits). Avant l'ouverture des paiements, elle baisse à chaque nouvelle nuitée déclarée, d'où la mention « estimation ». Après, c'est ma part figée. Une personne exemptée voit « Exempté du gîte ».
- **La capacité n'est jamais un refus.** Une nuit au-dessus de la capacité affiche seulement une alerte : ceux qui n'ont pas de lit dorment par terre (voir [Lits](lits.md)).
- **Modifier ses dates reste possible jusqu'à la clôture des comptes**. On peut toujours venir, même tard. Mais ça se passe en deux temps (voir [Créances](../budget/creances.md)) :
  - **avant l'ouverture des paiements**, les parts du gîte et de la salle sont recalculées en direct ;
  - **après**, les parts sont figées. Des nuits en plus font de moi un **retardataire** : je dois ces nuits aux ploucs qui ont payé le gîte, dans [Mes comptes](../budget/mes-comptes.md).
- **Les dépenses déjà validées ne bougent pas** : leurs parts sont figées au moment de la validation (voir [Dépenses](../budget/depenses.md)).

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Dans la catégorie Gîte (voir [Notifications](../compte/notifications.md)) :
- **L'hébergeur du gîte et celui de la salle**, quand quelqu'un modifie ses dates ou ne vient plus après l'ouverture des paiements : « Bob a changé ses dates : 5 nuits au lieu de 3 ».
- **Ceux qui ont payé le gîte**, quand un retardataire ajoute des nuits : « Bob te doit 12,40 € pour ses nuits en plus ».
- **Le staff**, quand une nuit passe au-dessus de la capacité du gîte.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
L'enregistrement est refusé si :
- une date est en dehors du séjour (du 28/12/2026 au 03/01/2027) ;
- le départ est avant l'arrivée ;
- le départ est le dernier jour au créneau « nuit » : il n'y a plus de nuitée ce soir-là ;
- seule l'arrivée ou seul le départ est rempli.

- **Arrivée et départ sur le même créneau** : accepté, c'est un seul repas ou une seule nuit.
- **Une venue d'une journée sans nuit** (arrivée le 31 à midi, départ le 31 au soir) : zéro nuit, donc rien à payer pour le gîte. La salle reste due si elle est répartie à parts égales.
- **Je ne viens plus, ou je retire des nuits, après l'ouverture des paiements** : ce qui est payé est payé, sans remboursement (voir [Créances](../budget/creances.md)). La page le rappelle dans une confirmation avant d'enregistrer.
- **Les dates du séjour changent** dans `config.json` alors que des présences sont saisies : les créneaux en dehors des nouvelles dates ne comptent plus, et la personne concernée voit une alerte sur ses dates.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Lits](../gite/lits.md)
<!-- /nav -->
