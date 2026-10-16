<!-- nav -->
[Précédent : Dépenses](../budget/depenses.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Comment ça marche

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- C'est la FAQ du budget, et elle a un **rôle pédagogique** : un plouc qui la lit sait comment on paie, comment on partage, et comment on se rembourse.
- **C'est la référence des règles d'argent**, un peu comme des CGV ou des CGU : tout y est, rangé, et en cas de désaccord c'est elle qui fait foi.
- C'est la seule page fixe de type FAQ dans l'appli : la FAQ générale est dans le forum.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Tout le monde** la voit.
- **Personne n'agit dans l'appli.** Seul le webmaster modifie le texte, en éditant le fichier sur le serveur.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**1. L'encadré ATTENTION**, toujours affiché en haut, bien visible, et impossible à replier :

> **ATTENTION**
>
> On a tous des soucis d'argent de temps en temps. Mais ne pas payer, c'est exposer ceux qui avancent l'argent à des soucis bien plus gros que les nôtres.
>
> S'engager à venir, c'est s'engager à pouvoir rembourser : c'est justement ce qui permet à certains d'avancer l'argent pour tous.
>
> Nous sommes une communauté d'amis : respectons-nous, et respectons ceux qui donnent de leur temps pour que nous passions les fêtes dans de si bonnes conditions.

**2. Les questions**, rangées en trois parties qui suivent le séjour : **Avant**, **Pendant**, **Après**, puis **Ce que l'outil ne gère pas**. Chaque question se déplie quand on la touche :
- **la réponse courte**, en deux phrases au plus ;
- **« En détail »**, dépliable à son tour : la règle complète, et un exemple chiffré.

```
Comment ça marche
┌───────────────────────────────────────────┐
│ ATTENTION                                 │
│ On a tous des soucis d'argent de temps en │
│ temps. Mais ne pas payer, c'est exposer...│
└───────────────────────────────────────────┘
 AVANT LE SÉJOUR : LE GÎTE ET LA SALLE
┌───────────────────────────────────────────┐
│ > Qui paie quoi ?                         │
│ v Et la salle ?   [Actif : parts égales]  │
│   Réponse courte…                         │
│   > En détail                             │
└───────────────────────────────────────────┘
 PENDANT LE SÉJOUR : DÉPENSES ET REPAS
┌───────────────────────────────────────────┐
│ > J'ai payé pour le groupe : je fais quoi?│
└───────────────────────────────────────────┘
 APRÈS : ON SE REMBOURSE
 …
```

**Les personnages des exemples** sont toujours les mêmes, d'une question à l'autre, avec des chiffres cohérents :
- **Martine**, l'hébergeuse : elle a avancé le gîte ;
- **Bill** et **Bob**, deux ploucs ;
- **Evelyne**, qui arrive en retard.

Le gîte coûte 1 400 € pour 50 nuitées, soit 28 € la nuitée. Bill reste 5 nuits.

## Les questions
<!-- Le contenu de la FAQ, dans l'ordre d'affichage. -->
**Avant le séjour : le gîte et la salle**

1. **Qui paie quoi ?** Il y a quatre sources de dépenses : le gîte, la salle, les courses de la réserve, et les dépenses qu'on partage entre quelques-uns. Seuls les ploucs qui viennent (ceux qui ont des dates dans [Présence](../gite/presence.md)) paient. *Un petit schéma des quatre sources.*
2. **Comment est calculée ma part du gîte ?** Au prorata des nuits : on divise le prix du gîte par le total des nuitées, puis on multiplie par mes nuits. *Exemple : 1 400 € / 50 nuitées = 28 €, et Bill reste 5 nuits : 140 €.*
3. **Et la salle ?** Selon le mode choisi par le staff, affiché avec le repère « actif » : *à parts égales* (le montant divisé par le nombre de ploucs qui viennent) ou *comme le gîte* (au prorata des nuits).
4. **Pourquoi le prix bouge, puis ne bouge plus ?** Ça se passe en deux temps. Tant que les paiements ne sont pas ouverts, le prix est une estimation qui baisse quand on est plus nombreux. À l'ouverture des paiements, chacun a sa part, figée. *Une frise : inscriptions → ouverture des paiements → séjour → clôture.*
5. **Certains ne paient pas ?** Des exemptions peuvent être décidées en communauté (quelqu'un qu'on ne fait pas dormir par terre, ou qui paie déjà très cher pour venir). Elles restent anonymes : on n'affiche que leur nombre, et leur part se répartit sur les autres.
6. **Comment je paie ?** L'appli ne fait pas de virement. Je paie l'hébergeur avec un de ses moyens (Wero, PayPal, IBAN), je déclare « j'ai payé », et il confirme qu'il a reçu. Un paiement peut être partiel. *Lien vers [Créances](creances.md).*
7. **J'arrive en retard, ou je reste plus longtemps ?** Après l'ouverture des paiements, je suis retardataire : je dors dans un gîte que les autres ont payé, donc je leur dois mes nuits en plus. Les courses servent de tampon, et ce qui reste se rembourse en direct. *Exemple : Evelyne ajoute 2 nuits. Elle doit 1 400 € / 52 × 2 = 53,85 €, réparti entre ceux qui ont payé au prorata de leurs nuits : 5,38 € à Bill.*
8. **Je retire des nuits, ou je ne viens plus ?** Avant l'ouverture des paiements, tout se recalcule, sans souci. Après, ce qui est payé est payé : pas de remboursement. Le gîte a été réservé et avancé pour toi.
9. **Je ne peux pas payer à temps ?** Tu reçois des rappels jusqu'à la date limite. Ensuite, contacte l'hébergeur pour trouver un arrangement ([Contacter le staff](../communaute/contact-staff.md), en attendant les messages privés). S'il accepte un report, ce qui reste devient une dette envers lui dans Mes comptes, à régler quand tu peux. *Rappel de l'encadré ATTENTION.*
10. **Comment marche l'acompte ?** Le pourcentage du prévisionnel demandé, la date limite, et le paiement qui vaut inscription. Une régularisation suit après le séjour. *Affichée seulement si l'acompte est activé.*

**Pendant le séjour : les dépenses et les repas**

11. **J'ai payé pour le groupe : je fais quoi ?** Je saisis la dépense dans [Dépenses](depenses.md), avec la photo du ticket, et je l'envoie. Un staff la valide, ou me la renvoie avec un motif. Une fois validée, elle compte dans les comptes de chacun. *Le schéma : Brouillon → En attente → Validée. C'est un autre staff qui valide, ou le staff lui-même s'il est seul.*
12. **Parts égales, montants exacts ou communauté ?** Trois façons de partager une dépense. *Exemples : le resto où chacun paie autant (parts égales), le McDo où chacun a pris autre chose (montants exacts), les courses du Leclerc pour la réserve (communauté).*
13. **Comment les courses sont-elles réparties ?** Par catégories. Une catégorie obligatoire concerne tout le monde, une facultative seulement ceux qui l'ont cochée dans [Ma fiche](../compte/ma-fiche.md). Chacune a sa règle : à parts égales, au prorata des repas ou au prorata des nuits. *Le tableau des catégories réelles, construit en direct.*
14. **Je ne bois pas d'alcool : pourquoi je paierais ?** Tu ne paies pas : seuls ceux qui ont coché Alcool dans Ma fiche y participent. Changer une coche ne vaut que pour les dépenses validées ensuite. *Exemple : Bob achète du Monster sans en boire, les buveurs le remboursent en entier.*
15. **C'est quoi « NON GÉRÉ » ?** Un achat perso glissé dans le panier commun : il reste à la charge de celui qui a payé. Un ticket qui mélange perso et commun se règle entre vous. *Exemple : le sandwich de Bob dans les courses.*
16. **J'ai mangé ailleurs : pourquoi je paie ?** C'est [Mes repas](../repas/mes-repas.md) qui compte : par défaut, tu manges sur la réserve. Décoche le repas avant qu'il commence (8 h, 12 h, 19 h). Ensuite, il est figé.
17. **Le ticket se lit tout seul ?** Oui : l'appli lit la photo et préremplit la dépense. C'est à toi de vérifier avant d'envoyer. *Affichée seulement si un LLM est configuré.*
18. **Pourquoi 3,34 € au lieu de 3,33 € ?** Tout se compte au centime, et le centime en trop va à celui qui a payé. *Exemple : 10 € à 3, c'est 3,33 + 3,33 + 3,34 €.*
19. **Une erreur a été validée : que faire ?** Une dépense validée est définitive. On s'arrange entre ploucs.

**Après le séjour (et pendant) : on se rembourse**

20. **Que veut dire mon solde ?** C'est ce que j'ai avancé pour les autres, moins ce que je dois. Rouge : je dois. Vert : on me doit. Gris : je suis quitte. *Exemple : Bob, « Tu dois 42,30 € ».*
21. **Remboursement direct ou minimum de virements ?** En direct, chacun rembourse ceux qui ont payé pour lui. En minimum de virements, on fait le moins de virements possible, quitte à rembourser quelqu'un qui n'a rien payé pour soi. *Le repère « actif ». Exemple : Bill doit 10 € à Bob, et Bob doit 10 € à Martine. En direct, 2 virements. En minimum, un seul : Bill paie 10 € à Martine. Lien vers [Flux](flux.md) à partir du jalon 5.*
22. **Un report, un trop-payé du gîte : avec qui ?** En direct, c'est toujours entre toi et l'hébergeur : un report est une dette envers lui, un trop-payé une dette de lui envers toi.
23. **Comment je rembourse ?** Avec un des moyens de la personne, puis je déclare « j'ai remboursé ». Elle confirme qu'elle a reçu. Sans réponse de sa part, elle reçoit une dernière notification au bout de 7 jours, et le remboursement est confirmé d'office 24 h plus tard. *Lien vers [Mes comptes](mes-comptes.md).*
24. **Comment on me rembourse ?** Renseigne tes moyens dans [Me rembourser](../compte/me-rembourser.md) : Wero, PayPal, IBAN (masqué, sauf pour ceux qui te doivent de l'argent), espèces. Il n'y a pas de paiement par carte : il faudrait un compte commerçant, avec des frais.
25. **Relancer, faire grâce ?** Relancer envoie un petit rappel, une fois par 24 h au plus. Faire grâce efface tout ou partie d'une dette : c'est irréversible, et c'est celui qui fait grâce qui absorbe le montant.
26. **Quand est-ce que tout est fini ?** Après le séjour, le staff clôture les comptes : plus de nouvelle dépense, et chacun reçoit son plan final de virements. Les remboursements restent possibles jusqu'à ce que tout le monde soit quitte.

**Ce que l'outil ne gère pas**

27. **Ce qui reste en dehors de l'appli** : les revenus (consignes, restes revendus), les tickets qui mélangent perso et commun, et les paiements par carte. Tout ça se règle entre ploucs.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- Déplier ou replier une question, et son « En détail ».
- Suivre un lien vers une autre page : Créances, Présence, Dépenses, Ma fiche, Mes repas, Mes comptes, Me rembourser, Contacter le staff, et Flux à partir du jalon 5.
- **Pour arriver ici** : un lien « Comment ça marche ? » se trouve sur [Dépenses](depenses.md), [Mes comptes](mes-comptes.md), [Créances](creances.md), [Présence](../gite/presence.md) et [Mes repas](../repas/mes-repas.md). Il ouvre directement la bonne question, dépliée.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Le texte** est rangé dans un fichier du dépôt (Markdown ou JSON) : il est versionné dans git, et le webmaster le modifie directement.
- **Ce que la page lit en direct** :
  - le mode de remboursement actif et les catégories, dans [Réglages compta](../staff/reglages-compta.md) ;
  - la répartition de la salle et la date limite de paiement, dans [Gîte et salle](../staff/gite-salle.md) ;
  - si l'acompte est activé, dans [Prévisionnel](../staff/previsionnel.md) ;
  - si un LLM est configuré, dans [Réglages LLM](../staff/reglages-llm.md).

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le texte est fixe, mais les réglages sont lus en direct.** La page ne peut donc jamais contredire les réglages du staff :
  - un repère « actif » s'affiche sur le mode de remboursement et sur la répartition de la salle en vigueur ;
  - la question sur l'acompte est masquée s'il n'est pas activé, celle sur la lecture du ticket si aucun LLM n'est configuré ;
  - le tableau des catégories est construit à partir des catégories réelles.
- **Les exemples chiffrés** suivent les règles de [Dépenses](depenses.md) et de [Créances](creances.md) : calcul en centimes, reste au payeur. Ils utilisent toujours les mêmes personnages et les mêmes chiffres.
- **Le ton** est celui du groupe : on tutoie, on parle aux ploucs.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un lien vers une question qui n'existe pas**, ou qui est masquée (l'acompte non activé) : la page s'ouvre en haut, sur l'encadré ATTENTION.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Gîte et salle](../staff/gite-salle.md)
<!-- /nav -->
