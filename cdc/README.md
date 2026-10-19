# Nouvel An à la Groutte : cahier des charges

L'appli de préparation du séjour : inscription, présences, couchages, repas, budget, tournois, souvenirs. Elle remplace Discord pour le groupe. Elle est construite sur `Squelette-PWA` (voir son README pour la technique).

Le brouillon d'origine, avec toutes les questions et réponses, est dans [archives/brouillon-origine.md](archives/brouillon-origine.md).

## Infos générales

|              |                                                                        |
| ------------ | ---------------------------------------------------------------------- |
| Dates        | du 28/12/2026 au 03/01/2027                                            |
| Lieu         | un gîte de 10 couchages, calme, pour dormir ; une salle des fêtes pour la vie de la semaine |
| Ploucs | la liste se fait au fil des inscriptions, jusqu'à une date limite      |
| Budget       | un prévisionnel : dépenses de l'année précédente + dépenses estimables |

## Principes

- **C'est d'abord un outil de préparation.** Il servira avant, pendant et après le séjour, et évoluera.
- **On s'appelle « les ploucs ».** Dans l'appli comme entre nous, un participant est un **plouc**.
  - **Seuls les ploucs qui viennent comptent dans les parts** : ceux qui ont des dates dans [Présence](gite/presence.md). Un compte sans dates ne paie ni le gîte, ni la salle, ni les repas, qu'il ait touché « Je ne viens pas » ou qu'il n'ait pas encore répondu.
