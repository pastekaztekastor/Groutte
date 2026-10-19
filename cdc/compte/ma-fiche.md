<!-- nav -->
[Précédent : Inscription et connexion](../compte/inscription.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Compte > Ma fiche


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Les infos de chacun : qui je suis, comment me joindre, ce que je mange, ce à quoi je participe, et mes rôles.
- Elle nourrit :
  - le [Carnet d'adresses](carnet.md) ;
  - le budget, par les catégories auxquelles je participe ;
  - les repas et le [Menu](../repas/menu.md), par les allergies et les régimes ;
  - les [Lits](../gite/lits.md), par la literie que j'apporte ;
  - la [Drop box](../dropbox/photos-videos.md), par le consentement photo.
- On arrive ici juste après la création du compte ([Inscription](inscription.md)).

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chacun modifie sa propre fiche**, et seulement la sienne.
- **Le nom** ne se modifie pas ici : c'est le staff qui le corrige, dans [Staff > Comptes](../staff/comptes.md), parce qu'il sert d'identifiant partout.
- **Tous les ploucs voient** :
  - l'identité, le contact et les rôles, dans le carnet d'adresses ;
  - les allergies et les régimes, pour ceux qui cuisinent ;
  - les catégories auxquelles chacun participe, puisqu'elles expliquent les parts dans Mes comptes.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
Une liste groupée, comme les Réglages de l'iPhone. Chaque groupe a son titre :

1. **Identité** :
   - la photo, qu'on touche pour la changer ;
   - le nom, en lecture seule ;
   - le prénom ;
   - le pseudo.
2. **Contact** : Discord, téléphone.
3. **Ce que je partage** : la liste des catégories créées par le staff dans [Réglages compta](../staff/reglages-compta.md).
   - **Catégories obligatoires** : affichées sans case à cocher, avec la mention « Tu participes d'office » (Alimentaire, par exemple).
   - **Catégories facultatives** : une case à cocher par catégorie (Monster, Alcool, par exemple). Cochée, je participe à ces dépenses.
   - **Si je ne coche pas Alcool**, un encart s'affiche sous la catégorie : « Tu ne bois pas ? Propose-toi SAM pour un soir, et merci d'avance : grâce à toi, tout le monde rentre en sécurité. » Le SAM se décide ensuite de vive voix (la page [SAM](../gite/sam.md) est reportée).
4. **Alimentation** :
   - les régimes : une case par régime (végétarien, végan, sans gluten, sans lactose, sans porc…) ;
   - les allergies : un texte libre.
5. **Couchage** : ce que j'apporte pour dormir.
   - **Matelas** : un nombre, ou « non renseigné ».
   - **Duvets** (ou couettes, couvertures) : un nombre, ou « non renseigné ».
   - Le texte d'aide : « Un matelas gonflable 2 places compte pour 2 matelas si tu es d'accord pour le partager. Ce que tu apportes n'est compté que les nuits où tu es là. »
6. **Photos et vidéos** : « D'accord pour apparaître sur les photos et vidéos », oui ou non.
7. **Tournois** : une case par tournoi auquel je participe. La liste viendra des pages [Tournois](../tournois/jeux.md) (voir Questions ouvertes).
8. **Mes rôles** :
   - les rôles de type `libre` de `roles.json` (cuisine, ménage, permis, véhicule, fumeur… voir le [README](../../README.md#rôles-rolesjson)) : une case à cocher par rôle ;
   - les rôles `staff` et `automatique` que j'ai : affichés, sans pouvoir les modifier.

```
Ma fiche
┌─ Identité ────────────────────────────────┐
│ (photo)  Bob                    Changer > │
│ Prénom                         Robert     │
│ Pseudo                         Bobby      │
├─ Contact ─────────────────────────────────┤
│ Discord                        bob#1234   │
│ Téléphone                      06…        │
├─ Ce que je partage ───────────────────────┤
│ Alimentaire          Tu participes d'office│
│ Monster                             [x]   │
│ Alcool                              [ ]   │
├─ Alimentation ────────────────────────────┤
│ Végétarien [ ]  Sans gluten [ ]  …        │
│ Allergies     arachides                   │
├─ Couchage ────────────────────────────────┤
│ Matelas                    [1 ▾]          │
│ Duvets                     [non renseigné▾]│
├─ Mes rôles ───────────────────────────────┤
│ Cuisine [x]  Média [ ]                    │
│ Clés (attribué par le staff)              │
└───────────────────────────────────────────┘
```

Le thème et le mode sombre restent dans **Réglages**, comme dans le squelette, avec la photo et la déconnexion. Ma fiche ne contient que des infos sur la personne.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Modifier un champ** : chaque champ s'enregistre dès qu'on le quitte, comme les réglages d'un téléphone. Il n'y a pas de bouton « Enregistrer ».
- **Cocher ou décocher une catégorie facultative** : je participe, ou non, aux dépenses de cette catégorie (voir Règles et calculs).
- **Cocher ou décocher un rôle libre.**
- **Changer la photo** : comme dans le squelette, avec la photo recadrée et un aperçu léger.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/profils.json`**, pour chaque compte :
- la photo ;
- le prénom ;
- le pseudo ;
- Discord ;
- le téléphone ;
- les catégories facultatives cochées (leurs identifiants) ;
- les régimes cochés ;
- les allergies (texte) ;
- la literie apportée : le nombre de matelas et le nombre de duvets, chacun vide tant qu'il n'est pas renseigné ;
- le consentement photo (oui ou non) ;
- les tournois cochés (leurs identifiants).

**Dans `data/comptes.json`** (voir [Staff > Comptes](../staff/comptes.md)) : le nom et les rôles.

**Ce qui est lu ailleurs** :
- les catégories et leur type (obligatoire ou facultative), dans [Réglages compta](../staff/reglages-compta.md) ;
- la liste des rôles et leur type, dans `roles.json` ;
- la liste des régimes proposés, dans `config.json`.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Chaque catégorie** est **obligatoire** ou **facultative** : c'est le staff qui le décide, dans Réglages compta.
  - **Obligatoire** : tout le monde y participe, selon la règle de répartition de la catégorie (par exemple, Alimentaire au prorata des repas).
  - **Facultative** : seuls ceux qui ont coché la catégorie dans leur fiche y participent.
- **L'invitation à être SAM** s'affiche pour la catégorie marquée « propose d'être SAM » dans [Réglages compta](../staff/reglages-compta.md) (Alcool), quand elle n'est pas cochée. Ce n'est qu'une invitation : rien n'est imposé.
- **Par défaut**, les catégories facultatives sont **décochées**. On participe parce qu'on l'a choisi, pas par oubli.
- **Changer une coche ne vaut que pour la suite.** Les concernés et les parts d'une dépense sont figés au moment où elle est validée (voir [Dépenses](../budget/depenses.md)). Si je décoche Monster le 30, je paie quand même les Monster des dépenses validées avant.
- **Le consentement photo est une simple information.** Il n'empêche aucun envoi ni aucun affichage :
  - il est affiché dans le carnet d'adresses ;
  - il est rappelé dans la Drop box, avec la liste des personnes qui préfèrent ne pas apparaître, au moment d'envoyer des photos.
- **On ne demande pas de quantités** (combien de Monster par jour, par exemple). Pour prévoir les achats, on s'appuie sur les années précédentes ([Prévisionnel](../staff/previsionnel.md)).
- **La literie** : « non renseigné » n'est pas zéro. Zéro veut dire « je n'apporte rien », « non renseigné » veut dire « je n'ai pas encore répondu ». Les deux comptent pour zéro dans le stock de [Lits](../gite/lits.md), mais seuls les « non renseigné » sont signalés, et visés par le filtre d'[Annonces](../staff/annonces.md).
- **Seul le nom est obligatoire**, et il est donné à l'inscription. Tant que le prénom ou le téléphone manquent, un bandeau invite à compléter la fiche.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Une catégorie facultative cochée par personne** : une dépense de cette catégorie n'aurait aucun concerné. L'envoi de la dépense est refusé, avec un message qui propose « Non géré » ou une autre catégorie (voir [Dépenses](../budget/depenses.md)).
- **Le staff supprime une catégorie** que des personnes avaient cochée : si au moins une dépense l'utilise, sa case reste dans la fiche, pour que chacun voie pourquoi il a payé. Sinon, elle disparaît. Les dépenses déjà validées ne changent pas (voir [Réglages compta](../staff/reglages-compta.md)).
- **Le staff fait passer une catégorie de facultative à obligatoire** : tout le monde y participe à partir de ce moment.
- **Un nombre de matelas ou de duvets négatif** est refusé.
- **Un téléphone mal formé** est refusé (seulement des chiffres, des espaces et un « + » au début).
- **Un membre muet** peut toujours modifier sa fiche.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **La liste des tournois** auxquels on peut s'inscrire depuis la fiche : elle n'est pas encore connue. Elle sera définie avec les pages Tournois.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Me rembourser](../compte/me-rembourser.md)
<!-- /nav -->
