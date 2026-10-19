<!-- nav -->
[Précédent : Présence](../gite/presence.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Gîte > Lits


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Réserver un lit, nuit par nuit, pour être sûr d'en avoir un. Ceux qui n'ont pas de lit dorment par terre.
- Savoir avec qui je partage un lit double, ou la salle.
- Savoir, nuit par nuit, si on a assez de **matelas** et de **duvets** pour ceux qui dorment par terre. Cette page reprend l'ancienne « Literie ».

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chaque plouc** voit tout le tableau, et réserve ou libère ses propres places. Les membres du staff font de même, en tant que ploucs.
- **Le staff** déclare les lits, le plan et la salle dans [Gîte et salle](../staff/gite-salle.md). Il ne réserve pas à la place des autres.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Le tableau** : une ligne par nuit du séjour, une colonne par lit, avec sa lettre en en-tête. Toucher une lettre affiche sa description en infobulle.
   - Chaque case montre les prénoms de ceux qui ont réservé cette place cette nuit-là. Une case libre est vide, une case pleine est grisée.
   - Les nuits où je ne suis pas présent sont grisées pour moi.
   - La dernière colonne est **Salle** (si le staff l'a activée) : places illimitées, avec la liste de tous ceux qui y dorment.
   - En bout de ligne, trois colonnes :
     - **Lits libres** : le nombre de places libres au gîte cette nuit-là. Quand il n'y en a plus : « Plus de lit au gîte cette nuit : il faudra dormir par terre » ;
     - **Matelas** et **Duvets** : ce qui reste cette nuit-là, une fois servis tous ceux qui en ont besoin (voir Règles et calculs). Un reste négatif est en rouge, avec ⚠ : il en manque.
   - **Sur téléphone**, le tableau défile de gauche à droite, et la colonne des nuits reste fixée à gauche.
   - Sous le tableau : « 4 ploucs n'ont pas dit ce qu'ils apportent », avec un lien vers [Ma fiche](../compte/ma-fiche.md) si j'en fais partie.
2. **Mes nuits** : pour chacune de mes nuits, mon lit ou « Par terre ».
3. **Le bouton Plan**, flottant en bas à droite, à portée de pouce, avec une icône de plan. Il ouvre le plan par-dessus la page, et le referme.
   - **Le plan** : l'image envoyée par le staff, où les lettres des lits sont déjà dessinées. En dessous, la légende : chaque lettre avec sa description (« grande chambre du RdC », « lit sous l'escalier »).
   - Il est fermé à l'arrivée sur la page.

```
┌───────────────────────────────────────────┐
│ Nuit   A(2)    B   …  Salle  Lits Mat Duv │
│ 28/12  Bob,Eve Léo     Max     3   2   4  │
│ 29/12  Bob     Léo     Max     2   1   3  │
│ 30/12  Bob,Eve Léo  …  Max,Zoé 0  -1⚠ 1  │
│ …                                         │
│ 4 ploucs n'ont pas dit ce qu'ils apportent│
├───────────────────────────────────────────┤
│ Mes nuits                                 │
│ 28/12 Par terre        [Choisir un lit]   │
│ 29/12 C                [Libérer]          │
│                                    [Plan] │
└───────────────────────────────────────────┘

Plan ouvert, par-dessus :
┌───────────────────────────────────────────┐
│ [ plan du gîte avec A B C D E F ]         │
│ A Grande chambre du RdC (double)          │
│ B Lit sous l'escalier …                   │
│                                       [×] │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
Aucune action ne demande de confirmation.
- **Toucher une case libre**, sur une de mes nuits : je réserve cette place. Si j'avais déjà un lit cette nuit-là, je le quitte pour celui-ci.
  - Si c'est un lit double où quelqu'un dort déjà, la page prévient, sans bloquer : « Tu dormiras avec Bob ».
- **Toucher ma propre case** : je la libère, et je repasse « Par terre » cette nuit-là.
- **Ce lit pour toutes mes nuits** (dans l'infobulle d'un lit) : je réserve ce lit sur toutes mes nuits où il a encore de la place. Mes autres réservations sur ces nuits sont remplacées. La page dit sur quelles nuits il était plein.
- **Bouton Plan** : ouvre le plan par-dessus la page. Le toucher à nouveau le referme.
- **Salle** : toucher la case me met dans la salle cette nuit-là, à la place de mon lit au gîte s'il y en avait un.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/lits.json`**, une ligne par réservation :
- la nuit (la date du soir) ;
- le lit (sa lettre, ou `salle`) ;
- le compte ;
- la date de la réservation.

**Ce qui est lu ailleurs** :
- les lits (lettre, description, nombre de places, couchage complet ou non), le plan, l'activation de la salle, et la literie fournie par le gîte, dans [Gîte et salle](../staff/gite-salle.md) ;
- les matelas et les duvets que chacun apporte, dans [Ma fiche](../compte/ma-fiche.md) ;
- les nuits de chacun, dans [Présence](presence.md) ;
- les prénoms, dans `data/comptes.json`.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Une nuit** est désignée par la date du soir : la nuit du 28/12 va du 28 au 29. Les lignes du tableau sont les nuits du séjour, du 28/12 au 02/01.
- **Un lit simple a 1 place, un lit double 2.** Le nombre de places est un réglage de chaque lit, donc un lit à 3 places est aussi possible.
- **Une personne a au plus une place par nuit** : un lit du gîte, la salle, ou rien (par terre au gîte).
- **Pas de réservation, c'est par terre au gîte.** Il n'y a rien à saisir.
- **Un lit plein ne se réserve plus.** Dormir dans le lit de quelqu'un d'autre se règle entre vous, avec son accord, en dehors de l'appli.
- **La capacité du gîte = la somme des places de tous les lits**, sans la salle. C'est elle que [Présence](presence.md) compare au nombre de présents pour son alerte.
- **On ne réserve que ses nuits de présence.** Si je change mes dates dans Présence, mes réservations sur les nuits que je n'ai plus sont retirées.
- **Premier arrivé, premier servi**, sans file d'attente, et sans date d'ouverture des réservations.

**La literie**, nuit par nuit. On ne compte que les **matelas** et les **duvets** (une couette ou une couverture compte comme un duvet). Les draps, les sacs de couchage et les oreillers ne sont pas gérés.
- **Le stock** = les matelas et les duvets apportés par les ploucs présents cette nuit-là ([Ma fiche](../compte/ma-fiche.md)) + ceux fournis par le gîte ([Gîte et salle](../staff/gite-salle.md)). On ne sait pas à qui est quoi : c'est un pot commun.
- **Le besoin** :
  - un plouc dans un lit **complet** (couette fournie) n'a besoin de rien ;
  - un plouc dans un lit **incomplet** (un canapé, un lit sans couette) a besoin d'**un duvet** ;
  - un plouc **par terre**, au gîte ou en salle, a besoin d'**un matelas et un duvet**.
- **Le reste** = stock − besoin, pour chaque objet. Négatif : il en manque.
- **Les objets suivent leur propriétaire** : Paul apporte un matelas et part le 31 au matin ; son matelas n'est plus là la nuit du 31.
- **Un plouc qui n'a pas dit ce qu'il apporte** compte pour zéro dans le stock, et il est compté à part dans « n'ont pas dit ce qu'ils apportent ».

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Dans la catégorie Gîte (voir [Notifications](../compte/notifications.md)) :
- **Celui qui dort déjà dans un lit double**, quand quelqu'un le rejoint : « Eve dormira avec toi la nuit du 28/12 (lit A) ».
- **Celui dont une réservation est retirée** parce qu'il a changé ses dates : « Ta place dans le lit C est libérée pour la nuit du 02/01 ».
- **Tous ceux qui ont réservé un lit**, quand le staff modifie ou supprime ce lit (voir Cas limites).
- **Le staff**, quand une nuit passe en manque de matelas ou de duvets : « Il manque 1 matelas la nuit du 30/12 ». Une seule fois par nuit et par objet, jusqu'à ce que le manque disparaisse.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
La réservation est refusée si :
- le lit est plein cette nuit-là ;
- je ne suis pas présent cette nuit-là ;
- la nuit est en dehors du séjour.

- **Deux personnes touchent la dernière place en même temps** : la première enregistrée l'emporte. L'autre voit « Ce lit vient d'être pris ».
- **Le staff supprime un lit**, ou baisse son nombre de places, alors que des places sont réservées : les réservations en trop sont retirées, les plus récentes d'abord, et les personnes concernées sont prévenues.
- **Le staff désactive la salle** : les réservations de la salle sont retirées, et les personnes concernées repassent « Par terre » et sont prévenues.
- **Aucun lit déclaré** : la page affiche « Le staff n'a pas encore déclaré les lits ».
- **Aucun plan envoyé** : le bouton Plan n'ouvre que la légende.
- **Une inscription tardive pas encore acceptée** n'a pas de nuits, donc ne peut rien réserver.
- **Personne n'a dit ce qu'il apporte**, et le gîte ne fournit rien : les colonnes Matelas et Duvets sont négatives partout. C'est normal, et le texte sous le tableau l'explique.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- **Le plan avec des repères à toucher**, posés par le staff sur l'image : prévu pour plus tard. Au jalon 2, les lettres sont dessinées directement sur l'image.

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Mes comptes](../budget/mes-comptes.md)
<!-- /nav -->