- **Deux niveaux de droits seulement : plouc et staff.**
  - Les staffs de départ sont dans `config.json`. Ensuite, un staff peut nommer un autre staff.
  - Les **rôles** sont des étiquettes affichées dans le carnet d'adresses. Ils ne donnent aucun droit sur l'appli (voir [Rôles](#rôles-rolesjson)).
- **Inscription libre.** À l'installation, on crée un compte ou on se connecte à un compte existant.
  - Chaque compte a son code à 4 chiffres. Après 5 erreurs, il est bloqué quelques minutes.
  - Un staff peut remettre un code à zéro.
  - Les comptes sont dans un fichier JSON de `data/`, qu'on peut aussi modifier à la main.
- **Quand une règle n'est pas encore tranchée, c'est un réglage du staff** : répartition de la salle, mode de remboursement, LLM.
- **Le réseau au gîte est inconnu.** Le mode hors ligne (un Raspberry Pi avec un hotspot wifi) est reporté. S'il devient nécessaire, une page Staff expliquera comment le mettre en place.
- **Hors de l'outil** : le nettoyage de fin de séjour.

## Périmètre

**Dedans** : les pages du tableau [Les pages](#les-pages) de priorité 1 à 4, et l'appli qui les porte (Groutte-PWA) : l'inscription, la présence, les couchages, les repas, le budget, les tournois, la communauté et les outils du staff.

**Dehors** :
- le nettoyage de fin de séjour (hors de l'outil) ;
- les pages de priorité 5, reportées : le mode hors ligne, le SAM et celles marquées ainsi dans le tableau ;
- ce qui reste en [Questions ouvertes](#questions-ouvertes) n'est pas codé tant que ce n'est pas tranché.

## Rôles (`roles.json`)

Les rôles sont des étiquettes qui disent qui fait quoi, ou qui a quoi. Ils s'affichent dans le [Carnet d'adresses](compte/carnet.md) et **ne donnent aucun droit sur l'appli** : seul le droit staff en donne.

La liste est dans `roles.json`, à la racine de l'appli. Ce fichier est versionné dans git, et c'est le webmaster qui le modifie.

**Les trois types de rôles**

| Type | Qui l'attribue | Où |
| --- | --- | --- |
| `libre` | chacun se l'attribue lui-même, et le staff peut aussi le poser | [Ma fiche](compte/ma-fiche.md), ou [Staff > Comptes](staff/comptes.md) |
| `staff` | seulement le staff | [Staff > Comptes](staff/comptes.md) |
| `automatique` | personne : il découle d'un autre réglage | indiqué par `source` |

**Le champ `actions`** : un rôle peut déclencher des actions en plus de l'étiquette. Pour l'instant, seul Hébergeur en a.

**Un rôle `automatique`** ne se coche pas dans Ma fiche et ne s'attribue pas dans Staff > Comptes : il suit sa `source` (Gîte et salle pour Hébergeur, Menu pour Chef).

**La liste de départ**

| Rôle       | Type          | Ce que ça veut dire                                                                                                                                                                                      |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hébergeur  | `automatique` | a avancé le gîte ou la salle. Il est désigné dans [Gîte et salle](staff/gite-salle.md), et doit être staff. Il reçoit et confirme les paiements, et accepte les reports et les inscriptions tardives |
| Clés       | `staff`       | a les clés du gîte : c'est lui qu'on appelle Attention, il aura besoin d'un page pour dire su'il les file a quelqu'un.                                                                                   |
| Logistique | `staff`       | responsable (non officiel) de la logistique                                                                                                                                                              |
| Nourriture | `staff`       | responsable (non officiel) de la nourriture                                                                                                                                                              |
| Budget     | `staff`       | responsable (non officiel) du budget                                                                                                                                                                     |
| Activités  | `staff`       | responsable (non officiel) des activités et des tournois                                                                                                                                                 |
| Média      | `staff`       | responsable (non officiel) des photos, vidéos et musique                                                                                                                                                 |
| Chef       | `automatique` | a proposé au moins un plat dans [Menu](repas/menu.md). Il apparaît tout seul, et disparaît si la personne n'a plus aucun menu                                                                       |
| Cuisine    | `libre`       | aime cuisiner, et se propose pour les repas                                                                                                                                                              |
| Ménage     | `libre`       | se propose pour le ménage                                                                                                                                                                                |
| Permis     | `libre`       | a le permis de conduire                                                                                                                                                                                  |
| Véhicule   | `libre`       | vient avec une voiture                                                                                                                                                                                   |
| Fumeur     | `libre`       | fume                                                                                                                                                                                                     |

Le SAM n'est pas un rôle : il se décide de vive voix pendant la semaine. La page [SAM](gite/sam.md) est reportée.

```json
[
  {"id": "hebergeur",  "nom": "Hébergeur",  "type": "automatique", "source": "gite-salle",
   "actions": ["recevoir-paiements", "confirmer-paiements", "accepter-reports", "accepter-inscriptions-tardives"]},
  {"id": "cles",       "nom": "Clés",       "type": "staff"},
  {"id": "logistique", "nom": "Logistique", "type": "staff"},
  {"id": "nourriture", "nom": "Nourriture", "type": "staff"},
  {"id": "budget",     "nom": "Budget",     "type": "staff"},
  {"id": "activites",  "nom": "Activités",  "type": "staff"},
  {"id": "media",      "nom": "Média",      "type": "staff"},
  {"id": "chef",       "nom": "Chef",       "type": "automatique", "source": "menu"},
  {"id": "cuisine",    "nom": "Cuisine",    "type": "libre"},
  {"id": "menage",     "nom": "Ménage",     "type": "libre"},
  {"id": "permis",     "nom": "Permis",     "type": "libre"},
  {"id": "vehicule",   "nom": "Véhicule",   "type": "libre"},
  {"id": "fumeur",     "nom": "Fumeur",     "type": "libre"}
]
```

## Le modèle de présence (commun à Gîte, Repas et Budget)

- Chaque personne saisit une **arrivée** et un **départ**, chacun sous la forme *date + créneau*.
- Il y a 4 créneaux :

  | Créneau | Ce qu'il compte |
  | ------- | --------------- |
  | Matin   | petit-déjeuner  |
  | Midi    | déjeuner        |
  | Soir    | dîner           |
  | Nuit    | nuitée          |

- Il n'y a pas d'après-midi. Un texte d'aide explique comment choisir.
- L'arrivée est le premier créneau compté, le départ le dernier.
- Un seul séjour par personne : pas d'allers-retours.
- On en déduit, pour chacun, **ses nuits et ses repas**. Les nuits servent au prix du gîte et aux couchages. Les repas sont la partie la plus souple : par défaut on mange sur la réserve, et chacun décoche les repas qu'il prend ailleurs dans [Mes repas](repas/mes-repas.md). Les courses de la catégorie Alimentaire se répartissent au prorata des repas pris.

## Les pages

Chaque page a sa fiche dans `cdc/<groupe>/`, décrite avec précision : but, qui voit et qui agit, écran, actions, données, règles et calculs, notifications, cas limites, questions ouvertes. Pour une nouvelle page, copier `cdc/_modele.md`.

| Groupe     | Page                                                        | Priorité | Statut   |
| ---------- | ----------------------------------------------------------- | -------- | -------- |
| Staff      | [Comptes](staff/comptes.md)                             | 1        | validé   |
| Compte     | [Inscription et connexion](compte/inscription.md)       | 1        | validé   |
| Compte     | [Ma fiche](compte/ma-fiche.md)                          | 1        | validé   |
| Compte     | [Me rembourser](compte/me-rembourser.md)                | 1        | validé   |
| Compte     | [Notifications](compte/notifications.md)                | 1        | validé   |
| Compte     | [Carnet d'adresses](compte/carnet.md)                   | 1        | validé   |
| Communauté | [Forum](communaute/forum.md)                            | 2        | validé   |
| Gîte       | [Présence](gite/presence.md)                            | 2        | validé   |
| Gîte       | [Lits](gite/lits.md)                                    | 2        | validé   |
| Budget     | [Mes comptes](budget/mes-comptes.md)                    | 2        | validé   |
| Budget     | [Créances gîte et salle](budget/creances.md)            | 2        | validé   |
| Budget     | [Dépenses](budget/depenses.md)                          | 2        | validé   |
| Budget     | [Comment ça marche](budget/comment-ca-marche.md)        | 2        | validé   |
| Staff      | [Gîte et salle](staff/gite-salle.md)                    | 2        | validé   |
| Staff      | [Réglages compta](staff/reglages-compta.md)             | 2        | validé   |
| Staff      | [Validation des dépenses](staff/validation-depenses.md) | 2        | validé   |
| Communauté | [Contacter le staff](communaute/contact-staff.md)       | 2        | validé   |
| Repas      | [Mes repas](repas/mes-repas.md)                         | 2        | validé   |
| Staff      | [Réglages LLM](staff/reglages-llm.md)                   | 3        | validé   |
| Repas      | [Menu](repas/menu.md)                                   | 3        | validé   |
| Staff      | [Suivi des dépenses](staff/suivi-depenses.md)           | 3        | validé   |
| Staff      | [Annonces](staff/annonces.md)                           | 3        | validé   |
| Communauté | [Pings reçus](communaute/pings.md)                      | 3        | validé   |
| Communauté | [Messages](communaute/messages.md)                      | 4        |          |
| Tournois   | [Jeux](tournois/jeux.md)                                | 4        |          |
| Tournois   | [Planning](tournois/planning.md)                        | 4        |          |
| Tournois   | [Règlements](tournois/reglements.md)                    | 4        |          |
| Tournois   | [Leaderboard](tournois/leaderboard.md)                  | 4        |          |
| Drop box   | [Photos et vidéos](dropbox/photos-videos.md)            | 4        |          |
| Drop box   | [Musique](dropbox/musique.md)                           | 4        |          |
| Drop box   | [POV du tournoi](dropbox/pov-tournoi.md)                | 4        |          |
| Gîte       | [SAM](gite/sam.md)                                      | 5        |          |
| Gîte       | [Clés](gite/cles.md)                                    | 5        |          |
| Staff      | [Checklist d'avancement](staff/checklist.md)            | 5        |          |
| Staff      | [Hors ligne](staff/hors-ligne.md)                       | 5        |          |
| Budget     | [Flux](budget/flux.md)                                  | 5        |          |
| Staff      | [Prévisionnel](staff/previsionnel.md)                   | 5        |          |

**C'est ce tableau qui fait foi** pour la priorité et le statut de chaque page : les fiches ne les répètent pas.

- **Priorité** : 1 socle, 2 essentiel, 3 ensuite, 4 puis, 5 reporté.
- **Statut** :
  - *rédigé* : la fiche est écrite, elle attend d'être relue ;
  - *validé* : relue et acceptée ;
  - *à revoir* : validée, puis modifiée par un jalon suivant (ici le jalon 3 ; les notes de relecture sont dans `prive/`).

> **Note pour le code du jalon 3** : les pages *à revoir* sont déjà codées (jalons 1 et 2), mais leur fiche a changé depuis. En codant le jalon 3, il faut aussi reporter ces changements dans le code existant. Pour les retrouver, comparer les fiches avec la branche `main` (`git diff main -- cdc/ README.md`), ou, si tout est déjà fusionné, avec le dernier commit du jalon 2 (`git diff 2a6a07f -- cdc/ README.md`). Une fois reportés, la page repasse en *validé*.

## Données à fournir

Les dépenses de l'année précédente, à fournir deux fois :
- d'abord pour vérifier que l'outil sait toutes les gérer ;
- puis comme jeu de données de démonstration.

## Questions ouvertes

- **Les dates** :
  - la date limite d'inscription ;
  - la date de paiement du gîte et de la salle ;
  - le budget maximum accepté par le groupe.
- **Le consentement photo** : quel effet concret ? Une simple information, ou des fichiers masqués ?
- **« Tournois ? » dans la fiche perso** : que doit-elle contenir ?
- **Messages** : seulement entre deux personnes, ou aussi des groupes ?

## Git et méthode

Le dépôt suit ma méthode de travail commune (sous-module `methode/`) : tronc `main`, Conventional Commits, documentation vivante, cadrage avant de coder. Le détail est dans [methode/regles/](../methode/regles/). Avant chaque commit, la syntaxe se vérifie dans `Groutte-PWA/` (`python3 -m py_compile serveur/*.py`, `node --check static/js/*.js`).
