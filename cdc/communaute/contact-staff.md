<!-- nav -->
[Précédent : Réglages LLM](../staff/reglages-llm.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Communauté > Contacter le staff

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Une page provisoire, **en attendant les messages privés** ([Messages](messages.md), jalon 4) : comment joindre le staff et les hébergeurs.
- Tous les boutons du jalon 2 qui devaient ouvrir un message privé mènent ici : « Demander à l'hébergeur » ([Présence](../gite/presence.md)), « Demander un arrangement » et le contact de l'hébergeur ([Créances](../budget/creances.md)), la notification de date limite de paiement.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Tous les ploucs**, y compris une inscription tardive pas encore acceptée.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Le Discord de gestion** : un bouton qui ouvre le lien d'invitation du serveur Discord actuel.
2. **Les hébergeurs** : photo, nom, et les boutons **Appeler** et **SMS**.
3. **Le staff** : la même chose, pour chaque membre du staff.

```
┌───────────────────────────────────────────┐
│ En attendant les messages privés dans     │
│ l'appli, passe par Discord ou appelle.    │
│            [ Ouvrir le Discord ]          │
├─ Hébergeurs ──────────────────────────────┤
│ (o) Alice  Gîte          [Appeler] [SMS]  │
│ (o) Bob    Salle         [Appeler] [SMS]  │
├─ Staff ───────────────────────────────────┤
│ (o) Chloé                [Appeler] [SMS]  │
│ (o) David                [Appeler] [SMS]  │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Ouvrir le Discord** : ouvre le lien dans l'appli Discord ou le navigateur.
- **Appeler**, **SMS** : comme dans le [Carnet d'adresses](../compte/carnet.md).
- **Toucher une personne** : ouvre sa fiche dans le Carnet d'adresses.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Le lien du Discord de gestion**, dans `config.json` (`discord_gestion`), modifié par le webmaster.
- **Les hébergeurs**, dans [Gîte et salle](../staff/gite-salle.md).
- **Le staff**, dans `data/comptes.json`.
- **Les téléphones**, dans [Ma fiche](../compte/ma-fiche.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Une personne qui est hébergeur et staff** n'apparaît qu'une fois, dans Hébergeurs.
- **Quand les messages privés arriveront** (jalon 4), les boutons qui mènent ici ouvriront directement un message privé. Cette page pourra alors disparaître, ou ne garder que le lien Discord.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Pas de lien Discord dans `config.json`** : le bouton n'apparaît pas.
- **Une personne sans téléphone** : les boutons Appeler et SMS sont grisés.
- **Pas encore d'hébergeur désigné** : la section Hébergeurs n'apparaît pas.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Mes repas](../repas/mes-repas.md)
<!-- /nav -->
