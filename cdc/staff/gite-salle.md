<!-- nav -->
[Précédent : Comment ça marche](../budget/comment-ca-marche.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Staff > Gîte et salle


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Régler tout ce qui concerne l'argent du gîte et de la salle : les montants, les hébergeurs, les dates limites, la répartition de la salle, les exemptions, l'ouverture des paiements, et les paramètres de l'acompte s'il est activé.
- **Le gîte** est l'endroit calme, où l'on dort. **La salle** est une salle des fêtes, où se passe la vie de la semaine : repas, soirées, tournois, et le bazar qui va avec.
- Suivre qui a payé et qui doit encore payer.
- Déclarer les couchages : les lits, le plan du gîte, la salle comme couchage, et la literie fournie.
- Accepter les inscriptions tardives.
- Les ploucs voient le résultat dans [Créances gîte et salle](../budget/creances.md) et dans [Lits](../gite/lits.md).
- Cette page reprend l'ancienne « Réglages gîte ».

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs ne voient pas cette page.
- Tout staff peut tout modifier ici. L'hébergeur est forcément un staff, donc il y a accès aussi.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Les dates limites** :
   - la date limite d'inscription ;
   - la date limite de paiement, commune au gîte et à la salle.
2. **Le bloc Gîte** :
   - le montant total ;
   - **la répartition** : au prorata des nuits (par défaut), ou à parts égales ;
   - l'hébergeur, choisi parmi les staffs, avec un rappel s'il n'a aucun moyen de paiement dans [Me rembourser](../compte/me-rembourser.md) ;
   - le bouton **Ouvrir les paiements**, ou la date d'ouverture s'ils sont ouverts ;
   - le suivi : « X € avancés, Y € reçus, Z € manquants », avec une barre de progression.
3. **Le bloc Salle** : les mêmes éléments ; sa répartition est à parts égales par défaut.
4. **Les exemptions** : la liste des personnes exemptées, avec pour chacune trois cases, Gîte, Salle et Communauté. Un bouton pour en ajouter une.
5. **Les couchages** :
   - les lits : une ligne par lit, avec sa lettre, sa description, son nombre de places et s'il est complet, et un bouton **Ajouter un lit** ;
   - la capacité du gîte, calculée : la somme des places ;
   - le plan du gîte : l'image, et un bouton pour l'envoyer ou la remplacer ;
   - la case **La salle sert aussi de couchage** ;
   - **la literie fournie par le gîte**, en plus de celle des lits : un nombre de matelas d'appoint et un nombre de duvets (couettes ou couvertures).
6. **L'acompte**, seulement s'il est activé dans [Prévisionnel](previsionnel.md) : ses paramètres (voir Données).
7. **Le suivi par personne** : une ligne par plouc, avec ses nuits, sa part du gîte et de la salle, ce qu'il a payé (confirmé et en attente), son reste à payer, et les reports acceptés. On peut trier par reste à payer.
8. **Les inscriptions tardives à accepter** : une ligne par compte créé après la date limite d'inscription, avec le bouton **Accepter l'inscription**.

```
┌───────────────────────────────────────────┐
│ Dates limites                             │
│ Inscription  [15/11/2026]                 │
│ Paiement     [01/12/2026]                 │
├─ Gîte ────────────────────────────────────┤
│ Montant      [1 400,00 €]                 │
│ Hébergeur    [Alice ▾]                    │
│ Paiements ouverts le 20/10                │
│ 1 400 € avancés · 980 € reçus · 420 € dus │
│ ████████████░░░░░                         │
├─ Salle ───────────────────────────────────┤
│ Montant      [300,00 €]                   │
│ Hébergeur    [Bob ▾]  ⚠ aucun moyen de    │
│                         paiement          │
│ Répartition  (o) parts égales             │
│              ( ) comme le gîte            │
│                    [Ouvrir les paiements] │
├─ Exemptions ──────────────────────────────┤
│ Eve            [x] Gîte  [x] Salle        │
│ [+ Ajouter]                               │
├─ Couchages ───────────────────────────────┤
│ A  Grande chambre du RdC     2 places   > │
│ B  Lit sous l'escalier       1 place    > │
│ …                      [+ Ajouter un lit] │
│ Capacité du gîte : 10 places              │
│ Literie du gîte  [2] matelas  [4] duvets  │
│ Plan  [aperçu]               [Remplacer]  │
│ [x] La salle sert aussi de couchage       │
├─ Suivi ───────────────────────────────────┤
│ Nom   Nuits  Part    Payé   Reste         │
│ Léo     5    170 €   140 €   30 €         │
│ Max     3    114 €     0 €  114 €         │
├─ Inscriptions tardives ───────────────────┤
│ Zoé  le 20/11      [Accepter l'inscription]│
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Saisir ou modifier un montant** (en euros, enregistré en centimes) : les parts de chacun sont recalculées en direct dans [Créances](../budget/creances.md) et [Présence](../gite/presence.md).
- **Choisir l'hébergeur** du gîte ou de la salle, parmi les staffs : c'est celui qui a payé la location. L'étiquette « Hébergeur » du [Carnet d'adresses](../compte/carnet.md) suit automatiquement. Le choix se corrige tant que les paiements ne sont pas ouverts, puis il est figé.
- **Choisir la répartition du gîte ou de la salle** : au prorata des nuits, ou à parts égales.
- **Fixer les dates limites** d'inscription et de paiement.
- **Ajouter, modifier ou retirer une exemption** : une personne, et ce dont elle est exemptée (gîte, salle, dépenses de la communauté). Les parts des autres sont recalculées. L'exemption de la communauté ne vaut que pour les dépenses validées ensuite (voir [Dépenses](../budget/depenses.md)).
- **Ouvrir les paiements** du gîte ou de la salle, avec une confirmation qui rappelle que l'hébergeur ne pourra plus changer : le bouton Payer apparaît dans Créances, et tous les ploucs non exemptés sont prévenus. L'ouverture est définitive.
- **Ajouter, modifier ou supprimer un lit** : une lettre, une description, un nombre de places, et la case **Couchage complet (couette fournie)**, cochée par défaut. Le texte d'aide : « Décoche-la pour un canapé, ou un lit sans couette : celui qui y dort devra avoir un duvet. Sinon, il en prend un aux autres sans que l'appli le sache. »
- **Saisir la literie fournie par le gîte** : les matelas d'appoint et les duvets. Le matériel qu'un staff apporte lui-même se déclare dans [Ma fiche](../compte/ma-fiche.md), comme pour tout le monde.
- **Envoyer ou remplacer le plan du gîte** : une image où les lettres des lits sont déjà dessinées.
- **Activer ou désactiver la salle comme couchage** : elle apparaît, ou disparaît, comme colonne à places illimitées dans [Lits](../gite/lits.md).
- **Régler l'acompte**, s'il est activé (voir Données).
- **Accepter une inscription tardive** : le compte peut alors saisir ses dates dans [Présence](../gite/presence.md). C'est le même bouton que celui de l'hébergeur (voir [Inscription](../compte/inscription.md)).
- Chaque action est inscrite dans le journal du staff (voir [Staff > Comptes](comptes.md)).

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/gite-salle.json`** :
- la date limite d'inscription, et la date limite de paiement ;
- pour le gîte et pour la salle : le montant en centimes, l'hébergeur, et la date d'ouverture des paiements (vide tant qu'ils sont fermés) ;
- la répartition du gîte et celle de la salle : `nuits` ou `egale` (par défaut, `nuits` pour le gîte, `egale` pour la salle) ;
- les exemptions : pour chaque personne, gîte oui ou non, salle oui ou non, communauté oui ou non ;
- les lits : pour chacun, une lettre (A, B, C…), une description (« grande chambre du RdC ») et un nombre de places (1 pour un simple, 2 pour un double) ;
- la salle comme couchage : oui ou non ;
- pour chaque lit, s'il est complet (oui par défaut) ;
- la literie fournie par le gîte : un nombre de matelas et un nombre de duvets, valables pour toutes les nuits ;
- les paramètres de l'acompte, s'il est activé dans [Prévisionnel](previsionnel.md) : le pourcentage du prévisionnel demandé (par exemple 80 %) et la date limite de l'acompte. Cette liste est une première proposition.

**Le plan du gîte** est une image dans `data/medias/`.

**L'acceptation d'une inscription tardive** est enregistrée dans `data/comptes.json`, avec qui l'a acceptée et quand.

**Ce qui est lu ailleurs** :
- les nuits de chacun, dans [Présence](../gite/presence.md) ;
- les paiements déclarés et confirmés, et les reports, dans [Créances](../budget/creances.md) ;
- les staffs et la date de création des comptes, dans `data/comptes.json` ;
- les moyens de paiement des hébergeurs, dans [Me rembourser](../compte/me-rembourser.md) ;
- les réservations de lits, dans [Lits](../gite/lits.md).

**Les données lues par les autres pages** : [Créances](../budget/creances.md) (tout), [Comment ça marche](../budget/comment-ca-marche.md) (la répartition de la salle), [Carnet d'adresses](../compte/carnet.md) (les hébergeurs), [Inscription](../compte/inscription.md) (la date limite d'inscription), [Présence](../gite/presence.md) (le montant du gîte, les exemptions et la capacité), [Lits](../gite/lits.md) (les lits, le plan, la salle comme couchage et la literie fournie), [Contacter le staff](../communaute/contact-staff.md) (les hébergeurs).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Les calculs des parts** sont ceux de [Créances](../budget/creances.md) : cette page ne fait que fournir les réglages.
- **L'hébergeur est forcément un staff.** Le gîte et la salle peuvent avoir le même hébergeur.
- **L'hébergeur ne change pas pendant tout l'événement** : c'est le compte d'où est sorti l'argent de la location. Une fois les paiements ouverts, le choix est figé, et l'hébergeur reste staff jusqu'à la fin.
- **Ouvrir les paiements demande** un montant, un hébergeur qui a au moins un moyen de paiement, et une date limite de paiement.
- **La répartition par défaut** : le gîte au prorata des nuits, la salle à parts égales.
- **Les exemptions restent anonymes partout ailleurs** : Créances affiche seulement leur nombre. Seule cette page donne les noms.
- **Tout changement après l'ouverture des paiements** (montant, exemption, répartition) recalcule les parts en direct. Les écarts avec ce qui a déjà été payé se régularisent dans [Mes comptes](../budget/mes-comptes.md) (voir [Créances](../budget/creances.md)). Les changements de dates des ploucs, eux, suivent la règle des retardataires.
- **La capacité du gîte** = la somme des places de tous les lits, sans la salle. [Présence](../gite/presence.md) s'en sert pour son alerte.
- **Chaque lit a une lettre unique** et au moins une place.
- **La date limite d'inscription ne ferme rien** : après elle, une inscription reste possible, mais doit être acceptée (voir [Inscription](../compte/inscription.md)).

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Tous les ploucs non exemptés**, à l'ouverture des paiements : « Tu peux payer ta part » (envoyée par [Créances](../budget/creances.md), avec les rappels qui suivent).
- **Tous les ploucs concernés**, quand un montant, une exemption ou la répartition change après l'ouverture des paiements : « Ta part du gîte est passée de 140 € à 152 € ».
- **L'hébergeur sans moyen de paiement**, quand un staff essaie d'ouvrir les paiements : « Ajoute un moyen de paiement pour qu'on puisse te payer ».
- **La personne choisie comme hébergeur**, et celle qui ne l'est plus.
- **La personne exemptée**, quand on l'exempte ou qu'on retire son exemption.
- **Le compte accepté**, quand son inscription tardive est acceptée : « Tu peux maintenant saisir tes dates ».
- **Ceux qui avaient réservé un lit**, quand ce lit est modifié ou supprimé, ou quand la salle n'est plus un couchage (envoyée par [Lits](../gite/lits.md)).

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
L'ouverture des paiements est refusée si :
- le montant est vide ou nul ;
- il n'y a pas d'hébergeur, ou il n'a aucun moyen de paiement ;
- la date limite de paiement n'est pas fixée.

- **Changer d'hébergeur après l'ouverture des paiements** : refusé, le choix est figé.
- **Retirer le droit staff à un hébergeur**, ou désactiver son compte, est refusé dans [Staff > Comptes](comptes.md).
- **Tout le monde exempté** : il n'y a plus de part à calculer. La page le signale, et Créances n'affiche plus de bouton Payer.
- **Une date limite de paiement déjà passée** au moment de la saisie : acceptée, avec un avertissement (les rappels de fin de délai ne partiront pas).
- **Un montant baissé sous ce qui a déjà été reçu** : les trop-payés deviennent des avoirs dans Mes comptes.
- **Supprimer un lit, ou baisser son nombre de places**, alors que des places sont réservées : accepté, avec une confirmation qui dit combien de réservations sautent. Les plus récentes sont retirées d'abord (voir [Lits](../gite/lits.md)).
- **Désactiver la salle comme couchage** alors que des ploucs y ont réservé : même chose.
- **Une lettre déjà prise**, ou **zéro place** : refusé.
- **Un nombre de matelas ou de duvets négatif** : refusé.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Les paramètres de l'acompte** : pourcentage et date limite suffisent-ils ? À qui le paie-t-on, et comment se déduit-il ensuite de la part du gîte et de la salle ? À trancher avec [Prévisionnel](previsionnel.md) et la question ouverte de [Créances](../budget/creances.md).

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Réglages compta](../staff/reglages-compta.md)
<!-- /nav -->
