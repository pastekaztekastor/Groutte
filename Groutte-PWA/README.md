# Groutte PWA

L'appli du Nouvel An à la Groutte, construite sur le **socle PWA** partagé ([Squelette-PWA](https://github.com/pastekaztekastor/Squelette-PWA), le sous-module `socle/`). Le cahier des charges est dans [../cdc/README.md](../cdc/README.md). Ce README décrit ce qui est propre à Groutte ; le fonctionnement commun (serveur, état, comptes, notifications, design, déploiement) est dans [socle/README.md](socle/README.md). Ce qui reste à faire est dans `../TODO.md`.

**Jalon 1 (le socle)** : inscription et connexion, Ma fiche, Moyen de paiement, Notifications, Carnet d'adresses, Staff > Comptes, `roles.json`.

**Jalon 2 (l'essentiel)** : Forum (repris de NextSession), Contacter le staff, Présence, Lits, Mes repas, Remboursement, Créances gîte et salle, Dépenses, Comment ça marche ; pour le staff, Gîte et salle, Réglages compta, Validation des dépenses. Tout l'argent est calculé par `compta.py` (section 6).

**Jalon 3** : Pings reçus, Menu, Accueil en widgets, guide de bienvenue, Tournois ; pour le staff, Réglages LLM (lecture des tickets), Suivi des dépenses, Annonces (section 7).

```
git clone --recurse-submodules https://github.com/pastekaztekastor/Groutte.git   # le socle avec
git config submodule.recurse true          # une fois : git pull met aussi le socle à jour
python3 Groutte-PWA/lancer.py              # http://127.0.0.1:8000 (PORT=9124 pour un autre port)
```

Comptes de départ dans `reglages/config.json` (premier démarrage seulement). Chacun choisit son vrai code à la première connexion.

---

## 1. Le socle et Groutte

- **On ne modifie pas `socle/` pour Groutte.** Ce qui est propre à Groutte est dans `serveur/`, `static/` et `reglages/`. Groutte se branche sur le socle par ses points d'extension (`socle/README.md`, section 5), réunis dans deux fichiers : `serveur/branchements.py` et `static/js/branchements.js`.
- **Une amélioration qui servirait à une autre appli** (un composant, une correction, un point d'extension) se fait dans le socle et se publie pour tous : skill `modifier-socle`.
- **Récupérer les nouveautés du socle** : `git submodule update --remote Groutte-PWA/socle`, tester, puis `git add Groutte-PWA/socle` et commit.
- Pour Claude : `CLAUDE.md` (qui importe celui du socle) et les skills de `.claude/skills/` (liens vers ceux du socle, posés par `sh socle/outils/brancher.sh`).

---

## 2. Arborescence

| Dossier | Contenu | Sur le serveur |
| --- | --- | --- |
| `socle/` | Le socle partagé (sous-module) : serveur et page communs. | envoyé, sans `socle/exemple/` ni `socle/.git` |
| `passenger_wsgi.py` | Le point d'entrée de Passenger (il doit rester à la racine). | envoyé |
| `lancer.py` | Lancer l'appli en local. | jamais |
| `serveur/` | Le code Python de Groutte et `llm-essai.png`. | envoyé |
| `reglages/` | Ce que le webmaster modifie, versionné : `config.json`, `roles.json`, `tournois.json`, `flairs.json`, `reactions.json`, `requirements.txt`. | envoyé |
| `static/` | La page de Groutte, servie par-dessus celle du socle : `projet.css`, `faq.json`, `js/`, `icones/`. | envoyé |
| `data/` | Les données, créées par l'appli. | au premier déploiement seulement |
| `secrets/` | Les clés d'API des LLM, créées par l'appli. | jamais |
| `outils/` | Le faux ticket du test LLM (`ticket-essai.svg`). Les captures et les icônes des environnements sont dans `socle/outils/`. | jamais |

| Fichier | Rôle |
| --- | --- |
| `serveur/projet.py` | Le point d'entrée : importe les modules de Groutte (le socle l'importe). |
| `serveur/branchements.py` | **Tout ce que Groutte branche sur le socle** : ce que chaque compte voit en plus (séjour, budget, forum, tournois, LLM), les cartes des comptes (fiche, rôles automatiques), les filtres d'annonce, la protection des hébergeurs et des soldes à la désactivation, les vérifications (literie, rappels datés, inscription tardive), le détail d'un fil du forum. |
| `serveur/donnees.py` | Les chemins des fichiers de données de Groutte, et les flairs et réactions du forum. |
| `serveur/fiche.py` | Ma fiche (champs de `/api/profil`, régimes, catégories, couchage) et Moyen de paiement (`/api/paiement`, IBAN vérifié...). |
| `serveur/forum.py` | Communauté > Forum, repris de NextSession : posts, commentaires en arbre, votes, réactions, suivi des fils, modération (`data/forum.json`). |
| `serveur/sejour.py` | Les dates du séjour (`config.json > sejour`) et le modèle de présence : créneaux, nuits, repas, heures des repas. |
| `serveur/presence.py` | Gîte > Présence : arrivée et départ de chacun (`data/presences.json`). Prévient les hébergeurs, les créanciers d'un retardataire, le staff si la capacité est dépassée. |
| `serveur/lits.py` | Gîte > Lits : les réservations nuit par nuit (`data/lits.json`) ; le bilan de literie et l'alerte de manque au staff. |
| `serveur/repas.py` | Repas > Mes repas : les choix de chacun (`data/repas.json`) ; seuls les repas gérés par la communauté comptent. |
| `serveur/menu.py` | Repas > Menu : les plats proposés et leurs inscrits (`data/menus.json`) ; le rôle automatique Chef. |
| `serveur/gite_salle.py` | Staff > Gîte et salle (`data/gite-salle.json`) : montants, hébergeurs, dates limites, exemptions, ouverture des paiements, lits, plan, inscriptions tardives. |
| `serveur/compta.py` | **Le calcul de l'argent**, sans rien enregistrer : parts, retardataires, grand livre, soldes, dettes. |
| `serveur/creances.py` | Budget > Créances : paiements à l'hébergeur, confirmations, reports, rappels datés (`data/creances.json`). |
| `serveur/depenses.py` | Budget > Dépenses et Staff > Validation (`data/depenses.json`). |
| `serveur/mes_comptes.py` | Budget > Remboursement : remboursements, grâces, relances, confirmation d'office (`data/remboursements.json`). |
| `serveur/reglages_compta.py` | Staff > Réglages compta : catégories, mode de remboursement, repas gérés (datés), clôture. |
| `serveur/suivi.py` | Staff > Suivi des dépenses : toutes les dettes, dette effacée, dette manuelle (`data/dettes-manuelles.json`). |
| `serveur/llm.py` | Staff > Réglages LLM et la lecture des tickets : clés dans `secrets/llm.json`, appels à Claude, ChatGPT ou Mistral. |
| `serveur/taches.py` | Les rappels datés, vérifiés au chargement de l'état au plus toutes les 5 minutes (`data/taches.json`). |
| `serveur/tournois.py` | Tournois > Inscription : les tournois (`reglages/tournois.json`), les inscriptions et le rôle automatique de chaque tournoi. |
| `serveur/euros.py` | Montants en centimes : écriture en euros, lecture d'un montant reçu. |
| `reglages/config.json` | Titre, préfixe, comptes de départ, régimes, thèmes, catégories de notifications, dates du séjour, heures des repas, Discord de gestion, modèles des LLM. |
| `static/js/rubriques.js` | **Les écrans de Groutte**, le contenu du panneau, ce qui se relit tout seul. |
| `static/js/branchements.js` | **Ce que Groutte règle dans la page commune** : liens vers les fiches, guide de bienvenue, phrases du journal, désactivation avec dettes, filtres d'annonce, Contacter le staff. |
| `static/projet.css` | Les styles de Groutte, chargés après ceux du socle, sur les mêmes jetons. |
| `static/js/fiche.js`, `rembourser.js`, `paiement.js`, `qrcode.js` | Ma fiche, Moyen de paiement, montants et QR code de virement SEPA (qrcode-generator 1.4.4, MIT). |
| `static/js/carnet.js` | Carnet d'adresses : répertoire par lettre, filtres par rôle, fiche contact façon iPhone. |
| `static/js/forum.js`, `reactions.js` | Le forum de NextSession. |
| `static/js/sejour.js`, `presence.js`, `lits.js`, `repas.js`, `menu.js` | Le modèle de présence côté page, Présence, Lits, Mes repas, Menu. |
| `static/js/mes-comptes.js`, `creances.js`, `depenses.js`, `validation.js`, `suivi.js` | Le budget. |
| `static/js/faq.js`, `static/faq.json` | Comment ça marche : le texte de la FAQ du budget (modifié par le webmaster). |
| `static/js/gite-salle.js`, `reglages-compta.js`, `reglages-llm.js` | Staff > Gîte et salle, Réglages compta, Réglages LLM. |
| `static/js/accueil.js`, `bienvenue.js`, `tournois.js` | L'accueil en widgets, le guide de la première connexion, Tournois > Inscription. |
| `static/icones/` | Les icônes de Groutte (elles remplacent celles du socle). `test/` et `local/` : `python3 socle/outils/icones_environnements.py` depuis ce dossier. |

---

## 3. Déployer (O2Switch, cPanel, Passenger)

Comme dans `socle/README.md` (section 9). En FTP, dans le dossier de l'appli, envoie :
- **`passenger_wsgi.py`, `socle/` (sans `socle/exemple/` ni `socle/.git`), `serveur/`, `reglages/` et `static/`**, c'est tout ;
- jamais `secrets/` : les clés des LLM se posent depuis Staff > Réglages LLM, sur le serveur ;
- jamais `outils/` ni `lancer.py` ;
- `data/` seulement au premier déploiement. **Ne l'écrase jamais ensuite.**

Puis Setup Python App : `reglages/requirements.txt`, « Run Pip Install », et **Restart** après chaque envoi de fichiers Python (y compris une mise à jour du socle). Le guide pas à pas complet est dans `../Nextsession/DEPLOIEMENT.md`.

---

## 4. Tester

- **Toujours sur une copie** : les essais écrivent dans `data/`. Sans `abonnements.json` dans la copie, aucune notification ne part vers les vrais téléphones.
- Captures : `node socle/outils/captures.mjs /tmp/captures 390 sombre Bob:2345 "#fiche" "#carnet"` (serveur sur le port 9124). Sur une copie de données dont on ne connaît pas les codes : `JETON=<un jeton de data/acces.json>`.
- Le reste (curl, syntaxe, arrêter un serveur) : `socle/README.md`, section 10, et le skill `verifier-rendu`.

---

## 5. Pièges propres à Groutte

- **`nom` dans une action** est toujours le compte qui agit : le nom d'une catégorie s'envoie donc sous `libelle`, une autre personne sous `qui`.
- **Un champ ajouté aux comptes** (`inscription_acceptee`) se lit avec `.get()` : les comptes du socle ne l'ont pas tous.
- Les autres pièges sont dans `socle/README.md`, section 11.

---

## 6. L'argent (jalon 2)

- **Tout se compte en centimes** (des entiers), et ne s'écrit en euros qu'à l'affichage (`euros.py`, `paiement.js`). Les centimes en trop d'une division vont au payeur, ou à l'hébergeur pour le gîte et la salle (`compta.repartir`).
- **Rien n'est enregistré par le calcul.** `Compta(config)` lit une fois tous les fichiers, puis calcule à la demande (résultats gardés le temps de la requête). L'état et les actions partent d'un seul `Compta` : la page ne voit jamais deux calculs différents.
- **Le gîte et la salle se font en deux temps.** Avant l'ouverture des paiements, les parts suivent les présences en direct. À l'ouverture, `gite_salle.py` enregistre l'instantané des nuits de chacun : un changement de montant, d'exemption ou de répartition recalcule les parts sur cet instantané ; des nuits en plus font un retardataire (`Compta.retards`), des nuits en moins ne changent rien.
- **Le grand livre** (`Compta.obligations`) : parts des dépenses validées, reports, avoirs (trop-payés), manques (après la clôture) et dettes des retardataires. Un remboursement confirmé (ou une grâce) de A à B compte comme une dette de B envers A.
- **Les dettes** : `dettes_directes()` (par paire, sans compensation, sauf le tampon des retardataires) ou `dettes_minimum()` (le plus gros débiteur paie le plus gros créancier). `dettes()` donne celles du mode actif.
- **Les parts d'une dépense sont figées à la validation** (`depenses.valider` les enregistre). Avant, `Compta.parts_depense` donne l'aperçu affiché au staff.
- **Les rappels datés** (paiements du gîte, confirmation d'office d'un remboursement) partent au chargement de l'état, sous le verrou, au plus toutes les 5 minutes (`taches.py`). Chaque envoi est noté pour ne jamais partir deux fois.
- **La clôture des comptes** (Staff > Réglages compta, en retapant CLÔTURER) : `reglages-compta.json > cloture` est respecté partout (plus de dépense, plus de changement de présence ni de repas, les restes deviennent des manques), et chacun reçoit son plan final de virements.
- **Piège** : dans une action, `nom` est toujours le compte qui agit. Le nom d'une catégorie s'envoie donc sous `libelle`.

---

## 7. Le jalon 3

- **Routes lentes** : une action qui appelle un LLM (jusqu'à 30 s) se déclare `@route(..., sans_verrou=True)` (`socle/serveur/routes.py`). `app.py` l'appelle hors du verrou ; elle prend `verrou()` seulement pour écrire. Attention : `verrou()` n'est pas réentrant (deux `flock` du même processus se bloquent), donc jamais de `verrou()` dans une fonction appelée sous le verrou.
- **Pings reçus** : `notifier()` garde chaque notification dans `data/pings.json` pour chacun de ses destinataires (tous les comptes actifs si `destinataires` vaut `None`), qu'elle parte ou non. `genre` (« annonce », « relance », « autre ») et `de` servent à la fenêtre des non lus à l'ouverture (`fenetrePings`, appelée par `main.js`). `garder=False` pour la notification de test.
- **Repas gérés** : `reglages-compta.json > repas_historique` date chaque réglage ; un repas suit celui en vigueur à son heure de début (`reglages_compta.regle_repas`). Les repas passés ne bougent donc jamais. `data/repas.json` garde les choix explicites (`pris`), le reste suit le défaut du créneau ; `Compta.repas_pris` fait le calcul, et l'état envoie la liste à la page (`presences[nom].repas`).
- **Menu et Mes repas** : s'inscrire coche le repas (`repas.poser`), se désinscrire du dernier menu le décoche, décocher le repas désinscrit (`menu.desinscrire_repas`).
- **Literie** : `lits.bilan(c)` nuit par nuit ; `lits.verifier_manques` tourne après chaque action POST (dans `app.py`) et prévient le staff des nouveaux manques, en un message, une fois par nuit et par objet. Rien tant que les lits ne sont pas déclarés.
- **Dettes effacées** : une grâce du staff (`par_staff`, `message`, `ligne`) dans `remboursements.json`. `Compta.dettes_directes` l'impute d'abord sur sa ligne (`cle` = « type:ref » de l'obligation), puis le reste des remboursements de la plus ancienne à la plus récente. La désactivation d'un compte efface ses dettes par paire (`suivi.effacer_compte`).
- **LLM** : `llm.py` parle aux trois API en HTTP (urllib), sans SDK : Anthropic (`/v1/messages`, sortie JSON imposée par `output_config.format`), OpenAI et Mistral (`/chat/completions`, `response_format: json_object`). Les modèles sont dans `config.json > llm_modeles`. La clé ne sort jamais du serveur, ni dans l'état, ni dans le journal, ni dans les erreurs (les messages des fournisseurs ne sont jamais recopiés). Pour tester sans clé, remplacer `llm.appeler` par une fonction qui renvoie un JSON.

