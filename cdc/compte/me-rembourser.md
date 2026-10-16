<!-- nav -->
[Précédent : Ma fiche](../compte/ma-fiche.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Compte > Me rembourser

- **Priorité** : 1
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Indiquer comment on peut me rembourser.
- Ces moyens sont affichés à ceux qui me doivent de l'argent quand ils touchent « Rembourser » ([Mes comptes](../budget/mes-comptes.md)) ou « Payer » ([Créances](../budget/creances.md)).
- **On reprend la page « Me rembourser » de NextSession** (`#rembourser`) et sa page « Payer », avec le QR code de virement (`qrcode.js`).

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chacun** renseigne ses propres moyens de paiement.
- **Seuls ceux qui me doivent de l'argent** les voient, au moment de payer. C'est la règle de NextSession : mon IBAN n'est pas affiché à tout le monde.
- **Les moyens de l'hébergeur** sont visibles par tous ceux qui ont une part du gîte ou de la salle à payer.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**Ma page** : une liste groupée, avec une ligne par moyen de paiement. On remplit seulement ceux qu'on utilise.

| Moyen | Ce qu'on renseigne |
| --- | --- |
| Virement | IBAN et nom du titulaire |
| Wero | numéro de téléphone ou adresse mail lié à Wero |
| PayPal | identifiant PayPal.me |
| Lydia / Sumeria | lien de paiement Lydia / Sumeria (https://…) |
| Revolut | identifiant Revolut (@revtag) |
| Espèces | une case « J'accepte les espèces en main propre » |

On peut aussi choisir **un moyen préféré**, affiché en premier.

```
Me rembourser
┌─ Mes moyens de paiement ──────────────────┐
│ Virement   FR76 •••• 1234  (Bob M.)   >   │
│ Wero       06 •• •• •• 12   préféré   >   │
│ PayPal     paypal.me/bobby            >   │
│ Lydia                       Ajouter   >   │
│ Revolut                     Ajouter   >   │
│ Espèces en main propre          [x]       │
└───────────────────────────────────────────┘
```

**La page de paiement**, vue par celui qui me doit de l'argent : seulement les moyens que j'ai renseignés, mon moyen préféré en premier. Pour chacun :
- **Virement** : l'IBAN, le montant et le libellé, chacun avec un bouton Copier ; et le QR code de virement SEPA, que beaucoup d'applis bancaires savent lire ;
- **PayPal** : un lien PayPal.me qui contient déjà le montant ;
- **Revolut** : un lien revolut.me ;
- **Wero** : le numéro à copier, puisque Wero n'a pas de lien de paiement ;
- **Lydia / Sumeria** : un bouton qui ouvre son lien ;
- **Espèces** : « Bob accepte les espèces en main propre ».

Ensuite vient le bouton **« J'ai payé »** (voir [Mes comptes](../budget/mes-comptes.md) et [Créances](../budget/creances.md)).

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Ajouter ou modifier un moyen** : une fenêtre avec le champ à remplir, qui vérifie le format.
- **Retirer un moyen.**
- **Choisir mon moyen préféré.**
- **Copier** (sur la page de paiement) : l'IBAN, le montant, le libellé ou le numéro.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/profils.json`**, pour chaque compte :
- l'IBAN et le titulaire ;
- le contact Wero ;
- l'identifiant PayPal.me ;
- le lien Lydia / Sumeria ;
- l'identifiant Revolut ;
- s'il accepte les espèces ;
- son moyen préféré.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le libellé de virement est prérempli** : « Groutte - Gîte - Bob », « Groutte - Remboursement - Bob »…
- **Le QR code SEPA** (format EPC) contient le titulaire, l'IBAN, le montant et le libellé.
- **L'IBAN est masqué dans ma propre page** (FR76 •••• 1234). Il n'est affiché en entier que sur la page de paiement, à ceux qui me doivent de l'argent.
- **Aucun argent ne passe par l'appli.** Elle affiche les moyens de paiement, chacun fait le virement de son côté, puis déclare ce qu'il a payé.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Un hébergeur sans aucun moyen de paiement** reçoit une notification quand un staff essaie d'ouvrir les paiements : « Ajoute un moyen de paiement pour qu'on puisse te payer ».

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un IBAN invalide** est refusé (vérification de la clé, modulo 97).
- **Un identifiant PayPal.me ou Revolut mal formé**, ou **un numéro de téléphone mal formé**, est refusé.
- **Aucun moyen renseigné** : la page de paiement affiche « Demande-lui comment la rembourser », avec un lien vers son contact dans le carnet d'adresses.
- **Je retire mon moyen préféré** : la préférence passe au premier moyen restant.
- **Le staff ne peut pas ouvrir les paiements** du gîte ou de la salle tant que l'hébergeur n'a aucun moyen de paiement (voir [Gîte et salle](../staff/gite-salle.md)).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Apple Pay et Google Pay.**
  - Ce sont des portefeuilles pour **payer** chez un commerçant, pas pour **recevoir** de l'argent entre particuliers. Apple Cash, qui fait ça, n'existe qu'aux États-Unis.
  - Pour les accepter, il faudrait passer par un prestataire de paiement (Stripe, SumUp…). Il faut alors un compte commerçant, avec vérification d'identité et de l'activité, et des frais à chaque paiement (de l'ordre de 1,5 % + 0,25 €).
  - L'argent arriverait alors sur **un seul compte**, celui du commerçant ou de l'association. Ça casse le principe de l'appli, où chacun reçoit directement ce qu'on lui doit.
  - **Se déclarer commerçant ou association sans l'être**, c'est mentir au prestataire lors de la vérification d'identité. Il peut bloquer le compte et l'argent qui s'y trouve. Si le groupe veut vraiment cette option, il faut créer **une vraie association loi 1901**. C'est simple et presque gratuit, mais l'argent du séjour passerait alors par son compte.
  - Ma recommandation : **ne pas les proposer**. Wero couvre le paiement instantané depuis les applis bancaires françaises, PayPal le paiement par carte, et les espèces le séjour sans réseau. 
  
  Je sais le virement c'était cool ... bref on avissera pour l'année suivante.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Notifications](../compte/notifications.md)
<!-- /nav -->
