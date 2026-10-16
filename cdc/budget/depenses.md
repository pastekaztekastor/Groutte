<!-- nav -->
[Précédent : Créances gîte et salle](../budget/creances.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Dépenses

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Saisir ce que j'ai payé pour le groupe, et dire entre qui la dépense se partage.
- Une dépense passe par plusieurs états. Elle n'entre dans les comptes de chacun qu'une fois validée par le staff.
- Le gîte et la salle ne passent pas par ici : ils sont gérés dans [Créances gîte et salle](creances.md). On ne les compte donc pas deux fois.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- **Chaque participant** saisit ses dépenses, puis les modifie tant qu'elles sont en brouillon. Les membres du staff font de même, en tant que participants.
- **Dans la liste, chacun voit ses propres dépenses.**
- **Les personnes concernées** voient aussi le détail et le ticket des dépenses qu'elles paient, depuis [Mes comptes](mes-comptes.md).
- **Le staff** valide ou refuse les dépenses en attente, sur une page dédiée : [Validation des dépenses](../staff/validation-depenses.md). Il y voit toutes les pièces jointes.
- **Un staff ne valide jamais sa propre dépense** : c'est un autre staff qui s'en charge.
  - S'il n'y a qu'un seul staff, il valide ses propres dépenses. Dans les faits, ce sera le webmaster : celui qui a la main sur le serveur, et qui est staff dans l'appli.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**La liste de mes dépenses**

Chaque ligne affiche :
- la date ;
- le motif ;
- le montant ;
- l'état ;
- les photos de profil des personnes concernées.

La bulle « + » en bas à droite ouvre l'écran de saisie.

```
Dépenses
┌───────────────────────────────────────────┐
│ 29/12  Courses Leclerc      84,20 €       │
│        Validée              (o)(o)(o)(o)+5│
├───────────────────────────────────────────┤
│ 30/12  McDo                 41,50 €       │
│        En attente           (o)(o)(o)(o)  │
└───────────────────────────────────────────┘
                                        (+)
```

**L'écran de saisie** contient :
- **Date** : la date du ticket. Elle est remplie avec le jour même et reste modifiable.
- **Motif** : un texte.
- **Montant** : un nombre en euros, avec des centimes.
- **Photo du ticket** : facultative.
- **Personnes concernées** : on les ajoute en tapant `@`, comme dans le forum.
  - Le payeur est inclus par défaut, et on peut le retirer (c'est le cas du Monster).
- **Mode de répartition**, au choix parmi trois :
  - **Parts égales** : le montant est divisé entre les personnes concernées.
  - **Montants exacts** : une ligne par personne, avec son montant. Exemple : 4 personnes vont au McDo, une seule paie tout, et on note qui a pris quoi.
  - **Pour la communauté**, comme pour des courses alimentaires : le montant est découpé par **catégories**, celles définies par le staff dans [Réglages compta](../staff/reglages-compta.md).
    - Chaque catégorie se répartit entre ses concernés par défaut.
    - La catégorie **« NON GÉRÉ »** est toujours présente : elle met de côté un achat personnel glissé dans le panier, qui reste à la charge du payeur.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Préremplir avec le ticket.** Le LLM lit la photo : les lignes, les montants et une catégorie proposée pour chacune. Ce n'est qu'un préremplissage, et l'auteur doit le vérifier.
  - Si le LLM est indisponible (hors ligne, ou pas de clé d'API), la lecture attend, et la dépense reste en brouillon.
- **Saisir à la main** : c'est toujours possible.
- **Enregistrer** : la dépense reste en **Brouillon**, et on peut la modifier.
- **Envoyer** : la dépense passe **En attente**, et le staff est prévenu.
- **Valider (un staff autre que l'auteur)** : la dépense devient **Validée**, et c'est définitif. Elle compte alors dans [Mes comptes](mes-comptes.md) pour le payeur et pour chaque personne concernée.
- **Refuser (staff)** : la dépense revient en **Brouillon**, avec un commentaire qui explique pourquoi.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
Une dépense contient :
- son identifiant ;
- l'auteur, qui est aussi le payeur ;
- la date du ticket et la date de saisie ;
- le motif ;
- le montant total, **en centimes** ;
- la photo du ticket, si elle existe ;
- le mode de répartition : parts égales, montants exacts ou communauté ;
- les **parts** :
  - en parts égales ou en montants exacts : une liste de lignes *personne + montant en centimes* ;
  - en mode communauté : une liste de lignes *catégorie + montant en centimes*. Les parts de chacun sont calculées à partir des concernés par défaut de chaque catégorie ;
- **les parts de chacun, calculées et enregistrées à la validation** (personne + montant en centimes), pour toutes les dépenses, y compris en mode communauté ;
- l'état : Brouillon, En attente ou Validée ;
- le commentaire de refus, s'il y en a un ;
- l'historique : qui a envoyé, validé ou refusé, et quand.

Ce que la dépense lit ailleurs :
- les catégories et leurs concernés par défaut, dans Réglages compta ;
- les présences, dans Ma réservation ;
- les catégories facultatives cochées par chacun, dans Ma fiche.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Tous les montants se comptent en centimes.**
- **Parts égales** : le montant est divisé, puis arrondi au centime. Les centimes en trop vont au payeur. Exemple : 10 € à 3 personnes donnent 3,33 + 3,33 + 3,34 €, le payeur prenant 3,34 €.
- **Montants exacts** : la somme des lignes doit être égale au total.
- **Communauté** : la somme des catégories doit être égale au total. Chaque catégorie se répartit ainsi :

  Chaque catégorie est **obligatoire** (tout le monde y participe) ou **facultative** (seuls ceux qui l'ont cochée dans [Ma fiche](../compte/ma-fiche.md) y participent). Elle a aussi une **règle de répartition** : à parts égales, au prorata des repas ou au prorata des nuits. Les deux se règlent dans [Réglages compta](../staff/reglages-compta.md). Par exemple :

  | Catégorie | Type | Qui paie | Répartition |
  | --- | --- | --- | --- |
  | Alimentaire | obligatoire | les présents aux repas | au prorata des repas |
  | Monster | facultative | ceux qui l'ont cochée | au prorata des nuits |
  | Alcool | facultative | ceux qui l'ont cochée | à parts égales |
  | NON GÉRÉ | spéciale | le payeur seul | - |

  - Exemple : A achète des Monster sans en boire, les buveurs le remboursent en totalité.
  - Le staff gère les autres catégories et leur règle dans Réglages compta.
  - **On ne corrige pas les concernés au cas par cas.** Ce sont les présences déclarées par chacun (Ma réservation, Repas) qui comptent : quelqu'un qui s'est déclaré présent mais n'a finalement pas mangé est quand même compté.
  - **Les concernés et les parts sont figés au moment de la validation.** On prend les présences et les coches de Ma fiche telles qu'elles sont à cet instant. Les changements faits ensuite ne valent que pour les dépenses validées après. Les comptes ne bougent donc jamais tout seuls après coup.
- **Un seul mode par dépense.** Un ticket qui mélange des achats perso et des achats communs (des courses avec le sandwich de quelqu'un) se règle par un arrangement entre participants, en dehors de l'outil.
- **Les revenus** (consignes, restes revendus…) ne sont pas gérés.
- **La vie d'une dépense s'arrête à « Validée ».** Les remboursements se suivent dans Mes comptes, sous forme de soldes. Un état « remboursée » n'aurait pas de sens en mode minimum de virements.
  - En mode remboursement direct seulement, la dépense peut afficher « remboursée partiellement » ou « remboursée ».

```
Brouillon ──envoyer──> En attente ──staff valide──> Validée
    ^                     │
    └──staff refuse───────┘   (avec un commentaire)
```

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Le staff**, quand une dépense est envoyée. La notification ouvre [Validation des dépenses](../staff/validation-depenses.md).
- **L'auteur**, quand sa dépense est validée ou refusée.
- **Les personnes concernées**, quand une dépense est validée : « Ton solde a changé : tu dois maintenant X € ». La notification ouvre Mes comptes.
- **L'auteur**, à chaque remboursement reçu, avec le montant restant à recevoir. Cette notification est envoyée par Mes comptes.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
L'envoi est refusé si :
- le montant est nul ou négatif ;
- aucune personne n'est concernée ;
- en montants exacts, la somme des lignes ne tombe pas sur le total ;
- en mode communauté, la somme des catégories ne tombe pas sur le total ;
- une personne concernée n'existe pas.

- L'auteur ne peut plus modifier une dépense En attente ou Validée.
- L'auteur ne peut pas retirer une dépense En attente : seul un refus du staff la remet en brouillon.
- Un staff ne peut pas valider sa propre dépense, sauf s'il est le seul staff.
- **Une dépense validée est définitive.** Si le staff a validé une erreur, elle reste.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Comment ça marche](../budget/comment-ca-marche.md)
<!-- /nav -->
