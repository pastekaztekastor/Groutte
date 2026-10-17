<!-- nav -->
[Précédent : Gîte et salle](../staff/gite-salle.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Staff > Réglages compta


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Gérer les catégories de dépenses, le mode de remboursement, les repas gérés par la communauté, et la clôture des comptes.
- Le nom n'est pas tout à fait juste, mais c'est celui qu'on utilise entre nous. Le LLM est à part, dans [Réglages LLM](reglages-llm.md).

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs voient le résultat dans [Ma fiche](../compte/ma-fiche.md), [Dépenses](../budget/depenses.md), [Mes comptes](../budget/mes-comptes.md), [Flux](../budget/flux.md) et [Comment ça marche](../budget/comment-ca-marche.md).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Le mode de remboursement** : un choix à deux positions, *Direct* ou *Minimum de virements*, avec un lien vers la question correspondante de [Comment ça marche](../budget/comment-ca-marche.md).
2. **Les catégories** : une ligne par catégorie, avec son nom, son type, sa règle de répartition, et le repère SAM s'il est coché. Toucher une ligne l'ouvre pour la modifier.
   - **NON GÉRÉ** est toujours en bas, sans bouton de modification.
   - Un bouton **Ajouter une catégorie**.
3. **Les catégories supprimées** encore utilisées par des dépenses, repliées, pour mémoire.
4. **Les repas gérés par la communauté** : une ligne par créneau (matin, midi, soir), avec deux cases, **Géré** et **Coché par défaut** (voir [Mes repas](../repas/mes-repas.md)).
5. **La clôture des comptes**, tout en bas, à part : le bouton **Clôturer les comptes**, ou la date de clôture si c'est fait.

```
┌───────────────────────────────────────────┐
│ Remboursement                             │
│ (o) Direct   ( ) Minimum de virements     │
│ Quelle différence ? >                     │
├─ Catégories ──────────────────────────────┤
│ Alimentaire  obligatoire  prorata repas  >│
│ Monster      facultative  prorata nuits  >│
│ Alcool       facultative  parts égales 🚗 >│
│ NON GÉRÉ     le payeur seul               │
│                     [+ Ajouter catégorie] │
├───────────────────────────────────────────┤
│ > Supprimées, encore utilisées (0)        │
├─ Repas gérés ─────────────────────────────┤
│ Matin   [ ] géré   [ ] coché par défaut   │
│ Midi    [ ] géré   [ ] coché par défaut   │
│ Soir    [x] géré   [x] coché par défaut   │
├─ Clôture ─────────────────────────────────┤
│                  [Clôturer les comptes]   │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Changer le mode de remboursement**, avec une confirmation : les listes « Je dois » et « On me doit » de Mes comptes sont recalculées à partir des soldes. Les soldes eux-mêmes ne changent pas.
- **Ajouter une catégorie** : un nom, un type, une règle de répartition, et pour une catégorie facultative la case « Propose d'être SAM ».
- **Modifier une catégorie** : les mêmes champs. Le changement ne vaut que pour les dépenses validées après.
- **Supprimer une catégorie**, avec une confirmation. Elle n'est plus proposée dans les nouvelles dépenses (voir Règles et calculs).
- **Changer les repas gérés** : cocher ou décocher Géré et Coché par défaut pour un créneau. Seuls les repas pas encore commencés changent, dans [Mes repas](../repas/mes-repas.md) et [Menu](../repas/menu.md).
- **Clôturer les comptes**, après le séjour, avec une confirmation où l'on retape le mot « CLÔTURER ». C'est irréversible. Ce que la clôture fige est décrit dans [Mes comptes](../budget/mes-comptes.md).
- Chaque action est inscrite dans le journal du staff (voir [Staff > Comptes](comptes.md)).

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Les catégories** sont dans un fichier JSON dédié, `data/categories.json`. Rien n'est écrit en dur dans le code. Chacune a :
- un identifiant et un nom ;
- un type : **obligatoire** (tout le monde y participe) ou **facultative** (seuls ceux qui la cochent dans [Ma fiche](../compte/ma-fiche.md)) ;
- une règle de répartition : à parts égales, au prorata des repas pris sur la réserve ([Mes repas](../repas/mes-repas.md)), ou au prorata des nuits ([Présence](../gite/presence.md)) ;
- pour une catégorie facultative, une case **« Propose d'être SAM »** : ceux qui ne la cochent pas sont invités à se proposer SAM, dans Ma fiche ;
- si elle est supprimée : la date de suppression.

**Les catégories de base**, au premier démarrage. On les ajustera à l'usage :

| Catégorie | Type | Répartition | SAM |
| --- | --- | --- | --- |
| Alimentaire | obligatoire | au prorata des repas | - |
| Monster | facultative | au prorata des nuits | non |
| Alcool | facultative | à parts égales | oui |
| NON GÉRÉ | spéciale | le payeur seul | - |

**Dans `data/reglages-compta.json`** :
- le mode de remboursement : `direct` ou `minimum` ;
- pour chaque créneau (matin, midi, soir) : géré ou non, et coché par défaut ou non. Par défaut, seul le soir est géré, et coché ;
- la date de clôture des comptes, vide tant qu'ils ne sont pas clôturés.

**Ce qui est lu ailleurs** : les dépenses qui utilisent chaque catégorie, dans [Dépenses](../budget/depenses.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le mode par défaut est Direct** : c'est déjà comme ça que le groupe fonctionne. L'outil simplifie seulement le suivi.
- **Changer le mode est possible à tout moment.** Un remboursement reste un simple transfert entre deux personnes, il marche dans les deux modes (voir [Mes comptes](../budget/mes-comptes.md)).
- **NON GÉRÉ** est toujours présente, et ne peut être ni modifiée ni supprimée.
- **Changer une catégorie ne vaut que pour la suite.** Les parts des dépenses déjà validées sont figées (voir [Dépenses](../budget/depenses.md)).
- **Une catégorie supprimée** :
  - n'est plus proposée dans les nouvelles dépenses ;
  - garde son nom dans les dépenses qui l'utilisent ;
  - **si elle est facultative et qu'au moins une dépense l'utilise**, sa case reste dans Ma fiche. Par exemple, Monster est supprimée mais des dépenses de Monster existent : « Je bois du Monster » reste affiché, pour que chacun voie pourquoi il a payé ;
  - sinon, elle disparaît complètement.
- **Deux catégories ne peuvent pas avoir le même nom**, même si l'une est supprimée.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Tout le monde**, quand le mode de remboursement change : « Le mode de remboursement passe à Minimum de virements : regarde qui tu dois rembourser ».
- **Tout le monde**, à la clôture des comptes : son plan final de virements (envoyé par [Mes comptes](../budget/mes-comptes.md)).
- **Tout le monde**, quand une catégorie devient obligatoire : « Tu participes maintenant aux dépenses Monster ».
- **Ceux qui avaient coché une catégorie facultative**, quand elle est supprimée.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
Sont refusés :
- **supprimer une catégorie utilisée par une dépense en brouillon ou en attente** : la page dit lesquelles. Il faut d'abord qu'elles soient validées, ou modifiées ;
- **modifier ou supprimer NON GÉRÉ** ;
- **un nom vide, ou déjà pris**.

- **Une catégorie facultative que personne n'a cochée** : acceptée ici. C'est l'envoi d'une dépense de cette catégorie qui sera refusé (voir [Ma fiche](../compte/ma-fiche.md)).
- **Changer de mode alors que des remboursements sont en attente** : ils restent en attente avec leur montant (voir [Mes comptes](../budget/mes-comptes.md)).
- **Après la clôture des comptes**, les catégories et les repas gérés ne se modifient plus. [Suivi des dépenses](suivi-depenses.md), lui, marche comme avant.
- **Un créneau coché par défaut mais pas géré** : impossible, la case Coché par défaut est grisée tant que Géré n'est pas coché.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Validation des dépenses](../staff/validation-depenses.md)
<!-- /nav -->
