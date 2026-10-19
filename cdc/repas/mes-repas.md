<!-- nav -->
[Précédent : Contacter le staff](../communaute/contact-staff.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Repas > Mes repas


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Dire quels repas je prends sur la **réserve communautaire** (les courses du groupe), et voir combien on est à chaque repas.
- C'est aux repas ce que [Présence](../gite/presence.md) est aux nuits : la catégorie Alimentaire se répartit **au prorata des repas pris** (voir [Dépenses](../budget/depenses.md)).
- Ceux qui cuisinent savent combien de bouches nourrir, et quels régimes respecter.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** coche ou décoche ses propres repas, et voit le tableau de tout le groupe. Les membres du staff font de même, en tant que ploucs.
- **Personne ne modifie les repas d'un autre**, pas même le staff.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Mes repas** : une ligne par jour de ma présence, trois cases (matin, midi, soir). Seuls les créneaux compris dans mes dates de [Présence](../gite/presence.md) sont proposés, et seuls les repas **gérés par la communauté** sont modifiables (voir Règles et calculs) : les autres colonnes sont grisées. En dessous, mon total de repas pris.
2. **Le groupe** : une ligne par jour, une colonne par repas, avec le nombre de ploucs qui mangent sur la réserve. Toucher une case donne la liste des noms, et le résumé de leurs régimes et allergies ([Ma fiche](../compte/ma-fiche.md)).
3. Un lien « Comment ça marche ? » vers la [FAQ du budget](../budget/comment-ca-marche.md), à la question « J'ai mangé ailleurs : pourquoi je paie ? ».

```
┌───────────────────────────────────────────┐
│ Mes repas            Matin  Midi  Soir    │
│ 28/12                  –     –    [x]     │
│ 29/12                 [x]   [ ]   [x]     │
│ 30/12                 [x]   [x]   [x]     │
│ 31/12 (passé)         [x]    ·     ·      │
│ 6 repas sur la réserve                    │
├─ Le groupe ───────────────────────────────┤
│                      Matin  Midi  Soir    │
│ 29/12                  9     6    11      │
│ 30/12                 11    11    11  >   │
│   2 végétariens · 1 sans gluten           │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Décocher un repas** : je ne le prends pas sur la réserve (resto, repas chez quelqu'un, je saute le repas). L'enregistrement est immédiat.
- **Recocher un repas** : je le prends de nouveau.
- **Toucher une case du groupe** : la liste des mangeurs de ce repas, avec leurs régimes et allergies.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/repas.json`** : seulement les repas **qui s'écartent du défaut**, une ligne par repas (compte, date, créneau, pris ou non, date de la modification). Un repas géré de ma présence qui n'y figure pas suit le défaut de son créneau.

**Ce qui est lu ailleurs** :
- mes dates, dans [Présence](../gite/presence.md) ;
- les régimes et les allergies, dans [Ma fiche](../compte/ma-fiche.md) ;
- les repas gérés par la communauté, et leur défaut, dans [Réglages compta](../staff/reglages-compta.md).

**Ce qui est lu ici** : [Dépenses](../budget/depenses.md) (le nombre de repas pris par chacun, pour la catégorie au prorata des repas), et [Menu](menu.md) (les mangeurs de chaque repas). **Menu écrit aussi ici** (voir Règles et calculs).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les repas gérés par la communauté** se règlent dans [Réglages compta](../staff/reglages-compta.md) : pour chaque créneau (matin, midi, soir), s'il est géré, et s'il est coché par défaut. Par défaut, seul le soir est géré, et il est coché.
  - **Un repas géré** se coche et se décoche ici. Il compte dans les repas pris s'il est coché.
  - **Un repas Non géré** est grisé, et ne compte jamais dans les repas pris : chacun se débrouille (les restes, dehors). Les restes ont été payés par ceux qui ont mangé le repas d'avant : on ne compte rien de plus.
- **Par défaut, je mange sur la réserve** à chaque repas géré coché par défaut. Je n'ai rien à faire si je mange avec tout le monde.
- **Un repas se modifie jusqu'à ce qu'il commence** : avant 8 h pour le matin, 12 h pour le midi, 19 h pour le soir. Ensuite il est figé : c'est « qui a mangé, et quand ».
- **Mes repas pris** = les repas gérés de ma présence qui sont cochés.
- **Les dépenses déjà validées ne bougent pas** : leurs parts sont figées au moment de la validation (voir [Dépenses](../budget/depenses.md)).
- **Le réveillon et les plats cuisinés ensemble** s'annoncent dans [Menu](menu.md), qui parle de la même chose :
  - m'inscrire à un menu coche le repas ici ;
  - me désinscrire du dernier menu où j'étais inscrit pour ce repas le décoche ;
  - décocher le repas ici me désinscrit de tous ses menus.
- **Un resto** ne passe pas par Menu : je décoche simplement le repas.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Modifier un repas déjà commencé ou passé** : refusé, la case est figée.
- **Je change mes dates dans Présence** : les repas hors de mes nouvelles dates disparaissent, avec mes coches et mes inscriptions aux menus. Les nouveaux repas suivent le défaut de leur créneau.
- **Le staff change les repas gérés ou leur défaut** : seuls les repas pas encore commencés changent. Les dépenses déjà validées ne bougent pas.
- **Je ne viens plus** : je n'ai plus aucun repas.
- **Personne ne mange sur la réserve à un repas** : rien de spécial, la case du groupe affiche 0.
- **Une dépense Alimentaire validée alors que personne n'a pris de repas** : l'envoi est refusé, faute de concernés (voir [Dépenses](../budget/depenses.md)).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Réglages LLM](../staff/reglages-llm.md)
<!-- /nav -->
