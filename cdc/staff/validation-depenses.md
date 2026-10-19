<!-- nav -->
[Précédent : Réglages compta](../staff/reglages-compta.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Staff > Validation des dépenses


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Valider ou refuser les dépenses envoyées par les ploucs, pour qu'elles entrent dans les comptes (voir [Dépenses](../budget/depenses.md)).
- Voir toutes les dépenses envoyées par les ploucs, en attente comme validées.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Il y voit toutes les dépenses envoyées et toutes leurs pièces jointes.
- **Un staff ne valide jamais sa propre dépense** : c'est un autre staff qui s'en charge. S'il n'y a qu'un seul staff, il valide ses propres dépenses.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **En attente** : les dépenses envoyées, pas encore validées.
2. **Validées** : les dépenses déjà validées, en lecture seule.

Les deux listes sont dans l'ordre chronologique d'envoi. Chaque ligne affiche la date, l'auteur et le montant. Les brouillons n'apparaissent pas : ils ne sont pas encore envoyés.

**Le détail d'une dépense**, en touchant une ligne : tout ce que contient la dépense (date, motif, montant, mode de répartition, lignes ou catégories, personnes concernées), la photo du ticket en grand, et l'historique. Pour une dépense en attente, il montre aussi **les parts de chacun telles qu'elles seraient figées** si on validait maintenant. Pour une dépense validée, il montre les parts figées.

```
┌───────────────────────────────────────────┐
│ En attente (2)                            │
│ 29/12  Bob       84,20 €               >  │
│ 30/12  Alice     41,50 €               >  │
├───────────────────────────────────────────┤
│ Validées (12)                             │
│ 28/12  Léo       23,00 €               >  │
│ …                                         │
└───────────────────────────────────────────┘

Détail :
┌───────────────────────────────────────────┐
│ Courses Leclerc · 84,20 € · Bob · 29/12   │
│ [ photo du ticket ]                       │
│ Communauté :                              │
│   Alimentaire 70,00 €  Monster 14,20 €    │
│ Parts si validée : Alice 9,12 € · Léo …   │
│ [ Refuser ]                  [ Valider ]  │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Valider (un staff autre que l'auteur)** : la dépense devient **Validée**, et c'est définitif. Les parts de chacun sont calculées et figées à ce moment. Elle passe dans la liste Validées.
- **Refuser** : la dépense revient en **Brouillon** chez son auteur, avec un motif obligatoire qui explique pourquoi. Elle sort des deux listes.
- **Toucher la photo** : elle s'ouvre en plein écran, avec le zoom.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- Rien de propre à cette page. Les dépenses, leurs parts et leur historique (qui a envoyé, validé ou refusé, et quand) sont décrits dans [Dépenses](../budget/depenses.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les parts affichées avant validation** sont calculées avec les nuits, les repas et les coches de Ma fiche du moment, comme le serait la validation elle-même (voir [Dépenses](../budget/depenses.md)).
- **Sa propre dépense** s'affiche normalement, mais le bouton Valider est grisé, avec « Un autre staff doit la valider ». S'il n'y a qu'un seul staff, le bouton est actif.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Le staff**, quand une dépense est envoyée : la notification ouvre cette page, sur le détail de la dépense.
- **L'auteur**, quand sa dépense est validée ou refusée, et **les personnes concernées**, quand elle est validée : envoyées par [Dépenses](../budget/depenses.md).

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Une dépense validée ne se modifie plus.** Si le staff a validé une erreur, elle reste. En dernier recours, la part d'une personne peut être effacée depuis [Suivi des dépenses](suivi-depenses.md).
- **Un refus sans motif** est refusé.
- **Deux staffs agissent en même temps** sur la même dépense : la première action enregistrée l'emporte. L'autre voit « Cette dépense vient d'être validée (ou refusée) par Alice ».
- **Une dépense qui n'a plus de concerné au moment de valider** (par exemple, tous ceux qui avaient coché la catégorie l'ont décochée) : la validation est refusée. Il faut la refuser, avec un motif, pour que l'auteur la corrige.
- **Après la clôture des comptes**, aucune dépense ne peut plus être validée (voir [Mes comptes](../budget/mes-comptes.md)).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Contacter le staff](../communaute/contact-staff.md)
<!-- /nav -->
