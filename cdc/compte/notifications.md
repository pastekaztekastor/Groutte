<!-- nav -->
[Précédent : Me rembourser](../compte/me-rembourser.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Compte > Notifications

- **Priorité** : 1
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Activer les notifications sur cet appareil, puis choisir ce que je reçois.
- **On reprend la page Notifications de NextSession** (`#notifications`). Elle existe déjà dans le squelette (`static/js/notifs.js`, `notifications.py`). Il ne reste qu'à déclarer les catégories de la Groutte.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- Chacun, pour lui-même.
- Le staff voit en plus, dans [Annonces](../staff/annonces.md), qui n'a pas activé les notifications.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
Comme dans NextSession, de haut en bas :
1. **Sur cet appareil** :
   - l'interrupteur « Activer les notifications » ;
   - un bouton **Tester**, qui envoie une notification d'essai.
   - Si le téléphone a bloqué les notifications, la page explique comment les débloquer.
2. **Ce que je reçois** : un interrupteur par catégorie, tout coché par défaut. Ce choix vaut pour tous mes appareils.
3. **Toujours reçues** : la liste de ce qu'on ne peut pas couper, en lecture seule, pour que personne ne soit surpris.

```
Notifications
┌─ Sur cet appareil ────────────────────────┐
│ Activer les notifications          [on]   │
│ Tester                                >   │
├─ Ce que je reçois ────────────────────────┤
│ Forum                              [on]   │
│ Messages privés                    [on]   │
│ Dépenses                           [on]   │
│ Mes comptes                        [on]   │
│ Gîte                               [on]   │
│ Repas                              [on]   │
│ Tournois                           [on]   │
│ Drop box                           [off]  │
├─ Toujours reçues ─────────────────────────┤
│ Mentions, annonces du staff, paiements du │
│ gîte et de la salle, actions du staff sur │
│ ton compte                                │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Activer ou désactiver sur cet appareil** : l'appareil s'abonne aux notifications, ou se désabonne.
- **Tester** : envoie une notification d'essai sur mes appareils.
- **Couper ou rétablir une catégorie.**

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- `data/abonnements.json` : les appareils abonnés, pour chaque compte (squelette).
- `data/profils.json` : les catégories coupées, pour chaque compte (squelette).
- `config.json > categories_notifications` : la liste des catégories qu'on peut couper.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
**Les catégories qu'on peut couper**

| Catégorie | Ce qu'elle contient |
| --- | --- |
| Forum | les nouveaux fils, et les réponses à mes posts et à mes commentaires |
| Messages privés | les nouveaux messages dans mes conversations |
| Dépenses | ma dépense validée ou refusée ; pour le staff, une dépense à valider |
| Mes comptes | mon solde a changé, un remboursement à confirmer ou confirmé, une grâce, une relance |
| Gîte | les présences, les lits, la literie, le SAM du jour ; pour le staff, une nouvelle inscription |
| Repas | un nouvel événement repas, et les changements de ceux où je suis inscrit |
| Tournois | le planning et les résultats |
| Drop box | les nouvelles photos, vidéos et musiques |

**Toujours reçues**, même si la catégorie est coupée :
- **les mentions** « @Nom » (une mention remplace la notification générale, comme dans NextSession) ;
- **les annonces du staff** ;
- **les paiements du gîte et de la salle** : l'ouverture, les rappels, la date limite, la confirmation ou le refus d'un paiement, les reports (voir [Créances](../budget/creances.md)) ;
- **ce qui fait bouger mon argent sans moi** : la dernière notification avant la confirmation d'office d'un remboursement, et la clôture des comptes (voir [Mes comptes](../budget/mes-comptes.md)) ;
- **les actions du staff sur mon compte** : nommé staff ou non, code remis à zéro, mode muet, rôle, nom corrigé (voir [Staff > Comptes](../staff/comptes.md)) ;
- **pour l'hébergeur** : les inscriptions tardives à accepter, et les paiements à confirmer.

**Repris de NextSession**
- **À la première ouverture de l'appli installée**, l'activation des notifications est demandée, et elle est obligatoire. Seule exception : si le téléphone les a bloquées, l'écran explique comment les débloquer, avec « Continuer sans notifications » (`installation.js`, déjà dans le squelette).
- **Le titre** de chaque notification commence par « Groutte - … ». La toucher ouvre la bonne page.
- **Une notification remplace la précédente sur la même page.** Par exemple, plusieurs photos envoyées d'affilée ne donnent qu'une notification.
- **La pastille sur l'icône de l'appli** compte les notifications reçues depuis la dernière ouverture.
- **Il n'y a pas de tâche planifiée.** Les rappels datés (Créances, confirmation d'office) sont vérifiés au premier chargement de l'appli par quelqu'un, et chaque envoi est noté pour ne jamais partir deux fois.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- La notification de test, seulement.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Une relance vers quelqu'un qui a coupé « Mes comptes »** est refusée, avec la raison affichée, comme dans NextSession.
- **Notifications indisponibles sur le serveur** (le module `cryptography` est absent) : la page le dit, et tout le reste de l'appli marche.
- **Sur iPhone**, les notifications ne marchent que dans l'appli installée depuis Safari (iOS 16.4 et plus). Dans le navigateur, la page invite à installer l'appli.
- **Hors ligne au gîte** (sur le Raspberry Pi), il n'y a pas de notifications. Voir [Hors ligne](../staff/hors-ligne.md).

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Carnet d'adresses](../compte/carnet.md)
<!-- /nav -->
