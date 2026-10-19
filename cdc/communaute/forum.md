<!-- nav -->
[Précédent : Carnet d'adresses](../compte/carnet.md) · [Menu](../README.md#les-pages)
<!-- /nav -->

# Communauté > Forum


## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Les fils de discussion du groupe. On y trouve :
  - les règles du séjour (calme, bruit, hygiène, partage des espaces) ;
  - la sécurité et les contacts d'urgence ;
  - la FAQ générale ;
  - les tâches avant, pendant et après le séjour ;
  - tout le reste.
- **C'est le forum de NextSession, copié tel quel** (`forum.py`, `forum.js`, `reactions.py`, `reactions.js`, `flairs.json`, `reactions.json`). Seuls trois points changent :
  - les notifications (voir Règles et calculs) ;
  - les flairs, adaptés à la Groutte ;
  - la modération, faite par le staff au lieu du MJ.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Tous les ploucs** lisent, publient, commentent, votent et réagissent.
- **Un membre muet** peut tout lire, mais ne peut ni publier, ni commenter, ni répondre, ni réagir (voir [Staff > Comptes](../staff/comptes.md)).
- **Le staff** modère, comme le MJ de NextSession : il épingle, verrouille un fil, change un flair et supprime un post ou un commentaire. Il peut aussi masquer ses outils de modération avec le **mode modération**, sur l'appareil.
- **Chacun** modifie et supprime ses propres posts et commentaires.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**Comme dans NextSession** (façon Reddit) :
- **La liste des posts** :
  - les posts épinglés en haut ;
  - un filtre par flair ;
  - un tri par Date (le plus récemment actif), Réponses ou Votes, mémorisé sur l'appareil ;
  - une pastille « N nouveaux » sur chaque post.
- **Un post** : du texte ou un lien, un flair, jusqu'à 10 images dans une galerie qu'on fait défiler, et des votes « +1 » (pas de vote négatif).
- **Les commentaires** :
  - en arbre, avec le badge OP pour l'auteur du post ;
  - jusqu'à 4 images par commentaire ;
  - un tri par Meilleurs ou Nouveaux ;
  - au-delà de 4 niveaux, « Continuer le fil ».
  - Toucher un commentaire l'ouvre comme un fil à part (`#forum/<post>/<commentaire>`).
- **Les réactions en texte** sous chaque message, prises dans `reactions.json` : `T_T`, `^_^`, `XD`, `+1`… Il n'y a pas d'emoji.
- **« Nouveau post »** : une bulle crayon en bas à droite sur téléphone, qui ouvre un écran à part (`#forum/nouveau`) avec « Annuler » en haut à gauche.
- **La zone d'envoi** collée en bas (`zone-message.js`), avec les images et les suggestions `@`.
- **Une icône cloche** en haut d'un post, qui indique si je suis ce fil (voir Règles et calculs).

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
Toutes les actions de NextSession :
- publier ;
- commenter et répondre ;
- voter « +1 » ;
- réagir ;
- mentionner avec `@` ;
- modifier ou supprimer ses messages ;
- et, pour le staff, épingler, verrouiller, changer un flair et supprimer.

**En plus :**
- **Suivre ou ne plus suivre un fil** : la cloche en haut du post.
  - Je suis automatiquement un fil dès que je le publie, que j'y réponds ou que j'y réagis.
  - « Ne plus suivre » coupe ses notifications, même si j'y ai participé.
  - « Suivre » permet de suivre un fil sans y écrire.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Comme dans NextSession** : `data/forum.json` (les posts, commentaires, votes et réactions), et les images dans `data/medias/`.
- **En plus**, sur chaque post, la liste de ceux qui le suivent, et la liste de ceux qui ne le suivent plus.
- **`flairs.json`** (dans le dépôt, modifié par le webmaster). Chaque flair a :
  - un nom, de 20 caractères au plus ;
  - une couleur ;
  - un champ **`staff`** : `true` si seul le staff peut publier avec ce flair.

  Les flairs de départ :

  | Flair       | Réservé au staff | Pour quoi                                                  |
  | ----------- | ---------------- | ---------------------------------------------------------- |
  | Règles      | oui              | les règles du séjour                                       |
  | Sécurité    | oui              | la sécurité et les contacts d'urgence                      |
  | Infos       | oui              | les infos pratiques officielles (accès au gîte, horaires…) |
  | FAQ         | non              | les questions qui reviennent                               |
  | Tâches      | non              | ce qu'il y a à faire avant, pendant et après le séjour     |
  | Covoiturage | non              | qui part d'où, qui a de la place                           |
  | Idées       | non              | les propositions pour le séjour                            |
  | Discussion  | non              | tout le reste                                              |
  | Tournoi     | non              | ce qui touche au tournoi                                   |
  | Gîte        | non              | ce qui touche au gîte                                      |

- **`reactions.json`** : repris de NextSession.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
**Les notifications** (catégorie « Forum », qu'on peut couper) :
- **Un nouveau post** : tout le monde reçoit une notification, sauf l'auteur.
- **Une réponse ou une réaction dans un fil** : seuls ceux qui **suivent ce fil** reçoivent une notification, sauf l'auteur de l'action.
  - On suit un fil automatiquement dès qu'on l'a publié, qu'on y a répondu ou qu'on y a réagi.
  - Sinon, on ne reçoit **rien** pour ce fil.
- **Les mentions** « @Nom » sont toujours reçues, même si la catégorie est coupée et même si on ne suit pas le fil. Elles remplacent la notification générale, comme dans NextSession.
- **Une notification remplace la précédente pour le même fil.** Dix réponses d'affilée ne donnent qu'une notification.

**Les pastilles « nouveau »** : comme dans NextSession (`lus.py`). Ouvrir un fil le marque comme lu, sur tous mes appareils.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Tout le monde, sauf l'auteur** : à chaque nouveau post, « Nouveau post de Bob : <titre> ».
- **Ceux qui suivent le fil** : à chaque réponse ou réaction, « Bob a répondu dans <titre> ».
- **La personne mentionnée** : « Bob t'a mentionné ».

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un plouc qui publie avec un flair réservé au staff** : la publication est refusée. Ces flairs ne sont même pas proposés aux ploucs.
- **Un fil verrouillé** : plus de commentaires ni de réactions. On peut toujours le lire et voter.
- **Un post supprimé** : ses images sont effacées du serveur, et ses commentaires disparaissent avec lui, comme dans NextSession.
- **Un membre muet** voit le champ d'écriture remplacé par « Tu ne peux plus écrire pour le moment ».
- **Je ne suis plus un fil, puis j'y réponds** : je le suis de nouveau.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../README.md#les-pages) · [Suivant : Présence](../gite/presence.md)
<!-- /nav -->
