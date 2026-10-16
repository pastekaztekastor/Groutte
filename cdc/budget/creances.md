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
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** voit sa part et déclare ses paiements. Les membres du staff font de même, en tant que ploucs.
- **L'hébergeur** confirme les paiements qu'il a reçus, et accepte ou non les reports.
- **Le staff** décide des exemptions (dans [Gîte et salle](../staff/gite-salle.md)).
- **Les exemptions sont mentionnées, mais restent anonymes.** On affiche par exemple « 2 personnes exemptées », jamais leur nom. Ce sont des exceptions décidées en communauté (par exemple : quelqu'un qu'on ne fait pas dormir par terre, ou qui paie déjà très cher pour venir).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**Pour un plouc**, de haut en bas :
1. Le contact de l'hébergeur : photo, nom, appeler, et un lien vers [Contacter le staff](../communaute/contact-staff.md) (en attendant les messages privés, au jalon 4).
2. La date limite de paiement, fixée par le staff.
3. Deux blocs, **Gîte** et **Salle**. Chacun affiche :
   - ma part ;
   - ce que j'ai déjà déclaré ;
   - le reste à payer, avec une barre de progression ;
   - le bouton **Payer**.
4. **Mes données** : mes nuits, et si je suis exempté.
5. **Les données générales** :
   - le total des nuitées ;
   - le nombre de ploucs ;
   - le nombre d'exemptés, sans les noms ;
   - les montants du gîte et de la salle.
6. **La méthode de calcul** : pourquoi elle a été choisie, puis son application aux données, qui donne les deux résultats.
7. Un lien « Comment ça marche ? » vers la [FAQ du budget](comment-ca-marche.md).

```
Créances gîte et salle
┌───────────────────────────────────────────┐
│ (o) Hébergeur : Alice  [Appeler] [Contact]│
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
- la liste des ploucs, avec ce que chacun a payé et ce qu'il doit encore ;
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
  - **Demander un arrangement** : ouvre [Contacter le staff](../communaute/contact-staff.md), en attendant les messages privés (jalon 4).
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
- les nuits de chacun, dans [Présence](../gite/presence.md) ;
- les moyens de paiement de l'hébergeur, dans [Me rembourser](../compte/me-rembourser.md).

**Les parts ne sont pas enregistrées** : elles sont recalculées à chaque affichage.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le gîte**, selon le réglage du staff (au prorata des nuits par défaut, ou à parts égales comme la salle) :
  - prix d'une nuitée = montant du gîte / total des nuitées des non-exemptés ;
  - ma part = prix d'une nuitée × mes nuits ;
  - exemple : 1 400 € / 50 nuitées = 28 € la nuitée, et 28 € × 5 nuits = 140 €.
- **La salle**, selon le réglage du staff :
  - **à parts égales** : montant de la salle / nombre de ploucs non exemptés qui viennent (ceux qui ont des dates dans [Présence](../gite/presence.md)) ;
  - **comme le gîte** : même formule que ci-dessus.
- **Exemptions** : une personne peut être exemptée du gîte, de la salle, ou des deux. Elle est retirée du calcul, et sa part se répartit sur les autres.
- **Tout se compte en centimes.** Les centimes en trop vont à l'hébergeur (comme le reste au payeur dans [Dépenses](depenses.md)).
- **Ça se passe en deux temps.**
  1. **Avant l'ouverture des paiements**, chacun dit s'il vient et à quelles dates. Les parts sont recalculées en direct à chaque changement.
  2. **À l'ouverture des paiements**, les parts sont **figées** : le site établit le prix de chacun, et on paie. Les changements de dates qui suivent ne modifient plus ces parts.
- **Les retardataires** : celui qui arrive après l'ouverture des paiements (une inscription tardive acceptée), ou qui ajoute des nuits, ne paie pas l'hébergeur. Il dort dans un gîte que les autres ont payé : il a donc **une dette envers eux**.
  - Sa dette = montant du gîte / (nuitées figées + ses nuits en plus) × ses nuits en plus. C'est ce qu'il aurait payé si on avait tout recalculé.
  - Elle est répartie entre ceux qui ont une part du gîte (l'hébergeur compris, les exemptés non), au prorata de leurs nuits. On sait donc combien il doit à chacun.
  - Même principe pour la salle : à parts égales, il doit une part de plus, répartie à parts égales entre ceux qui l'ont payée.
  - Ces dettes vont dans [Mes comptes](mes-comptes.md). **Les dépenses de nourriture servent de tampon** : elles se compensent d'abord avec ce que les autres lui doivent. Ce que le tampon n'éponge pas se règle par virement direct.
- **Retirer des nuits, ou ne plus venir, après l'ouverture des paiements** : ce qui est payé est payé. Les parts restent figées, il n'y a ni remboursement ni avoir. La FAQ l'explique.
- **Les changements faits par le staff** après l'ouverture (montant, exemption, répartition, voir [Gîte et salle](../staff/gite-salle.md)) recalculent les parts. Les écarts avec ce qui a déjà été payé se régularisent dans [Mes comptes](mes-comptes.md) :
  - **un trop-payé** devient un avoir : l'hébergeur lui doit de l'argent ;
  - **un manque** devient une dette envers l'hébergeur, qu'on peut régler à tout moment.
- **La régularisation finale** se fait quand le staff clôture les comptes, après le séjour (voir [Mes comptes](mes-comptes.md)).
- **L'hébergeur ne se doit rien à lui-même** : sa propre part réduit simplement ce qu'il a avancé.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Les notifications de paiement **ne peuvent pas être coupées** dans Réglages > Notifications, comme les annonces.

- **Tous les ploucs non exemptés** : à l'ouverture des paiements, « Tu peux payer ta part ».
- **Ceux qui n'ont pas tout payé** :
  - un rappel par semaine ;
  - un rappel par jour pendant la dernière semaine avant la date limite.
- **Le payeur**, quand il déclare un paiement : un remerciement.
- **L'hébergeur**, quand un paiement est déclaré : « À confirmer ».
- **Le payeur**, quand l'hébergeur confirme ou refuse son paiement.
- **Ceux qui n'ont pas tout payé**, à la date limite : un message bienveillant qui explique qu'on peut s'arranger avec l'hébergeur, avec un bouton qui ouvre [Contacter le staff](../communaute/contact-staff.md).
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
- **Un retardataire** voit, à la place du bouton Payer : « Tu es arrivé après l'ouverture des paiements : ta part du gîte est une dette envers les autres ploucs, dans Mes comptes ».

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Le lien avec le prévisionnel et l'acompte.** Le paiement du gîte vaut-il validation de l'inscription ?
  - Piste : une page **Réservation** où l'on paie, par exemple, 80 % du prévisionnel pour réserver sa place, si le staff active cette option.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Dépenses](../budget/depenses.md)
<!-- /nav -->
