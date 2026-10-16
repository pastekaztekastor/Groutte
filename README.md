# Nouvel An à la Groutte : cahier des charges

L'appli de préparation du séjour : inscription, présences, couchages, repas, budget, tournois, souvenirs. Elle remplace Discord pour le groupe. Elle est construite sur `Squelette-PWA` (voir son README pour la technique).

Le brouillon d'origine, avec toutes les questions et réponses, est dans `README.brouillon.md`.

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
  - **Seuls les ploucs qui viennent comptent dans les parts** : ceux qui ont des dates dans [Présence](cdc/gite/presence.md). Un compte sans dates (« Je ne viens pas ») ne paie ni le gîte, ni la salle, ni les repas.
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

## Rôles (`roles.json`)

Les rôles sont des étiquettes qui disent qui fait quoi, ou qui a quoi. Ils s'affichent dans le [Carnet d'adresses](cdc/compte/carnet.md) et **ne donnent aucun droit sur l'appli** : seul le droit staff en donne.

La liste est dans `roles.json`, à la racine de l'appli. Ce fichier est versionné dans git, et c'est le webmaster qui le modifie.

**Les trois types de rôles**

| Type | Qui l'attribue | Où |
| --- | --- | --- |
| `libre` | chacun se l'attribue lui-même, et le staff peut aussi le poser | [Ma fiche](cdc/compte/ma-fiche.md), ou [Staff > Comptes](cdc/staff/comptes.md) |
| `staff` | seulement le staff | [Staff > Comptes](cdc/staff/comptes.md) |
| `automatique` | personne : il découle d'un autre réglage | indiqué par `source` |

**Le champ `actions`** : un rôle peut déclencher des actions en plus de l'étiquette. Pour l'instant, seul Hébergeur en a.

**La liste de départ**

| Rôle       | Type          | Ce que ça veut dire                                                                                                                                                                                      |
| ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hébergeur  | `automatique` | a avancé le gîte ou la salle. Il est désigné dans [Gîte et salle](cdc/staff/gite-salle.md), et doit être staff. Il reçoit et confirme les paiements, et accepte les reports et les inscriptions tardives |
| Clés       | `staff`       | a les clés du gîte : c'est lui qu'on appelle Attention, il aura besoin d'un page pour dire su'il les file a quelqu'un.                                                                                   |
| Logistique | `staff`       | responsable (non officiel) de la logistique                                                                                                                                                              |
| Nourriture | `staff`       | responsable (non officiel) de la nourriture                                                                                                                                                              |
| Budget     | `staff`       | responsable (non officiel) du budget                                                                                                                                                                     |
| Activités  | `staff`       | responsable (non officiel) des activités et des tournois                                                                                                                                                 |
| Média      | `staff`       | responsable (non officiel) des photos, vidéos et musique                                                                                                                                                 |
| Cuisine    | `libre`       | aime cuisiner, et se propose pour les repas                                                                                                                                                              |
| Ménage     | `libre`       | se propose pour le ménage                                                                                                                                                                                |
| Permis     | `libre`       | a le permis de conduire                                                                                                                                                                                  |
| Véhicule   | `libre`       | vient avec une voiture                                                                                                                                                                                   |
| Fumeur     | `libre`       | fume                                                                                                                                                                                                     |

Le rôle de SAM n'est pas dans cette liste : on se désigne SAM jour par jour, sur la page [SAM](cdc/gite/sam.md).

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
- On en déduit, pour chacun, **ses nuits et ses repas**. Les nuits servent au prix du gîte et aux couchages. Les repas sont la partie la plus souple : par défaut on mange sur la réserve, et chacun décoche les repas qu'il prend ailleurs dans [Mes repas](cdc/repas/mes-repas.md). Les courses de la catégorie Alimentaire se répartissent au prorata des repas pris.

## Les pages

Chaque page a sa fiche dans `cdc/<groupe>/`, décrite avec précision : but, qui voit et qui agit, écran, actions, données, règles et calculs, notifications, cas limites, questions ouvertes. Pour une nouvelle page, copier `cdc/_modele.md`.

