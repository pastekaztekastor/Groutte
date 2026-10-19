<!-- nav -->
[Précédent : Menu](../repas/menu.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Staff > Suivi des dépenses

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Voir **toutes les dettes du groupe** dans un seul tableau : qui doit combien, à qui, et pourquoi. Budget > [Dépenses](../budget/depenses.md) et [Mes comptes](../budget/mes-comptes.md), eux, ne montrent que celles de chacun.
- **Réparer les erreurs sans tout casser** : le staff peut effacer une dette, ou en créer une à la main. C'est une **zone dangereuse**, réservée aux cas où rien d'autre ne marche.
- Exporter le tableau en CSV, pour l'analyser dans un tableur.
- Le graphe des flux viendra avec [Flux](../budget/flux.md), au jalon 5, et reprendra ce tableau.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs ne voient pas cette page.
- **Les personnes concernées** voient le résultat de chaque action du staff dans l'historique de leur [Mes comptes](../budget/mes-comptes.md), et en sont prévenues.
- **Un staff peut agir sur une ligne qui le concerne** (il en est le débiteur ou le créancier). Ce n'est pas interdit : tout est inscrit dans le journal du staff, que les autres staffs voient.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Les filtres** : une personne (débiteur ou créancier, en tapant `@`), l'origine, et la case **Non réglé seulement**. Un **tri** par date, par montant ou par personne.
2. **Le tableau**, une ligne par dette d'origine :
   - **De** : qui doit ;
   - **Montant** : le montant d'origine, **barré** s'il a été en partie remboursé, suivi du reste ;
   - **À** : à qui ;
   - **Origine** : dépense, gîte, salle, report, retardataire, avoir, manque, ou dette manuelle ;
   - la date.
   - Une ligne **réglée** (reste nul) est grisée, sans action.
   - **Toucher le montant** ouvre l'élément d'origine : la dépense (comme dans [Validation des dépenses](validation-depenses.md)), le bloc gîte ou salle, ou la dette manuelle avec son message.
   - **Toucher la ligne** ouvre son action : **Effacer la dette**.
3. **Le total** des lignes affichées : montant d'origine et reste.
4. **Les boutons** **Créer une dette manuelle** et **Exporter en CSV**.

```
Suivi des dépenses
┌───────────────────────────────────────────┐
│ [@personne] [Origine ▾] [x] Non réglé     │
├───────────────────────────────────────────┤
│ De    Montant          À      Origine     │
│ Bob   ~~9,12~~ 4,12 €  Alice  dépense  >  │
│ Léo   9,12 €           Alice  dépense  >  │
│ Max   114,00 €         Alice  gîte     >  │
│ Eve   5,38 €           Bill   retardat.>  │
│ Zoé   3,00 €  (grisé)  Bob    dépense     │
├───────────────────────────────────────────┤
│ 5 lignes · 140,62 € d'origine · 132,62 €  │
│ restent                                   │
│ [Créer une dette manuelle] [Exporter CSV] │
└───────────────────────────────────────────┘
```

**L'écran de dette manuelle** : un gros avertissement en haut, puis quatre champs.

```
┌───────────────────────────────────────────┐
│ ⚠ ATTENTION : ce n'est pas une utilisation│
│ normale. Cette dette n'a ni ticket ni     │
│ validation, et elle peut fausser les      │
│ comptes de fin de séjour. Passe plutôt    │
│ par Dépenses quand c'est possible.        │
├───────────────────────────────────────────┤
│ De       [@Bob        ]                   │
│ À        [@Alice      ]                   │
│ Montant  [12,00 €     ]                   │
│ Message  [Staff · Essence du 29/12     ]  │
│                                [Créer]    │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
Toutes ces actions sont **définitives**. Chacune demande de **retaper le montant** pour confirmer. Chacune est inscrite dans le journal du staff (voir [Staff > Comptes](comptes.md)).

- **Effacer la dette** d'une ligne : la part d'**une seule personne** dans une dépense (ou une autre dette d'origine). Le reste de la ligne disparaît des comptes : c'est le créancier qui l'absorbe. C'est enregistré comme une **grâce** faite par le staff à la place du créancier ([Mes comptes](../budget/mes-comptes.md)). La dépense, elle, reste validée, et les parts des autres ne bougent pas. Un **message**, facultatif, explique pourquoi (« erreur de saisie », « payé en espèces »).
- **Créer une dette manuelle** : de qui, à qui, un montant, un message (obligatoire : c'est son libellé). Elle entre dans les soldes et dans Mes comptes comme une dépense validée. Son libellé commence toujours par **« Staff · »**, imposé, suivi du message.
- **Corriger une erreur du staff** : il n'y a pas de retour arrière. On crée une dette manuelle dans l'autre sens, avec un message qui l'explique. Le lien avec l'origine se perd, mais le message le raconte.
- **Exporter en CSV** : toutes les lignes affichées, avec leurs colonnes, l'identifiant de l'élément d'origine, et les actions du staff.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Ce qui est enregistré** :
- **Les dettes manuelles**, dans `data/dettes-manuelles.json` : de qui, à qui, le montant en centimes, le message, le staff qui l'a créée, et la date.
- **Les dettes effacées** : comme des grâces de [Mes comptes](../budget/mes-comptes.md), avec en plus la ligne d'origine, le staff qui a agi, et le message s'il y en a un.

**Tout le reste est calculé à chaque affichage**, à partir de :
- les dépenses validées et leurs parts figées ([Dépenses](../budget/depenses.md)) ;
- les parts, paiements, reports, retardataires, avoirs et manques du gîte et de la salle ([Créances](../budget/creances.md)) ;
- les remboursements et les grâces ([Mes comptes](../budget/mes-comptes.md)).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Tout se compte en centimes.**
- **Le tableau montre toujours les dettes d'origine**, comme en mode direct, quel que soit le mode de remboursement choisi dans [Réglages compta](reglages-compta.md). C'est la vérité comptable. Les virements du mode minimum restent dans Mes comptes, et dans Flux au jalon 5.
- **Une ligne = une dette d'origine entre deux personnes** :
  - une dépense qui concerne 3 personnes en plus du payeur donne 3 lignes. **La part du payeur** ne donne pas de ligne : il ne se doit rien ;
  - la part du gîte ou de la salle pas encore payée : une ligne vers l'hébergeur. Un paiement **déclaré mais pas confirmé** est affiché sur la ligne (« 50 € déclarés ») ;
  - un report, un manque : une ligne vers l'hébergeur ; un avoir : une ligne de l'hébergeur vers la personne ;
  - un retardataire : une ligne vers chacun de ceux qui ont payé le gîte ;
  - une dette manuelle : une ligne.
- **Le reste d'une ligne** = son montant d'origine, moins les remboursements entre ces deux personnes, appliqués **de la plus ancienne dette à la plus récente** (comme dans Mes comptes), moins les grâces et les dettes effacées.
- **En mode minimum de virements**, les remboursements ne vont pas forcément à celui qui a payé la dépense. Une ligne est donc aussi marquée **réglée** dès que son **débiteur est quitte** (son solde net est nul), même si l'argent est allé à quelqu'un d'autre.
- **Effacer une dette** n'est possible que sur une ligne **qui a un reste**. Une ligne réglée est grisée et ne se touche plus.
- **La part normale du gîte ou de la salle** se règle dans [Gîte et salle](gite-salle.md) (exemption, report), pas ici : sa ligne n'a pas d'action.
- **Un remboursement en attente** sur une ligne effacée reste en attente avec son montant. S'il est confirmé ensuite, il compte normalement : le surplus inverse la dette, comme dans Mes comptes.
- **Après la clôture des comptes**, la page marche comme avant.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Ces notifications sont **toujours reçues**, comme toutes les actions du staff sur un compte (voir [Notifications](../compte/notifications.md)) :
- **Le débiteur et le créancier**, quand une dette est effacée : « Alice (staff) a effacé ta part de Courses Leclerc (4,12 €) : erreur de saisie ».
- **Le débiteur et le créancier**, quand une dette manuelle est créée : « Staff · Essence du 29/12 : tu dois 12,00 € à Alice ».

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
Sont refusés :
- un montant retapé qui ne correspond pas ;
- effacer une ligne déjà réglée ;
- une dette manuelle sans message, de quelqu'un envers lui-même, d'un montant nul ou négatif, ou vers un compte désactivé.

Et aussi :
- **Deux staffs agissent en même temps** sur la même ligne : la première action enregistrée l'emporte. L'autre voit « Cette dette vient d'être effacée par Alice ».
- **Une ligne en partie remboursée**, puis effacée : seul le reste disparaît. Ce qui a été remboursé reste acquis.
- **Un compte désactivé** : toutes ses lignes sont effacées au moment de la désactivation (voir [Staff > Comptes](comptes.md)). Elles restent dans le tableau, grisées.
- **Aucune dette** : « Personne ne doit rien à personne ».

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Annonces](../staff/annonces.md)
<!-- /nav -->
