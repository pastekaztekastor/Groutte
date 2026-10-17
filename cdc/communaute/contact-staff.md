<!-- nav -->
[Précédent : Validation des dépenses](../staff/validation-depenses.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Communauté > Contacter le staff


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Une page provisoire, **en attendant les messages privés** ([Messages](messages.md), jalon 4) : comment joindre le staff et les hébergeurs.
- **Envoyer un message court à tout le staff** : une notification de 40 caractères au plus, pour une urgence ou un « appelle-moi ». C'est l'inverse d'[Annonces](../staff/annonces.md).
- Tous les boutons du jalon 2 qui devaient ouvrir un message privé mènent ici : « Demander à l'hébergeur » ([Présence](../gite/presence.md)), « Demander un arrangement » et le contact de l'hébergeur ([Créances](../budget/creances.md)), la notification de date limite de paiement.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Tous les ploucs**, y compris une inscription tardive pas encore acceptée.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Le Discord de gestion** : un bouton qui ouvre le lien d'invitation du serveur Discord actuel.
2. **Les hébergeurs** : photo, nom, et les boutons **Appeler** et **SMS**.
3. **Le staff** : la même chose, pour chaque membre du staff.
4. **Prévenir le staff** : un champ de 40 caractères au plus, avec le compteur, et le bouton **Envoyer au staff**.

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
├─ Prévenir le staff ───────────────────────┤
│ [Appelle-moi, c'est pour les clés]  33/40 │
│                       [Envoyer au staff]  │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Ouvrir le Discord** : ouvre le lien dans l'appli Discord ou le navigateur.
- **Appeler**, **SMS** : comme dans le [Carnet d'adresses](../compte/carnet.md).
- **Toucher une personne** : ouvre sa fiche dans le Carnet d'adresses.
- **Envoyer au staff** : une notification part vers tous les staffs, « Groutte - Bob : Appelle-moi, c'est pour les clés ». La toucher ouvre la fiche de Bob dans le Carnet d'adresses, pour l'appeler. Elle est gardée dans les [Pings reçus](pings.md) de chaque staff.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Le lien du Discord de gestion**, dans `config.json` (`discord_gestion`), modifié par le webmaster.
- **Les hébergeurs**, dans [Gîte et salle](../staff/gite-salle.md).
- **Le staff**, dans `data/comptes.json`.
- **Les téléphones**, dans [Ma fiche](../compte/ma-fiche.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Une personne qui est hébergeur et staff** n'apparaît qu'une fois, dans Hébergeurs.
- **Un message au staff par heure et par personne**, au plus. Il n'y a pas de réponse dans l'appli : le staff rappelle, ou répond sur Discord.
- **Quand les messages privés arriveront** (jalon 4), les boutons qui mènent ici ouvriront directement un message privé. Cette page pourra alors disparaître, ou ne garder que le lien Discord.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Tous les staffs**, quand un plouc envoie un message au staff. Elle est toujours reçue, comme une annonce.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Pas de lien Discord dans `config.json`** : le bouton n'apparaît pas.
- **Une personne sans téléphone** : les boutons Appeler et SMS sont grisés.
- **Pas encore d'hébergeur désigné** : la section Hébergeurs n'apparaît pas.
- **Un message vide, ou de plus de 40 caractères** : refusé.
- **Un deuxième message dans l'heure** : refusé, avec le temps à attendre.
- **Un membre muet** peut quand même prévenir le staff : c'est le seul moyen, dans l'appli, de parler de sa sanction.
- **Un staff qui envoie au staff** : il ne reçoit pas son propre message.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Mes repas](../repas/mes-repas.md)
<!-- /nav -->
