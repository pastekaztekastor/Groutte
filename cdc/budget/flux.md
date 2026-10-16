<!-- nav -->
[Précédent : Événements repas](../repas/repas.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Budget > Flux

- **Priorité** : 5
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Voir d'un coup d'œil qui doit combien à qui, sous la forme d'un graphe en réseau.
- On peut l'afficher dans les deux modes de remboursement, pour comprendre la différence entre les deux.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- **Tout le monde** voit le graphe complet.
- **Personne n'agit ici.** On consulte seulement : les remboursements se font dans [Mes comptes](mes-comptes.md).

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
De haut en bas :
1. **Le choix du mode** : un contrôle à deux positions, *Direct* et *Minimum de virements*.
   - Le mode choisi par le staff porte le repère « actif ».
   - L'autre mode s'affiche à titre d'information.
2. **Le graphe** :
   - **Une bulle par personne**, avec sa photo et son nom. La taille de la bulle dépend de son solde net.
   - **La couleur suit un dégradé** selon le solde :
     - le plus gros débiteur est en **rouge pur** ;
     - le plus gros créancier est en **vert pur** ;
     - une personne quitte est en **gris neutre** ;
     - entre les deux, la couleur glisse progressivement du gris vers le rouge ou vers le vert.
   - Le rouge et le vert sont ceux du squelette (`tokens.css`), qui servent déjà aux erreurs et aux succès. Le dégradé marche donc en mode clair comme en mode sombre.
   - **Une flèche courbe par dette** (une courbe de Bézier), dans le sens où l'argent doit aller, avec le montant écrit dessus.
   - **Ma bulle** est entourée, pour que je me repère tout de suite.
3. **La même chose en liste**, sous le graphe : « Bob → Alice : 32,50 € ». La liste est plus lisible sur un petit écran, et elle sert aussi aux lecteurs d'écran.
4. Un lien « Comment ça marche ? » vers la [FAQ du budget](comment-ca-marche.md), à la question sur les deux modes.

```
 [ Direct | Minimum de virements (actif) ]

          (Alice)  vert, gros
         ^       ^
   32,50 |       | 18,00
         |       |
     (Bob)     (Chloé)----12,00---->(David)
     rouge       rouge               vert
                                      ^
                          (Emma) gris |
                                      |
                (Fred) rouge --9,00---+

 Bob → Alice      32,50 €
 Chloé → Alice    18,00 €
 Chloé → David    12,00 €
 Fred → David      9,00 €
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Changer de mode** : le graphe et la liste se redessinent.
- **Toucher une bulle** affiche le détail de la personne :
  - ce qu'elle a payé ;
  - ce qu'elle doit ;
  - son solde net.
- **Toucher une flèche** (en mode direct seulement) affiche les dépenses qui composent cette dette, avec un lien vers chacune.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Rien n'est enregistré** : tout est calculé à partir de ce que montre [Mes comptes](mes-comptes.md) :
  - les dépenses validées ;
  - les parts du gîte et de la salle qui restent dues ;
  - les reports ;
  - les avoirs ;
  - les remboursements confirmés.
- **Ce qui est lu dans [Réglages compta](../staff/reglages-compta.md)** : le mode de remboursement actif.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Solde net** d'une personne = ce qu'on lui doit − ce qu'elle doit, en centimes. Il donne la taille et la couleur de sa bulle.
- **Mode direct** : une flèche par paire de personnes et par sens. Les dettes ne se compensent pas entre deux personnes.
  - Si A a payé 50 € pour B et que B a payé 100 € pour A, on voit **les deux flèches**.
  - La bulle de A, elle, montre le solde net : A doit 50 €.
- **Mode minimum de virements** : les flèches sont calculées pour faire le moins de virements possible. Il y en a au plus *nombre de personnes − 1*.
  - On associe le plus gros débiteur au plus gros créancier.
  - Le plus petit des deux montants devient une flèche.
  - On recommence jusqu'à ce que tout le monde soit quitte.
- **La couleur d'une bulle** : t = solde / plus grand |solde| du graphe, donc entre −1 et 1.
  - t = −1 donne le rouge pur, t = 0 le gris neutre, t = 1 le vert pur.
  - Le mélange se fait avec `color-mix` en espace `oklch`, pour un dégradé sans teinte boueuse au milieu.
- **La disposition est calculée pour éviter les croisements de flèches** :
  - **en mode minimum de virements**, le graphe est un arbre (ou plusieurs). On le dispose en étoile autour des plus gros créanciers : **aucun croisement**, c'est garanti ;
  - **en mode direct**, un dessin sans croisement n'existe pas toujours. Par exemple, 5 personnes qui se doivent toutes de l'argent entre elles se croisent forcément. On cherche alors **la disposition qui a le moins de croisements** : avec une dizaine de personnes, on peut tester les ordres possibles et garder le meilleur ;
  - **deux dettes opposées entre les mêmes personnes** (A → B et B → A) sont dessinées par deux courbes, bombées chacune d'un côté.
- **La disposition ne dépend que des données.** Les mêmes dettes donnent toujours le même dessin. La page est redessinée toutes les 30 secondes, et un graphe « physique » qui bougerait tout seul sauterait à chaque fois. Le dessin ne change que si les dettes changent.
- **Le dessin** se fait en SVG directement dans la page, sans bibliothèque, comme le reste du squelette.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Aucune dépense validée**, ou **tout le monde est quitte** : la page affiche « Tout le monde est quitte », sans graphe.
- **Beaucoup de flèches en mode direct** : sur téléphone, le graphe devient vite chargé. La liste reste la référence, et le graphe peut s'agrandir en plein écran.
- **Une personne exemptée** n'a aucune part de gîte ou de salle, mais elle apparaît quand même si elle a des dépenses.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Prévisionnel](../staff/previsionnel.md)
<!-- /nav -->
