<!-- nav -->
[Précédent : Lits](../gite/lits.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Mes comptes


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Ce que je dois et à qui, ce qu'on me doit et qui me le doit. C'est aussi ici que je rembourse et que je confirme les remboursements reçus.
- La page rassemble tout ce qui crée une dette entre ploucs :
  - les dépenses validées ([Dépenses](depenses.md)) ;
  - les reports du gîte et de la salle ([Créances](creances.md)) ;
  - les dettes des retardataires, arrivés ou restés plus longtemps après l'ouverture des paiements ([Créances](creances.md)) ;
  - les écarts de régularisation, c'est-à-dire les trop-payés et les manques ([Créances](creances.md)) ;
  - les remboursements déjà faits.
- Le paiement normal du gîte et de la salle reste dans [Créances](creances.md). Ici, une ligne y renvoie seulement tant qu'il reste quelque chose à payer.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** voit ses propres comptes, rembourse ceux à qui il doit, et confirme les remboursements qu'il reçoit. Les membres du staff font de même, en tant que ploucs.
- **Le staff** ne gère rien ici : il choisit le mode de remboursement dans [Réglages compta](../staff/reglages-compta.md), et voit l'ensemble dans [Suivi des dépenses](../staff/suivi-depenses.md). Là, il peut aussi effacer une dette, ou en créer une à la main : ces actions apparaissent ici, dans l'historique.
- **Le graphe de tout le groupe** sera sur [Flux](flux.md), visible par tout le monde. Flux arrive au jalon 5.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
De haut en bas :
1. **Mon solde net**, en grand.
   - Exemple : « Tu dois 42,30 € », ou « On te doit 18,00 € », ou « Tu es quitte ».
   - Sa couleur va du rouge au vert en passant par le gris, avec les couleurs du squelette (`tokens.css`). [Flux](flux.md) reprendra le même dégradé au jalon 5.
   - Le mode actif est affiché en petit : *Direct* ou *Minimum de virements*.
2. **Je dois** : une ligne par personne à qui je dois de l'argent.
   - Sa photo, son nom et le montant.
   - Le bouton **Rembourser**.
   - Le statut « En attente de confirmation » si j'ai déclaré un remboursement qui n'est pas encore confirmé.
3. **On me doit** : une ligne par personne qui me doit de l'argent.
   - Sa photo, son nom et le montant.
   - Les remboursements qu'elle a déclarés, à **Confirmer** ou **Refuser**.
   - Le bouton **Relancer**, et le bouton **Faire grâce**.
4. **Gîte et salle** : une ligne qui renvoie à [Créances](creances.md) tant que ma part n'est pas réglée.
5. **Historique** : tout ce qui a fait bouger mon solde, du plus récent au plus ancien, avec un lien vers chaque élément :
   - les dépenses validées qui me concernent ;
   - les remboursements ;
   - les reports ;
   - les avoirs ;
   - les actions du staff : une dette effacée, une dette manuelle, avec « par le staff (Alice) » et le message.
6. Un lien vers la [FAQ du budget](comment-ca-marche.md), et vers [Flux](flux.md) à partir du jalon 5.

```
Mes comptes
┌───────────────────────────────────────────┐
│          Tu dois 42,30 €                  │
│          Mode : direct                    │
├─ Je dois ─────────────────────────────────┤
│ (o) Alice      32,50 €      [Rembourser]  │
│ (o) David       9,80 €  En attente de conf│
├─ On me doit ──────────────────────────────┤
│ (o) Bob        12,00 €  déclaré 12,00 €   │
│                         [Confirmer][Refus]│
├─ Gîte et salle ───────────────────────────┤
│ Reste 56,00 € pour le gîte          >     │
├─ Historique ──────────────────────────────┤
│ 30/12  McDo (Bob a payé)       -10,40 €   │
│ 29/12  Remboursement à Alice   +20,00 €   │
└───────────────────────────────────────────┘
```

**Ce que contiennent les listes selon le mode :**
- **Mode direct** :
  - « Je dois » contient, pour chaque personne, la somme de mes parts des dépenses qu'elle a payées, moins ce que je lui ai déjà remboursé ;
  - toucher une ligne affiche le détail, dépense par dépense, avec leur état : remboursée, remboursée partiellement ou à rembourser.
- **Mode minimum de virements** : « Je dois » et « On me doit » contiennent les virements calculés à partir des soldes de tout le groupe (l'algorithme est décrit dans [Flux](flux.md), même si sa page n'arrive qu'au jalon 5).
  - Je peux devoir de l'argent à quelqu'un qui n'a payé aucune de mes dépenses. C'est normal, et la FAQ l'explique.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Rembourser** : comme dans Créances, l'appli ne fait pas de virement.
  1. Elle affiche les moyens de paiement de la personne (lien Wero, PayPal, IBAN), tirés de son [Me rembourser](../compte/me-rembourser.md).
  2. Je fais le virement moi-même.
  3. Je déclare « j'ai remboursé X € ». Le montant est prérempli avec ce que je dois, et je peux le modifier pour un remboursement partiel.
  4. Le remboursement passe « En attente de confirmation ».
- **Confirmer** (la personne qui reçoit) : elle a bien reçu l'argent. Le remboursement compte alors dans les soldes.
- **Refuser** (la personne qui reçoit) : rien n'est arrivé. Le remboursement est annulé, et mon montant dû revient.
- **Relancer** (celui à qui on doit) : envoie une notification à la personne qui doit, « Petit rappel : tu dois X € à Alice ». C'est au cas par cas, à son initiative : il n'y a pas de rappel automatique.
  - **Si la personne n'a pas activé les notifications**, une infobulle le dit avant d'envoyer : « Bob n'a pas les notifications. Il verra ta relance à sa prochaine ouverture de l'appli, mais tu ferais mieux de le prévenir aussi autrement », avec un lien vers son contact.
  - Chaque relance est gardée dans les [Pings reçus](../communaute/pings.md) de la personne.
- **Faire grâce** (celui à qui on doit) : il renonce à tout ou partie de ce qu'on lui doit. Le montant est prérempli avec toute la dette, et il peut le modifier.
  - Une fenêtre demande de confirmer, parce que c'est irréversible.
  - La personne est prévenue.
- **Toucher une ligne** : le détail des dépenses qui composent la dette, en mode direct seulement.
- **Clôturer les comptes** (staff, depuis [Réglages compta](../staff/reglages-compta.md)), après le séjour :
  - les comptes sont figés : plus de nouvelle dépense, et plus de changement de présence ;
  - la régularisation finale du gîte et de la salle est calculée ([Créances](creances.md)) ;
  - chacun reçoit son plan final de virements ;
  - les remboursements, eux, restent possibles jusqu'à ce que tout le monde soit quitte.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Ce qui est enregistré : les remboursements.** Chaque remboursement contient :
- son identifiant ;
- qui paie (`de`) ;
- qui reçoit (`a`) ;
- le montant, en centimes ;
- la date de la déclaration ;
- le type : un remboursement normal, ou une grâce ;
- l'état : déclaré, confirmé, confirmé d'office ou refusé ;
- la date de la confirmation ou du refus.

**Ce qui est aussi enregistré** :
- la date de clôture des comptes, si le staff a clôturé ;
- les relances envoyées par chacun, avec leur date.

**Tout le reste est calculé à chaque affichage**, à partir de :
- les dépenses validées et leurs parts ([Dépenses](depenses.md)) ;
- les reports, les trop-payés et les manques ([Créances](creances.md)) ;
- le mode de remboursement actif ([Réglages compta](../staff/reglages-compta.md)) ;
- les moyens de paiement de chacun ([Me rembourser](../compte/me-rembourser.md)).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Tout se compte en centimes.**
- **Solde net** = (ce que j'ai payé pour les autres + reports et avoirs en ma faveur + remboursements confirmés que j'ai faits) − (mes parts des dépenses des autres + reports et manques à ma charge + remboursements confirmés que j'ai reçus).
- **Un remboursement est un simple transfert d'argent entre deux personnes.** Il marche donc dans les deux modes, et même si le staff change de mode en cours de route : on recalcule simplement les listes à partir des soldes.
- **Mode direct** : la dette de A envers B = les parts de A dans les dépenses payées par B + ce que A doit à B pour le gîte et la salle − ce que A a remboursé à B. Les dettes ne se compensent pas entre deux personnes (voir [Flux](flux.md)), sauf pour les retardataires (ci-dessous).
  - **Le gîte et la salle** : un report ou un manque est une dette envers l'hébergeur ; un avoir (un trop-payé) est une dette de l'hébergeur envers moi. La FAQ l'explique.
  - **Un retardataire** doit sa part à chacun de ceux qui ont payé le gîte (voir [Créances](creances.md)). Cette dette se compense d'abord avec ce que chacun d'eux lui doit pour la nourriture : c'est le tampon. Seul le reste se rembourse par virement direct.
  - Un remboursement s'applique aux dépenses **de la plus ancienne à la plus récente**. C'est ce qui donne leur état : remboursée, remboursée partiellement ou à rembourser.
- **Mode minimum de virements** : on calcule le plan de virements à partir des soldes nets, avec le même algorithme que [Flux](flux.md).
  - Le plan peut changer quand une nouvelle dépense est validée. Les remboursements déjà confirmés restent acquis, puisqu'ils ont déjà fait bouger les soldes.
- **Un avoir** (un trop-payé du gîte, par exemple) se compense automatiquement avec mes parts des dépenses de la semaine : il entre simplement dans mon solde net.
- **Seuls les remboursements confirmés comptent** dans les soldes. Un remboursement déclaré est seulement affiché « En attente de confirmation ».
- **Un remboursement que personne ne confirme** :
  - au bout de **7 jours** sans réponse, celui qui reçoit a une dernière notification : « Sans réponse de ta part d'ici demain, le remboursement de Bob sera considéré comme reçu » ;
  - **24 h plus tard**, toujours sans réponse, le remboursement est **confirmé d'office**.
- **Une grâce** est enregistrée comme un remboursement confirmé tout de suite, mais sans argent qui circule. La dette disparaît, et c'est celui qui fait grâce qui absorbe le montant.
- **Une dette effacée par le staff** ([Suivi des dépenses](../staff/suivi-depenses.md)) est enregistrée comme une grâce faite au nom du créancier. **Une dette manuelle** compte comme une dépense validée.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Les personnes concernées**, quand une dépense est validée : « Ton solde a changé : tu dois maintenant X € ». La notification est envoyée par [Dépenses](depenses.md) et ouvre cette page.
- **Celui qui reçoit**, quand un remboursement est déclaré : « Bob dit t'avoir remboursé 12,00 €, à confirmer ».
- **Celui qui paie**, quand son remboursement est confirmé ou refusé.
- **Celui qui reçoit**, à chaque remboursement confirmé : le montant, et ce qu'il lui reste à recevoir (prévu dans [Dépenses](depenses.md)).
- **Celui qui doit**, quand on le relance.
- **Celui qui doit**, quand on lui fait grâce : « Alice t'a fait grâce de 12,00 € ».
- **Celui qui reçoit**, au bout de 7 jours sans confirmation : la dernière notification avant la confirmation d'office.
- **Tout le monde**, à la clôture des comptes : son plan final de virements.
- **Le débiteur et le créancier**, quand le staff efface ou crée une dette qui les concerne (envoyée par [Suivi des dépenses](../staff/suivi-depenses.md), toujours reçue).

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un montant nul ou négatif** est refusé.
- **Se rembourser soi-même** est refusé.
- **Rembourser quelqu'un à qui je ne dois rien**, selon le mode actif, est refusé.
- **Un montant plus élevé que ce que je dois** est accepté, avec un avertissement. Le surplus inverse simplement la dette.
- **La personne n'a renseigné aucun moyen de paiement** : le bouton Rembourser affiche « Demande-lui comment la rembourser », avec un lien vers son contact dans le carnet d'adresses.
- **Un remboursement est déclaré, puis la dette change** (une nouvelle dépense validée, un changement de mode) : il reste en attente avec son montant, et compte normalement une fois confirmé.
- **Relancer plusieurs fois** : une relance au plus par personne et par 24 h.
- **Faire grâce de plus que ce qu'on me doit** est refusé.
- **Après la clôture**, aucune nouvelle dépense ne peut être saisie ou validée. On peut toujours rembourser et faire grâce.
- **Je suis quitte** : les listes « Je dois » et « On me doit » sont remplacées par « Tu es quitte ». L'historique reste visible.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Créances gîte et salle](../budget/creances.md)
<!-- /nav -->
