<!-- nav -->
[Précédent : Contacter le staff](../communaute/contact-staff.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Repas > Mes repas

- **Priorité** : 2
- **Statut** : décrite

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
1. **Mes repas** : une ligne par jour de ma présence, trois cases (matin, midi, soir). Seuls les créneaux compris dans mes dates de [Présence](../gite/presence.md) sont proposés. En dessous, mon total de repas pris.
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
**Dans `data/repas.json`** : seulement les **repas décochés**, une ligne par repas (compte, date, créneau, date de la modification). Tout repas de ma présence qui n'y figure pas est pris.

**Ce qui est lu ailleurs** :
- mes dates, dans [Présence](../gite/presence.md) ;
- les régimes et les allergies, dans [Ma fiche](../compte/ma-fiche.md).

**Ce qui est lu ici** : [Dépenses](../budget/depenses.md) (le nombre de repas pris par chacun, pour la catégorie au prorata des repas).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Par défaut, je mange sur la réserve** à chaque repas de ma présence. Je n'ai rien à faire si je mange avec tout le monde.
- **Un repas se modifie jusqu'à ce qu'il commence** : avant 8 h pour le matin, 12 h pour le midi, 19 h pour le soir. Ensuite il est figé : c'est « qui a mangé, et quand ».
- **Mes repas pris** = les créneaux matin, midi et soir de ma présence, moins ceux que j'ai décochés.
- **Les dépenses déjà validées ne bougent pas** : leurs parts sont figées au moment de la validation (voir [Dépenses](../budget/depenses.md)).
- **Le réveillon et les repas organisés à part** relèvent de la page [Événements repas](repas.md), au jalon 3.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Modifier un repas déjà commencé ou passé** : refusé, la case est figée.
- **Je change mes dates dans Présence** : les repas hors de mes nouvelles dates disparaissent, et ceux que j'avais décochés avec. Les nouveaux repas sont pris par défaut.
- **Je ne viens plus** : je n'ai plus aucun repas.
- **Personne ne mange sur la réserve à un repas** : rien de spécial, la case du groupe affiche 0.
- **Une dépense Alimentaire validée alors que personne n'a pris de repas** : l'envoi est refusé, faute de concernés (voir [Dépenses](../budget/depenses.md)).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Les heures limites** (8 h, 12 h, 19 h) : à ajuster, ou à mettre dans `config.json` ?

<!-- nav -->
[Menu](../../README.md#les-pages)
<!-- /nav -->
