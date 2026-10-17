<!-- nav -->
[Précédent : Suivi des dépenses](../staff/suivi-depenses.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Staff > Annonces

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Envoyer une notification à des ploucs choisis à la main, ou choisis par une condition : ceux qui n'ont pas payé le gîte, ceux qui sont là ce soir, ceux qui n'ont pas dit ce qu'ils apportent comme literie…
- Savoir qui n'a pas activé les notifications, pour le joindre autrement.
- Chaque annonce est aussi gardée dans [Pings reçus](../communaute/pings.md), pour être relue plus tard.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs reçoivent les annonces, et les retrouvent dans Pings reçus.
- **Les annonces ne peuvent pas être coupées** dans les réglages de notifications (voir [Notifications](../compte/notifications.md)).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Les filtres**, rangés en trois groupes (voir Règles et calculs pour leur définition exacte). Chaque filtre affiche, en petit, le nombre de personnes qu'il donne.
2. **La combinaison** : *au moins un filtre* (ou) ou *tous les filtres* (et).
3. **Les destinataires** : des pastilles, comme dans [Staff > Comptes](comptes.md). On en retire en touchant la croix, on en ajoute en tapant `@`.
   - Ceux qui n'ont pas activé les notifications sont marqués 🔕, avec un lien vers leur contact dans le [Carnet d'adresses](../compte/carnet.md).
4. **Le message** :
   - **le titre** : « Groutte - » est déjà écrit, le staff tape la suite ;
   - **le texte** : 120 caractères au plus, avec le compteur ;
   - **la page qui s'ouvre** quand on touche la notification : une liste de toutes les pages de l'appli, préremplie selon le filtre (Créances pour « pas payé le gîte », Lits pour « pas de lit »…).
5. Le bouton **Envoyer**.
6. **Les notifications désactivées** : la liste de tous les ploucs qui ne reçoivent pas de notifications, avec leur contact. C'est une information : on ne peut pas les joindre par l'appli.
7. **Les annonces envoyées**, de la plus récente à la plus ancienne : la date, le staff, le titre, le nombre de destinataires.

```
Annonces
┌─ Filtres ─────────────────────────────────┐
│ Groupe                                    │
│ [ ] Tout le monde (24)  [ ] Qui vient (18)│
│ [ ] Présents le [31/12▾][Soir▾] (16)      │
│ [ ] Staff (4)   [ ] Rôle [Cuisine ▾] (5)  │
│ Argent                                    │
│ [x] Pas payé le gîte (3)                  │
│ [ ] Doit plus de [20 €] (6)               │
│ À compléter                               │
│ [ ] Literie non renseignée (4) …          │
│ (o) au moins un   ( ) tous                │
├─ Destinataires (3) ───────────────────────┤
│ [Bob x] [Max x] [Léa 🔕 x]  @…            │
│ ⚠ Léa n'a pas les notifications : elle le │
│   verra à sa prochaine ouverture. Préviens│
│   -la aussi autrement. [Contact]          │
├─ Message ─────────────────────────────────┤
│ Groutte - [Gîte : dernier rappel      ]   │
│ [Il te reste 3 jours pour payer ta    ]   │
│ [part du gîte !                       ]   │
│                                  52/120   │
│ Ouvre   [Créances ▾]                      │
│                               [Envoyer]   │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Cocher un filtre** : les destinataires sont recalculés. Les personnes ajoutées ou retirées à la main le restent.
- **Changer la combinaison** (ou / et) : les destinataires sont recalculés.
- **Ajouter ou retirer une personne** à la main.
- **Envoyer** : une confirmation rappelle le nombre de destinataires, et combien n'ont pas les notifications. Ensuite, la notification part, et l'annonce est enregistrée dans Pings reçus pour chaque destinataire.
- **Toucher une annonce envoyée** : son texte, et la liste de ses destinataires.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/annonces.json`**, une ligne par annonce :
- son identifiant ;
- le staff qui l'a envoyée, et la date ;
- le titre, le texte, et la page qui s'ouvre ;
- les filtres utilisés et la combinaison ;
- les destinataires, tels qu'ils étaient au moment de l'envoi.

L'envoi est aussi inscrit dans le journal du staff (voir [Staff > Comptes](comptes.md)).

