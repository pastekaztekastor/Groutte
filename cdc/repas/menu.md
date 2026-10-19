<!-- nav -->
[Précédent : Réglages LLM](../staff/reglages-llm.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Repas > Menu

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Annoncer à l'avance ce qu'on va cuisiner pour le groupe : « Le premier soir, je fais un pâté aux patates ». Chacun dit s'il en mange, pour que le cuisinier sache combien de parts prévoir.
- **Seuls les repas cuisinés par la communauté, avec la réserve de la communauté**, passent par ici. Le **réveillon** est un menu comme les autres. **Les restos** n'en sont pas : on décoche simplement le repas dans [Mes repas](mes-repas.md).
- C'est une **note d'intention** pour s'organiser. Il n'y a pas d'argent ici : les ingrédients s'achètent et se partagent par [Dépenses](../budget/depenses.md), comme les autres courses.
- Cette page remplace l'ancienne « Événements repas ».

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** voit tous les menus, en propose, et s'inscrit à ceux qu'il veut manger. Les membres du staff font de même, en tant que ploucs.
- **Seul l'auteur** modifie ou supprime son menu. **Le staff n'y touche pas.**
- **Un membre muet** peut proposer un menu et s'inscrire : le mode muet ne touche que le forum et les messages.
- **Une inscription tardive pas encore acceptée** n'a pas de dates : elle voit les menus, mais ne propose rien et ne s'inscrit à rien.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Un texte d'aide**, court : « Ici, les repas cuisinés ensemble avec la réserve. Un resto ? Décoche le repas dans Mes repas. »
2. **La liste des menus**, dans l'ordre chronologique du **repas visé** (pas de la date de création) : un menu pour le 28 au soir proposé en dernier apparaît quand même en premier. Pour un même repas, les menus sont dans l'ordre de création.
   - Chaque ligne : le repas visé, le nom du plat, le nombre d'inscrits sur le nombre de mangeurs, et ma case **J'en mange**.
   - Une pastille ⚠ si le plat ne convient pas à quelqu'un qui mange ce repas.
   - **Les menus passés** restent dans la liste, grisés, sans case à cocher.
3. **Le détail d'un menu**, en touchant sa ligne : l'auteur, le plat, les régimes auxquels il convient, le matos et les ingrédients, la liste des inscrits, et ceux à qui il ne convient pas.
4. **La bulle « + »** en bas à droite, pour proposer un menu.

```
Menu
┌───────────────────────────────────────────┐
│ ⓘ Les repas cuisinés ensemble avec la     │
│   réserve. Un resto ? Décoche le repas    │
│   dans Mes repas.                         │
├───────────────────────────────────────────┤
│ 28/12 soir  Pâté aux patates    9/14  [x] │
│             (Paul)                   ⚠    │
│ 29/12 soir  Tartiflette        11/15  [ ] │
│ 29/12 soir  Salade de lentilles 3/15  [x] │
│ 31/12 soir  Réveillon           2/16  [ ] │
└───────────────────────────────────────────┘
                                        (+)
```

**L'écran de création** :
- **Le plat** : un texte, obligatoire (« Pâté aux patates »).
- **Le repas visé** : une date et un créneau, parmi les repas gérés par la communauté (voir Règles et calculs) et ceux où je suis présent.
- **Il convient à** : une case par régime de `config.json` (Végétarien, Végan, Sans gluten, Sans lactose, Sans porc, Halal, Casher). **Toutes décochées par défaut** : l'auteur coche ce qui convient. S'il oublie, l'appli signale trop, mais ne rate rien.
- **Le matos dont j'ai besoin** : un texte, facultatif (« 3 plats à tarte »).
- **Les ingrédients** : un texte, facultatif (« 10 kg de patates »).
- **En direct, pendant la saisie** :
  - « ⚠ Ne convient pas à : Karim (Halal), Léa (Végétarienne) », calculé avec les régimes cochés et ceux des mangeurs de ce repas ;
  - les allergies des mangeurs de ce repas, telles qu'ils les ont écrites dans [Ma fiche](../compte/ma-fiche.md) ;
  - « Léo propose déjà une tartiflette pour ce repas », s'il y a déjà un menu.

```
Proposer un menu
┌───────────────────────────────────────────┐
│ Plat     [Pâté aux patates             ]  │
│ Repas    [28/12 ▾] [Soir ▾]               │
│ Convient à                                │
│ [x] Végétarien  [ ] Végan  [x] Sans porc  │
│ [ ] Halal  [ ] Casher  [x] Sans lactose … │
│ Matos       [3 plats à tarte           ]  │
│ Ingrédients [10 kg de patates          ]  │
│ ⚠ Ne convient pas à : Karim (Halal)       │
│ Allergies : Léa (arachides)               │
│ ⓘ Halal n'est pas Sans porc : un bœuf     │
│   non halal ne convient pas à Halal.      │
│                             [Proposer]    │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Proposer un menu** : il apparaît dans la liste, et tous les ploucs sont prévenus. L'auteur n'est pas inscrit d'office : il coche « J'en mange » comme les autres.
- **J'en mange** (cocher) : je suis inscrit à ce menu, et ce repas est **coché dans [Mes repas](mes-repas.md)** (voir Règles et calculs).
- **J'en mange** (décocher) : je ne suis plus inscrit à ce menu. Si je ne suis plus inscrit à aucun menu de ce repas, le repas est **décoché dans Mes repas**.
- **Modifier** (l'auteur) : tous les champs, y compris le repas visé. Les inscrits sont prévenus. S'il change de repas, les inscriptions sont retirées, et les inscrits sont prévenus.
- **Supprimer** (l'auteur), avec une confirmation : les inscrits sont prévenus. Leurs repas restent tels quels dans Mes repas.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/menus.json`**, une ligne par menu :
- son identifiant ;
- l'auteur ;
- le repas visé : date + créneau ;
- le plat ;
- les régimes auxquels il convient ;
- le matos et les ingrédients (textes) ;
- les inscrits ;
- la date de création et de dernière modification.

**Ce qui est lu ailleurs** :
- les présences, dans [Présence](../gite/presence.md) ;
- les repas pris, dans [Mes repas](mes-repas.md), qu'on modifie aussi depuis ici ;
- les repas gérés par la communauté, dans [Réglages compta](../staff/reglages-compta.md) ;
- les régimes et les allergies, dans [Ma fiche](../compte/ma-fiche.md) ;
- la liste des régimes, dans `config.json`.

**Ce qui est lu ici** : le rôle automatique **Chef** (`roles.json`, source `menu`) : celui qui a au moins un menu, passé ou à venir, a le rôle.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les repas qu'on peut viser** sont ceux que le staff a déclarés gérés par la communauté dans [Réglages compta](../staff/reglages-compta.md). Par exemple, si seul le soir est géré, on ne propose que des menus du soir.
- **Menu et Mes repas parlent de la même chose** : manger ce repas avec la réserve.
  - S'inscrire à un menu coche le repas dans Mes repas.
  - Se désinscrire du dernier menu où j'étais inscrit pour ce repas le décoche.
  - Décocher le repas dans Mes repas me désinscrit de tous les menus de ce repas.
  - Cocher le repas dans Mes repas ne m'inscrit à aucun menu : je mange, sans avoir choisi de plat.
- **Inscrits / mangeurs** : « 9/14 » = 9 inscrits à ce menu, sur 14 ploucs qui mangent ce repas d'après Mes repas. Une personne à qui le plat ne convient pas compte quand même parmi les 14.
- **Plusieurs menus pour le même repas** : c'est permis (deux plats, une entrée et un plat…). On peut s'inscrire à plusieurs.
- **« Ne convient pas à »** : un mangeur de ce repas a un régime que l'auteur n'a pas coché dans « Il convient à ». Les allergies sont affichées, mais jamais comparées automatiquement : c'est un texte libre.
- **Une inscription suit les mêmes heures que Mes repas** : elle se modifie jusqu'au début du repas (8 h, 12 h, 19 h, dans `config.json`), puisque c'est la même donnée.
- **Le cuisinier doit être présent** au repas qu'il vise, et **on ne s'inscrit qu'aux repas où l'on est présent**.
- **L'argent** : les ingrédients sont des courses de la communauté. On les saisit dans [Dépenses](../budget/depenses.md), en mode communauté, catégorie Alimentaire. Elles se répartissent au prorata des repas pris dans Mes repas, **pas** selon les inscrits du menu.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Dans la catégorie Repas (voir [Notifications](../compte/notifications.md)) :
- **Tous les ploucs qui viennent**, quand un menu est proposé : « Paul propose un pâté aux patates le 28/12 au soir ».
- **L'auteur**, quand on s'inscrit ou se désinscrit, en un message groupé qui remplace le précédent : « Pâté aux patates : 12 inscrits (+3) ».
- **Les inscrits**, quand le menu est modifié ou supprimé.
- **Les inscrits**, quand l'auteur n'est plus présent à ce repas (voir Cas limites).

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
Sont refusés :
- un menu sans plat ;
- un menu sur un repas qui n'est pas géré par la communauté ;
- un menu sur un repas où l'auteur n'est pas présent ;
- une inscription à un repas où je ne suis pas présent ;
- une inscription, ou une désinscription, après le début du repas.

Et aussi :
- **Je change mes dates dans Présence** : mes inscriptions hors de mes nouvelles dates sont retirées, comme mes repas dans Mes repas.
- **L'auteur change ses dates** et n'est plus là pour son repas : le menu reste, avec « ⚠ Paul n'est plus présent ce jour-là », et les inscrits sont prévenus. À lui de le supprimer ou de le déplacer.
- **Le staff retire un créneau des repas gérés** alors que des menus le visent : les menus restent, marqués « Ce repas n'est plus géré par la communauté ».
- **L'auteur ne coche aucun régime** dans « Il convient à » : accepté. Le plat est alors signalé à tous ceux qui ont un régime.
- **Personne ne mange ce repas** : « 0/0 ».

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Suivi des dépenses](../staff/suivi-depenses.md)
<!-- /nav -->
