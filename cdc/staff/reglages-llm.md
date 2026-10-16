<!-- nav -->
[Précédent : Validation des dépenses](../staff/validation-depenses.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Staff > Réglages LLM

- **Priorité** : 3
- **Statut** : à décrire

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Configurer le LLM qui lit les tickets de caisse dans [Dépenses](../budget/depenses.md) : fournisseur, modèle et clé d'API.
- Sans LLM configuré, l'option « Préremplir avec le ticket » n'apparaît pas dans Dépenses. La saisie à la main suffit.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.**

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
- Le fournisseur, le modèle, et la clé d'API, affichée masquée (`sk-…a3f2`).
- Un bouton **Tester la clé**.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Enregistrer** le fournisseur, le modèle et la clé.
- **Tester la clé** : un appel simple au fournisseur, qui dit si la clé marche.
- **Retirer la clé** : l'option disparaît de Dépenses.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- Le fournisseur, le modèle et la clé, côté serveur dans `data/`.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **La clé n'est jamais renvoyée à l'écran**, ni à personne : elle reste sur le serveur, et l'appli n'en affiche que la fin.
- **La clé est payée par un staff**, comme un frais de fonctionnement du site, au même titre que le nom de domaine et l'hébergement. Ces frais sont notés dans [Prévisionnel](previsionnel.md).

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- À décrire.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **LLM configuré mais injoignable** (hors ligne, clé refusée) : la lecture attend, et la dépense reste en brouillon (voir [Dépenses](../budget/depenses.md)).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Un plafond** (un nombre de lectures par jour, par exemple), pour éviter une facture surprise ?

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Contacter le staff](../communaute/contact-staff.md)
<!-- /nav -->
