# Compte > Inscription et connexion

- **Priorité** : 1
- **Statut** : à décrire

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Créer son compte ou se connecter à un compte existant, à l'installation ou sur un nouvel appareil.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- Tout le monde, avant d'être connecté.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
- À décrire.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- Créer un compte : nom, code à 4 chiffres.
- Se connecter : choisir son compte, saisir son code.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- À décrire.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- Chaque compte a son code à 4 chiffres. Après 5 erreurs, il est bloqué quelques minutes.
- Les staffs de départ sont dans `config.json`.
- Les comptes sont dans un fichier JSON de `data/`, modifiable à la main.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- À décrire.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- Code oublié : un staff le remet à zéro (Staff > Comptes).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Les inscriptions ferment-elles après la date limite ?