**Ce qui est lu ailleurs** :
- les comptes, les rôles et les staffs, dans `data/comptes.json` ;
- les présences, dans [Présence](../gite/presence.md) ;
- les paiements du gîte et de la salle, et les exemptions, dans [Créances](../budget/creances.md) et [Gîte et salle](gite-salle.md) ;
- les soldes, dans [Mes comptes](../budget/mes-comptes.md) ;
- les moyens de paiement, dans [Me rembourser](../compte/me-rembourser.md) ;
- les réservations de lits, dans [Lits](../gite/lits.md) ;
- la fiche de chacun (literie, catégories, fiche incomplète), dans [Ma fiche](../compte/ma-fiche.md) ;
- les appareils abonnés aux notifications, dans `data/abonnements.json`.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
**Les filtres.** La liste pourra évoluer. Les comptes désactivés ne sont jamais dans aucun filtre.

| Groupe | Filtre | Qui |
| --- | --- | --- |
| Groupe | Tout le monde | tous les comptes actifs |
| Groupe | Qui vient | ceux qui ont des dates dans Présence |
| Groupe | Présents à un créneau | ceux qui sont présents à la date et au créneau choisis |
| Groupe | Staff | les staffs |
| Groupe | Un rôle | ceux qui ont le rôle choisi (Cuisine, Chef, Véhicule…) |
| Groupe | Inscriptions tardives | les comptes créés après la date limite, pas encore acceptés |
| Argent | Pas payé le gîte | reste à payer du gîte > 0. Un paiement déclaré compte comme payé ; s'il est refusé par l'hébergeur, la personne revient dans le filtre. Les exemptés et l'hébergeur n'y sont jamais. Grisé tant que les paiements ne sont pas ouverts |
| Argent | Pas payé la salle | la même chose pour la salle |
| Argent | Doit plus de X € | solde net dans Mes comptes : doit plus que le montant choisi |
| Argent | Pas de moyen de paiement | n'a aucun moyen dans Me rembourser, **et** on lui doit de l'argent ou il est hébergeur |
| À compléter | Présence | n'a pas de dates dans Présence, **et** n'a pas dit « Je ne viens pas » |
| À compléter | Lit | a au moins une nuit sans réservation, alors qu'il restait un lit libre au gîte cette nuit-là |
| À compléter | Literie | n'a pas dit ce qu'il apporte (« non renseigné » dans Ma fiche) |
| À compléter | Fiche incomplète | il manque le prénom ou le téléphone (le bandeau de Ma fiche) |
| À compléter | Alcool non coché | n'a pas coché la catégorie qui propose d'être SAM, pour lui proposer de l'être |

- **La combinaison** : *au moins un* (ou) donne ceux qui sont dans au moins un des filtres cochés, *tous* (et) ceux qui sont dans tous. Par défaut : *au moins un*.
- **Les destinataires sont calculés au moment de l'envoi.** Quelqu'un qui paie juste après a quand même reçu l'annonce.
- **Le staff qui envoie** reçoit l'annonce s'il est dans les destinataires, comme les autres : il la retrouve ainsi dans ses Pings reçus.
- **Les membres muets** reçoivent les annonces comme tout le monde.
- **Ceux qui n'ont pas les notifications** (aucun appareil abonné) ne reçoivent pas la notification. Ils voient l'annonce à leur prochaine ouverture de l'appli, avec une invitation à activer les notifications (voir [Pings reçus](../communaute/pings.md)). La page le dit avant l'envoi, pour qu'on les prévienne aussi autrement.
- **Une annonce par heure et par staff**, au plus.
- **Il n'y a pas d'annonce programmée** : l'appli n'a pas de tâche planifiée.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Les destinataires** : la notification, avec le titre, le texte et la page choisis. Elle est **toujours reçue**, même si la personne a coupé des catégories.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
L'envoi est refusé si :
- il n'y a aucun destinataire ;
- le titre ou le texte est vide ;
- le texte dépasse 120 caractères ;
- le staff a déjà envoyé une annonce il y a moins d'une heure : la page dit dans combien de temps il pourra.

Et aussi :
- **Tous les destinataires sont sans notifications** : l'envoi est accepté, avec l'avertissement. L'annonce les attend dans Pings reçus.
- **Un filtre d'argent avant l'ouverture des paiements** : grisé, avec « Les paiements ne sont pas encore ouverts ».
- **Notifications indisponibles sur le serveur** (module `cryptography` absent) : l'annonce est quand même enregistrée dans Pings reçus, et la page le signale.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Pings reçus](../communaute/pings.md)
<!-- /nav -->
