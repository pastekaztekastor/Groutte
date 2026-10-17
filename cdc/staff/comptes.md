<!-- nav -->
[Menu](../../README.md#les-pages)
<!-- /nav -->

# Staff > Comptes


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Gérer les comptes et les droits des membres :
  - les droits staff ;
  - les codes ;
  - les rôles ;
  - le mode muet ;
  - la désactivation d'un compte.
- Garder une trace de chaque action du staff.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs ne voient pas cette page.
- **La personne concernée** est prévenue de chaque action qui la touche (voir Notifications).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
De haut en bas :
1. **Le champ de recherche des membres.**
   - On tape `@` puis un nom, comme dans le forum : les suggestions de `mentions.js` s'affichent.
   - Chaque membre choisi devient une pastille dans le champ, comme les destinataires d'un mail. On peut en choisir plusieurs.
2. **La liste des membres choisis**, avec pour chacun :
   - sa photo et son nom ;
   - s'il est staff ;
   - ses rôles ;
   - s'il est muet ;
   - s'il est désactivé.
3. **Les actions.** Seules celles qui ont du sens pour la sélection sont actives :
   - **Actions de groupe** (une ou plusieurs personnes) : ajouter ou retirer un rôle, rendre muet, rendre la parole ;
   - **Actions individuelles** (une seule personne sélectionnée, avec une confirmation) : nommer staff, retirer le droit staff, remettre le code à zéro, corriger le nom, désactiver ou réactiver le compte.
4. **Le journal** : les dernières actions du staff, du plus récent au plus ancien.

```
Comptes
┌───────────────────────────────────────────┐
│ [@Bob x] [@Chloé x] @da|                  │
│                       David               │
│                       Dana                │
├───────────────────────────────────────────┤
│ (o) Bob     plouc · Clés            │
│ (o) Chloé   plouc · muette          │
├─ Pour la sélection ───────────────────────┤
│ [Ajouter un rôle] [Retirer un rôle]       │
│ [Rendre muet]     [Rendre la parole]      │
├─ Pour une seule personne ─────────────────┤
│ [Nommer staff] [Retirer staff] [Code à 0] │
│ [Corriger le nom] [Désactiver]            │
├─ Journal ─────────────────────────────────┤
│ 16/10 21:04  Alice a rendu Chloé muette   │
│ 15/10 18:30  Alice a nommé Bob staff      │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
**Actions de groupe**
- **Ajouter ou retirer un rôle**, parmi les rôles que le staff a le droit d'attribuer (voir Règles et calculs).
- **Rendre muet**. La personne :
  - ne peut plus écrire, commenter, répondre ni réagir dans la Communauté (forum et messages) ;
  - peut toujours tout lire ;
  - reste muette jusqu'à ce qu'un staff lui rende la parole.
- **Rendre la parole** : lève le mode muet.

**Actions individuelles** (une personne à la fois, avec une confirmation)
- **Nommer staff.**
- **Retirer le droit staff.**
- **Remettre le code à zéro** :
  1. l'appli génère un **code provisoire**, que seul le staff qui a fait l'action voit, une seule fois ;
  2. le staff le transmet à la personne en privé ;
  3. tous les appareils de la personne sont déconnectés ;
  4. à sa connexion suivante, la personne doit choisir un nouveau code.
- **Corriger le nom** : pour une faute de frappe à l'inscription. Le nom change partout : dépenses, comptes, forum.
- **Désactiver le compte** (un doublon, ou quelqu'un qui ne vient finalement pas).
  - Le compte ne peut plus se connecter, et il disparaît des listes et des suggestions `@`.
  - Il reste dans l'historique : ses dépenses, ses remboursements et ses messages sont conservés.
  - **Si son solde n'est pas nul**, la désactivation est refusée, sauf si le staff retape le montant de ce solde pour confirmer. La confirmation affiche les montants et les personnes touchées.
  - Dans ce cas, **toutes ses dettes sont effacées, dans les deux sens** : ce qu'il doit est absorbé par ses créanciers, et ce qu'on lui doit est perdu. Ce sont des dettes effacées par le staff, comme dans [Suivi des dépenses](suivi-depenses.md).
  - On ne supprime jamais un compte.
- **Réactiver le compte.** Les dettes effacées à la désactivation ne reviennent pas.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Un compte** (dans `data/comptes.json`) contient :
- son nom ;
- son code, sous forme de hash (jamais en clair) ;
- s'il a un code provisoire à changer ;
- s'il est staff ;
- ses rôles ;
- s'il est muet ;
- s'il est désactivé.

**La liste des rôles** est dans un fichier JSON du dépôt (`roles.json`), que le webmaster modifie. La liste complète est dans le [README](../../README.md#rôles-rolesjson). Chaque rôle a un **type** :

| Type | Qui l'attribue | Exemples |
| --- | --- | --- |
| `libre` | chacun se l'attribue lui-même dans [Ma fiche](../compte/ma-fiche.md), et le staff peut aussi le poser | cuisine, média |
| `staff` | seulement le staff, sur cette page | clés, logistique |
| `automatique` | personne : il découle d'un autre réglage | Hébergeur (désigné dans [Gîte et salle](../staff/gite-salle.md)) |

Un rôle peut aussi **déclencher des actions supplémentaires**. Par exemple, Hébergeur reçoit les paiements du gîte et confirme les paiements reçus.

```json
[
  {"id": "cuisine",    "nom": "Cuisine",    "type": "libre"},
  {"id": "cles",       "nom": "Clés",       "type": "staff"},
  {"id": "hebergeur",  "nom": "Hébergeur",  "type": "automatique", "source": "gite-salle"}
]
```

**Le journal** (`data/journal-staff.json`) enregistre, pour chaque action :
- qui l'a faite ;
- l'action ;
- qui est concerné ;
- la date.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les staffs de départ** viennent de `config.json`, **au premier démarrage seulement**. Ensuite, c'est l'appli qui décide (`data/comptes.json`). Le webmaster peut toujours corriger à la main sur le serveur.
- **Un staff ne peut pas être rendu muet.** Dans le pire des cas, on lui retire d'abord son droit staff, puis on le rend muet.
- **Rendre muet ne touche que la Communauté** : un membre muet peut toujours saisir ses dépenses, payer, rembourser et utiliser le reste de l'appli.
- **Retirer le droit staff** à quelqu'un change qui valide les dépenses. S'il ne reste qu'un seul staff, il valide ses propres dépenses (voir [Dépenses](../budget/depenses.md)).

## Notifications
<!-- Qui reçoit quoi, et quand. -->
La personne concernée est prévenue quand :
- elle est nommée staff, ou perd ce droit ;
- son code est remis à zéro ;
- elle est rendue muette, ou retrouve la parole ;
- un rôle lui est ajouté ou retiré ;
- son nom est corrigé.

**Les personnes touchées** par les dettes effacées d'une désactivation sont prévenues : « Le compte de Bob est désactivé : ses 12,00 € envers toi sont effacés ».

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
Sont refusés :
- **retirer le droit staff au dernier staff** ;
- **retirer le droit staff à un hébergeur** du gîte ou de la salle : l'hébergeur reste staff pendant tout l'événement (voir [Gîte et salle](gite-salle.md)) ;
- **rendre muet un staff** ;
- **désactiver le dernier staff**, ou un hébergeur ;
- **désactiver un compte dont le solde n'est pas nul**, sans retaper le montant ;
- **corriger un nom pour celui d'un autre compte** ;
- **attribuer à la main un rôle `automatique`.**

Et aussi :
- **Un staff qui se retire lui-même son droit staff** : c'est autorisé, avec une confirmation, s'il n'est ni le dernier staff ni hébergeur.
- **Un membre muet** voit le champ d'écriture du forum remplacé par « Tu ne peux plus écrire pour le moment ».

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Les messages privés d'un membre muet** : tu as dit « la Communauté », j'y ai donc inclus les messages privés. Peut-il quand même écrire au staff pour discuter de sa sanction ?

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Inscription et connexion](../compte/inscription.md)
<!-- /nav -->
