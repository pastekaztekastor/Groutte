<!-- nav -->
[Précédent : Dépenses](../budget/depenses.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Comment ça marche

- **Priorité** : 2
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- C'est la FAQ du budget : elle explique comment on paie, comment on rembourse et comment on est remboursé.
  - les différents modes de remboursement et leurs différences ;
  - l'acompte, s'il est utilisé ;
  - les procédures de remboursement.
- C'est la seule page fixe de type FAQ dans l'appli : la FAQ générale est dans le forum. Elle est très importante.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- **Tout le monde** la voit.
- **Personne n'agit dans l'appli.** Seul le webmaster modifie le texte, en éditant le fichier sur le serveur.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**1. L'encadré ATTENTION**, toujours affiché en haut, bien visible, et impossible à replier :

> **ATTENTION**
>
> On a tous des soucis d'argent de temps en temps. Mais ne pas payer, c'est exposer ceux qui avancent l'argent à des soucis bien plus gros que les nôtres.
>
> Nous sommes une communauté d'amis : respectons-nous, et respectons ceux qui donnent de leur temps pour que nous passions les fêtes dans de si bonnes conditions.

**2. Les questions**, chacune avec sa réponse qui se déplie quand on touche la question :

```
Comment ça marche
┌───────────────────────────────────────────┐
│ ATTENTION                                 │
│ On a tous des soucis d'argent de temps en │
│ temps. Mais ne pas payer, c'est exposer...│
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│ > Comment une dépense entre dans les      │
│   comptes ?                               │
├───────────────────────────────────────────┤
│ v Remboursement direct ou minimum de      │
│   virements ?          [Mode actif : min.]│
│   Réponse dépliée...                      │
├───────────────────────────────────────────┤
│ > Comment marche l'acompte ?              │
└───────────────────────────────────────────┘
```

**Les questions**, dans cet ordre :
1. **Comment une dépense entre-t-elle dans les comptes ?** Brouillon → En attente → Validée. C'est un autre staff qui valide, ou le staff lui-même s'il est seul.
2. **Comment le gîte est-il réparti ?** Selon les nuits de présence. **Et la salle ?** Selon le réglage en cours, qui est affiché.
3. **Comment les courses sont-elles réparties ?**
   - Le tableau des catégories : Alimentaire, Monster, Alcool.
   - Ce que veut dire « NON GÉRÉ ».
4. **J'étais déclaré présent mais je n'ai pas mangé : pourquoi je paie ?** C'est la présence déclarée qui compte.
5. **Remboursement direct ou minimum de virements : quelle différence ?** Avec un petit exemple chiffré, le repère « Mode actif » et un lien vers [Flux](flux.md).
6. **Comment marche l'acompte ?** Le paiement vaut validation de l'inscription, puis une régularisation suit après le séjour. Cette question n'est affichée que si l'acompte est utilisé.
7. **Comment je rembourse, et comment on me rembourse ?** Les moyens de paiement, et un lien vers [Me rembourser](../compte/me-rembourser.md).
8. **Pourquoi 3,34 € au lieu de 3,33 € ?** L'arrondi au centime, et le reste qui va au payeur.
9. **Une erreur a été validée : que faire ?** C'est définitif. On s'arrange entre participants.
10. **J'ai dépassé la date limite de paiement ?** Contacter l'hébergeur en message privé, pour trouver un arrangement.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- Déplier ou replier une question.
- Suivre un lien vers une autre page : Flux, Me rembourser, Mes comptes, Créances.
- **Pour arriver ici** : un lien « Comment ça marche ? » se trouve sur [Dépenses](depenses.md), [Mes comptes](mes-comptes.md) et [Créances](creances.md). Il ouvre directement la bonne question, dépliée.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Le texte** est rangé dans un fichier du dépôt (Markdown ou JSON) : il est versionné dans git, et le webmaster le modifie directement.
- **Ce que la page lit ailleurs**, dans [Réglages compta](../staff/reglages-compta.md) et [Gîte et salle](../staff/gite-salle.md) :
  - le mode de remboursement actif ;
  - la répartition de la salle ;
  - si l'acompte est utilisé ou non ;
  - les catégories et leur règle.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Le texte est fixe, mais les réglages sont lus en direct.** La page ne peut donc jamais contredire les réglages du staff :
  - un repère « Mode actif » s'affiche sur la bonne réponse ;
  - la question sur l'acompte est masquée s'il n'est pas utilisé ;
  - le tableau des catégories est construit à partir des catégories réelles.
- Les exemples chiffrés reprennent les règles de [Dépenses](depenses.md) : calcul en centimes, reste au payeur.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un lien vers une question qui n'existe pas**, ou qui est masquée (l'acompte non utilisé) : la page s'ouvre en haut, sur l'encadré ATTENTION.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Gîte et salle](../staff/gite-salle.md)
<!-- /nav -->
