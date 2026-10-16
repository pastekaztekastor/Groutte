<!-- nav -->
[Précédent : Mes comptes](../budget/mes-comptes.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Créances gîte et salle

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Ce que je dois pour le gîte et pour la salle : à qui, combien, avant quelle date, avec la méthode de calcul et les données qui donnent ce montant.
- **L'hébergeur** est la personne qui avance l'argent de la location. Il y en a un pour le gîte et un pour la salle, qui peuvent être la même personne.
  - L'hébergeur est **forcément un staff**.
  - C'est le staff qui le désigne, dans [Gîte et salle](../staff/gite-salle.md). L'étiquette « Hébergeur » du carnet d'adresses en découle.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- **Chaque participant** voit sa part et déclare ses paiements. Les membres du staff font de même, en tant que participants.
- **L'hébergeur** confirme les paiements qu'il a reçus, et accepte ou non les reports.
- **Le staff** décide des exemptions (dans [Gîte et salle](../staff/gite-salle.md)).
- **Les exemptions sont mentionnées, mais restent anonymes.** On affiche par exemple « 2 personnes exemptées », jamais leur nom. Ce sont des exceptions décidées en communauté (par exemple : quelqu'un qu'on ne fait pas dormir par terre, ou qui paie déjà très cher pour venir).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**Pour un participant**, de haut en bas :
1. Le contact de l'hébergeur : photo, nom, appeler, message privé.
2. La date limite de paiement, fixée par le staff.
3. Deux blocs, **Gîte** et **Salle**. Chacun affiche :
   - ma part ;
   - ce que j'ai déjà déclaré ;
   - le reste à payer, avec une barre de progression ;
   - le bouton **Payer**.
4. **Mes données** : mes nuits, et si je suis exempté.
5. **Les données générales** :
   - le total des nuitées ;
   - le nombre de participants ;
   - le nombre d'exemptés, sans les noms ;
   - les montants du gîte et de la salle.
6. **La méthode de calcul** : pourquoi elle a été choisie, puis son application aux données, qui donne les deux résultats.
7. Un lien « Comment ça marche ? » vers la [FAQ du budget](comment-ca-marche.md).

```
Créances gîte et salle
┌───────────────────────────────────────────┐
│ (o) Hébergeur : Alice     [Appeler] [MP]  │
│ À payer avant le 01/12/2026               │
├───────────────────────────────────────────┤
│ Gîte    140,00 €  [■■■■■■□□□□]  reste 56 €│
│                               [ Payer ]   │
│ Salle    30,00 €  Payé, merci !           │
├───────────────────────────────────────────┤
│ Mes nuits : 5 · Nuitées totales : 50      │
│ 1 400 € / 50 nuitées = 28 € la nuitée     │
│ 28 € × 5 nuits = 140 €                    │
│ 2 personnes exemptées                     │
└───────────────────────────────────────────┘
```

**Pour l'hébergeur**, en plus :
- « J'ai avancé X €, j'ai reçu Y €, il manque Z € » ;
- la liste des participants, avec ce que chacun a payé et ce qu'il doit encore ;
- les paiements déclarés, à confirmer.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Payer** : l'appli ne fait pas de virement.
  1. Elle affiche les moyens de paiement de l'hébergeur (lien Wero, PayPal, IBAN), tirés de son [Me rembourser](../compte/me-rembourser.md).
  2. Je fais le virement moi-même.
  3. Je déclare « j'ai payé X € ». Le paiement peut être partiel.
- **Confirmer (hébergeur)** : il confirme qu'il a bien reçu l'argent. Le paiement compte alors dans mon reste à payer.
- **Refuser (hébergeur)** : rien n'est arrivé. Le paiement est annulé, et le bouton Payer revient.
- **Après la date limite**, s'il reste quelque chose à payer :
  - **Demander un arrangement** : ouvre un message privé avec l'hébergeur.
  - **Accepter le report (hébergeur ou staff)** : le reste à payer passe dans [Mes comptes](mes-comptes.md) sous forme de dette, qu'on peut régler à tout moment. Le bloc affiche alors un lien vers Mes comptes, à la place du bouton.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Ce qui est enregistré**
- **Les paiements**. Chaque paiement contient :
  - son identifiant ;
  - qui a payé ;
  - pour quoi : gîte ou salle ;
  - le montant, en centimes ;
  - la date de la déclaration ;
  - l'état : déclaré, confirmé ou refusé ;
  - qui l'a confirmé, et quand.
- **Les reports**. Chaque report contient :
  - qui en profite ;
  - pour quoi : gîte ou salle ;
  - le montant, en centimes ;
  - qui l'a accepté, et quand.
- **Les rappels déjà envoyés**, pour ne jamais en envoyer deux fois.

**Ce qui est lu dans [Gîte et salle](../staff/gite-salle.md)** :
- les montants du gîte et de la salle ;
- la date limite ;
- l'hébergeur de chacun ;
- les exemptions ;
- le mode de répartition de la salle ;
- l'ouverture des paiements.

**Ce qui est lu ailleurs** :
- les nuits de chacun, dans [Ma réservation](../gite/ma-reservation.md) ;
- les moyens de paiement de l'hébergeur, dans [Me rembourser](../compte/me-rembourser.md).

**Les parts ne sont pas enregistrées** : elles sont recalculées à chaque affichage.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le gîte** :
  - prix d'une nuitée = montant du gîte / total des nuitées des non-exemptés ;
  - ma part = prix d'une nuitée × mes nuits ;
  - exemple : 1 400 € / 50 nuitées = 28 € la nuitée, et 28 € × 5 nuits = 140 €.
- **La salle**, selon le réglage du staff :
  - **à parts égales** : montant de la salle / nombre de participants non exemptés ;
  - **comme le gîte** : même formule que ci-dessus.
- **Exemptions** : une personne peut être exemptée du gîte, de la salle, ou des deux. Elle est retirée du calcul, et sa part se répartit sur les autres.
- **Tout se compte en centimes.** Les centimes en trop vont à l'hébergeur (comme le reste au payeur dans [Dépenses](depenses.md)).
- **Le calcul se fait en direct.** Si les présences changent après des paiements (une inscription tardive, une nuit en plus, un désistement), les parts sont recalculées. Les écarts sont régularisés dans [Mes comptes](mes-comptes.md) :
  - **un trop-payé** devient un avoir : on lui doit de l'argent. Cet avoir se compense avec ses parts des dépenses de la semaine ;
  - **un manque** devient une dette, qu'on peut régler à tout moment.
- **La régularisation finale** se fait quand le staff clôture les comptes, après le séjour (voir [Mes comptes](mes-comptes.md)).
- **L'hébergeur ne se doit rien à lui-même** : sa propre part réduit simplement ce qu'il a avancé.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Les notifications de paiement **ne peuvent pas être coupées** dans Réglages > Notifications, comme les annonces.

- **Tous les participants non exemptés** : à l'ouverture des paiements, « Tu peux payer ta part ».
- **Ceux qui n'ont pas tout payé** :
  - un rappel par semaine ;
  - un rappel par jour pendant la dernière semaine avant la date limite.
- **Le payeur**, quand il déclare un paiement : un remerciement.
- **L'hébergeur**, quand un paiement est déclaré : « À confirmer ».
- **Le payeur**, quand l'hébergeur confirme ou refuse son paiement.
- **Ceux qui n'ont pas tout payé**, à la date limite : un message bienveillant qui explique qu'on peut s'arranger avec l'hébergeur, avec un bouton qui ouvre le message privé.
- **La personne concernée**, quand un report est accepté : un lien vers Mes comptes.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un montant déclaré nul ou négatif** est refusé.
- **Un montant déclaré plus élevé que le reste à payer** est accepté. Le surplus devient un avoir dans Mes comptes.
- **Tout est payé et confirmé** : les lignes de paiement disparaissent du bloc, remplacées par « Payé, merci ! ».
- **Un paiement partiel confirmé** : le bloc affiche le reste à payer, et le bouton Payer reste disponible.
- **Je suis exempté** : le bloc affiche « Tu es exempté » à la place du montant et du bouton.
- **L'hébergeur** ne voit pas de bouton Payer pour sa propre part.
- **Les paiements ne sont pas encore ouverts** : les montants s'affichent à titre indicatif, sans bouton Payer.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Le lien avec le prévisionnel et l'acompte.** Le paiement du gîte vaut-il validation de l'inscription ?
  - Piste : une page **Réservation** où l'on paie, par exemple, 80 % du prévisionnel pour réserver sa place, si le staff active cette option.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Dépenses](../budget/depenses.md)
<!-- /nav -->
