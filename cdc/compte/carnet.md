<!-- nav -->
[Précédent : Notifications](../compte/notifications.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Compte > Carnet d'adresses

- **Priorité** : 1
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Joindre quelqu'un vite, et savoir qui fait quoi : qui a les clés, qui a le permis, qui est l'hébergeur.
- **On reprend les Personnages de NextSession** :
  - le répertoire par ordre alphabétique, regroupé par lettre (`blocPersos()` dans `campagne.js`) ;
  - la fiche d'un autre joueur, façon Contacts de l'iPhone, avec ses boutons Appeler et Message (`#joueur/<nom>`).

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Tous les ploucs** voient le carnet en entier.
- **Personne ne modifie rien ici** : chacun remplit sa propre [Ma fiche](ma-fiche.md), et le staff attribue les rôles dans [Staff > Comptes](../staff/comptes.md).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**Le répertoire** (`#carnet`), de haut en bas :
1. **Une recherche** sur le nom, le prénom ou le pseudo, sans tenir compte des accents.
2. **Des filtres par rôle**, en puces à toucher : Permis, Véhicule, Clés, Cuisine… On en active plusieurs, et la liste ne garde que ceux qui ont tous ces rôles. Exemple : « qui a le permis et une voiture ? ».
3. **Contacts utiles**, toujours en haut : les hébergeurs, la personne qui a les clés, puis le staff.
4. **Tout le monde**, par ordre alphabétique, regroupé par lettre comme le répertoire de NextSession. Chaque ligne affiche :
   - la photo ;
   - le nom et le pseudo ;
   - les rôles, en petits badges.

```
Carnet d'adresses
┌───────────────────────────────────────────┐
│ Rechercher…                               │
│ (Permis) (Véhicule) (Clés) (Cuisine) …    │
├─ Contacts utiles ─────────────────────────┤
│ (o) Alice  Hébergeur · Staff          >   │
│ (o) David  Clés                       >   │
├─ A ───────────────────────────────────────┤
│ (o) Alice « Lili »  Hébergeur · Permis >  │
├─ B ───────────────────────────────────────┤
│ (o) Bob « Bobby »   Cuisine · Fumeur  >   │
└───────────────────────────────────────────┘
```

**La fiche d'une personne** (`#carnet/<nom>`), façon Contacts de l'iPhone, comme dans NextSession :
1. **En tête** : une grande photo, le nom, le prénom, le pseudo et les badges des rôles.
2. **Trois boutons ronds** : **Appeler**, **SMS** et **Message**. Message ouvre un message privé dans l'appli.
3. **Une ligne par info**, avec son icône :
   - le téléphone ;
   - Discord ;
   - le régime et les allergies ;
   - les catégories partagées (Monster, Alcool…) ;
   - les tournois ;
   - « Préfère ne pas apparaître sur les photos », si c'est le cas.

Il n'y a pas d'adresse ni de bouton Itinéraire, contrairement à NextSession : tout le monde vient au même gîte.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Rechercher**, et **filtrer par rôle**.
- **Toucher une ligne** : ouvre la fiche de la personne, dans un écran poussé avec la flèche retour.
- **Appeler** : lien `tel:`, qui ouvre l'appel sur le téléphone.
- **SMS** : lien `sms:`.
- **Message** : ouvre une conversation privée avec la personne ([Messages](../communaute/messages.md)).
- **Discord** : copie le pseudo Discord. Discord ne permet pas d'ouvrir un profil à partir d'un pseudo.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Rien n'est enregistré ici.** Tout vient d'ailleurs :
  - l'identité, le contact, l'alimentation, les catégories, les tournois et le consentement photo : [Ma fiche](ma-fiche.md) (`data/profils.json`) ;
  - le nom, les rôles, le droit staff et si le compte est désactivé : `data/comptes.json` ;
  - le nom et le type des rôles : `roles.json` ;
  - les hébergeurs : [Gîte et salle](../staff/gite-salle.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le tri** se fait par nom, sans tenir compte des majuscules ni des accents.
- **Les contacts utiles**, dans l'ordre : les hébergeurs, puis les rôles Clés, puis le staff. Une personne qui a plusieurs de ces rôles n'apparaît qu'une fois, à sa place la plus haute.
- **Un rôle automatique** (Hébergeur) s'affiche comme les autres badges.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Une info non renseignée** : sa ligne n'est pas affichée. Sans téléphone, les boutons Appeler et SMS sont grisés.
- **Un compte désactivé** n'apparaît pas dans le carnet.
- **Un membre muet** apparaît normalement, mais le bouton Message est grisé : il ne peut pas répondre (voir [Staff > Comptes](../staff/comptes.md)).
- **Ma propre fiche** : toucher ma ligne ouvre [Ma fiche](ma-fiche.md), pour la modifier.
- **Aucun résultat** pour la recherche ou les filtres : « Personne ne correspond », avec un bouton pour retirer les filtres.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Forum](../communaute/forum.md)
<!-- /nav -->