| Groupe     | Page                                                        | Priorité |
| ---------- | ----------------------------------------------------------- | -------- |
| Staff      | [Comptes](cdc/staff/comptes.md)                             | 1        |
| Compte     | [Inscription et connexion](cdc/compte/inscription.md)       | 1        |
| Compte     | [Ma fiche](cdc/compte/ma-fiche.md)                          | 1        |
| Compte     | [Me rembourser](cdc/compte/me-rembourser.md)                | 1        |
| Compte     | [Notifications](cdc/compte/notifications.md)                | 1        |
| Compte     | [Carnet d'adresses](cdc/compte/carnet.md)                   | 1        |
| Communauté | [Forum](cdc/communaute/forum.md)                            | 2        |
| Gîte       | [Présence](cdc/gite/presence.md)                            | 2        |
| Gîte       | [Lits](cdc/gite/lits.md)                                    | 2        |
| Budget     | [Mes comptes](cdc/budget/mes-comptes.md)                    | 2        |
| Budget     | [Créances gîte et salle](cdc/budget/creances.md)            | 2        |
| Budget     | [Dépenses](cdc/budget/depenses.md)                          | 2        |
| Budget     | [Comment ça marche](cdc/budget/comment-ca-marche.md)        | 2        |
| Staff      | [Gîte et salle](cdc/staff/gite-salle.md)                    | 2        |
| Staff      | [Réglages compta](cdc/staff/reglages-compta.md)             | 2        |
| Gîte       | [Literie](cdc/gite/literie.md)                              | 3        |
| Gîte       | [SAM](cdc/gite/sam.md)                                      | 3        |
| Repas      | [Événements repas](cdc/repas/repas.md)                      | 3        |
| Staff      | [Prévisionnel](cdc/staff/previsionnel.md)                   | 3        |
| Staff      | [Suivi des dépenses](cdc/staff/suivi-depenses.md)           | 3        |
| Staff      | [Annonces](cdc/staff/annonces.md)                           | 3        |
| Communauté | [Messages](cdc/communaute/messages.md)                      | 4        |
| Tournois   | [Jeux](cdc/tournois/jeux.md)                                | 4        |
| Tournois   | [Planning](cdc/tournois/planning.md)                        | 4        |
| Tournois   | [Règlements](cdc/tournois/reglements.md)                    | 4        |
| Tournois   | [Leaderboard](cdc/tournois/leaderboard.md)                  | 4        |
| Drop box   | [Photos et vidéos](cdc/dropbox/photos-videos.md)            | 4        |
| Drop box   | [Musique](cdc/dropbox/musique.md)                           | 4        |
| Drop box   | [POV du tournoi](cdc/dropbox/pov-tournoi.md)                | 4        |
| Gîte       | [Clés](cdc/gite/cles.md)                                    | 5        |
| Staff      | [Checklist d'avancement](cdc/staff/checklist.md)            | 5        |
| Staff      | [Hors ligne](cdc/staff/hors-ligne.md)                       | 5        |
| Budget     | [Flux](cdc/budget/flux.md)                                  | 5        |
| Staff      | [Validation des dépenses](cdc/staff/validation-depenses.md) | 2        |
| Staff      | [Réglages LLM](cdc/staff/reglages-llm.md)                   | 3        |
| Communauté | [Contacter le staff](cdc/communaute/contact-staff.md)       | 2        |
| Repas      | [Mes repas](cdc/repas/mes-repas.md)                         | 2        |

## Priorités

Un résumé. En cas d'écart, c'est le tableau [Les pages](#les-pages) qui fait foi.

1. **Le socle** :
   - inscription et code par compte ;
   - rôle staff ;
   - fiche perso ;
   - carnet d'adresses.
2. **L'essentiel** :
   - Forum ;
   - Présence, Lits ;
   - Budget avec saisie à la main : dépenses, créances, mes comptes ;
   - Staff : gîte et salle, réglages compta.
3. **Ensuite** :
   - lecture des tickets par LLM (Staff > Réglages LLM) ;
   - prévisionnel ;
   - Repas ;
   - Literie ;
   - SAM ;
   - annonces ciblées.
4. **Puis** : Tournois, Drop box, Messages.
5. **Reporté** : clés, checklist staff, hors ligne, graphe des flux.

## Données à fournir

Les dépenses de l'année précédente, à fournir deux fois :
- d'abord pour vérifier que l'outil sait toutes les gérer ;
- puis comme jeu de données de démonstration.

## Questions ouvertes

- **Le réveillon** : comment le financer et l'organiser ?
- **Les dates** :
  - la date limite d'inscription ;
  - la date de paiement du gîte et de la salle ;
  - le budget maximum accepté par le groupe.
- **Le consentement photo** : quel effet concret ? Une simple information, ou des fichiers masqués ?
- **« Tournois ? » dans la fiche perso** : que doit-elle contenir ?
- **Messages** : seulement entre deux personnes, ou aussi des groupes ?

## Git

Le dépôt suit le **Trunk Based Development** : `main` est le tronc, et il doit toujours marcher.

- **Petits commits fréquents**, directement sur `main` ou sur une branche courte (quelques heures, un jour au plus) qu'on fusionne vite.
- **Pas de branche longue** : ni `develop`, ni branche de version.
- **Une page pas finie arrive quand même dans `main`**, mais cachée derrière un réglage (par exemple une option dans `config.json`) tant qu'elle n'est pas prête.
- **Avant chaque commit**, on vérifie la syntaxe : `python3 -m py_compile *.py` et `node --check static/js/*.js` dans `Squelette-PWA/`.
- **Messages de commit en français**, qui disent ce qui change.
- **`data/` ne va jamais dans git** (voir `.gitignore`) : ce sont les vraies données, à sauvegarder à part.
