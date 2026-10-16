# Groutte PWA

L'appli du Nouvel An à la Groutte, construite sur le **Squelette PWA** (le socle de NextSession). Le cahier des charges est dans `../README.md` et `../cdc/`. Ce README décrit la technique ; ce qui reste à faire est dans `TODO.md`.

C'est une petite appli de groupe, mobile first et installable. Elle a les notifications push, des comptes protégés chacun par un code à 4 chiffres, l'inscription libre, des images et le mode sombre. Il n'y a ni build ni framework : du Python (bibliothèque standard) côté serveur, et des modules JavaScript natifs côté page.

**Jalon 1 (le socle)** : inscription et connexion, Ma fiche, Me rembourser, Notifications, Carnet d'adresses, Staff > Comptes, `roles.json`. Le module d'exemple Notes du squelette a été retiré : pour un nouveau module, s'inspirer de `comptes.py`, `staff.py` et de leurs pages (section 6), ou de `notes.py` dans `../Squelette-PWA/`.

**Jalon 2 (l'essentiel)** : Forum (repris de NextSession), Contacter le staff, Présence, Lits, Mes repas, Mes comptes, Créances gîte et salle, Dépenses, Comment ça marche ; pour le staff, Gîte et salle, Réglages compta, Validation des dépenses. Tout l'argent est calculé par `compta.py` (section 14).

```
python3 app.py                 # http://127.0.0.1:8000
PORT=9124 python3 app.py       # autre port
```

Comptes de départ dans `config.json` (premier démarrage seulement) : Alice (staff, code provisoire 1111), Bob (2222), Chloé (3333). Chacun choisit son vrai code à la première connexion. **À remplacer par les vrais staffs avant le premier déploiement.**

---

## 1. Principes

- **Aucune dépendance.** Le serveur n'utilise que la bibliothèque standard de Python 3.7+. La seule exception est `cryptography`, qui sert aux notifications et reste facultative : le site marche sans. La page n'a ni npm ni bundler ; on modifie un fichier, on recharge.
- **Les données sont des fichiers JSON** dans `data/`. Ils sont relus à chaque requête et réécrits en entier sous un verrou. Pour une dizaine d'utilisateurs, c'est simple, lisible à l'œil et facile à sauvegarder : on copie `data/`.
- **Un seul état.** Le serveur renvoie à la page tout ce qu'elle affiche, en un objet JSON (`etat.py`). La page le reçoit à l'ouverture, toutes les 30 s, et en réponse à chaque action. Elle **redessine alors toute la page** à partir de cet état. Il n'y a pas de synchronisation fine : c'est ce qui rend le code court.
- **Le serveur décide des droits.** Chaque requête porte le nom du compte (`nom`). Le serveur vérifie ce que ce compte peut faire, et **filtre dans `etat.py` ce qu'il ne doit pas voir**. La page n'est jamais une barrière.
- **Mobile first, codes iOS et Android.** Grands titres, listes groupées, bulles, panneau latéral, action en bulle ronde en bas à droite, écran poussé avec flèche retour. Le but est que personne n'ait besoin d'explication.
- **Tout est en français** : noms de variables, de fonctions, de fichiers, commentaires. **Pas d'emoji**, ni dans le code ni dans les pages : on utilise des icônes SVG.

---

## 2. Arborescence

| Fichier | Rôle |
| --- | --- |
| `app.py` | Le serveur WSGI. Il sert la page, le manifeste, le service worker, `static/` et les médias, et aiguille `/api/...`. |
| `passenger_wsgi.py` | Point d'entrée de l'hébergement Passenger (O2Switch, cPanel). |
| `stockage.py` | Lecture et écriture JSON, `verrou()`, config, ids, dates. **Les chemins des fichiers de données sont ici.** |
| `requetes.py` | `Refus` (erreur renvoyée à la page), `lire_corps`, `texte()` (champ validé), `Demande` (le compte qui agit). |
| `routes.py` | Registre `@route("/api/...")` des actions POST. |
| `comptes_donnees.py` | Les comptes (`data/comptes.json`) : codes hachés, staff, rôles, muet, désactivé ; les rôles (`roles.json`) ; le renommage d'un compte partout (`@renommage`). |
| `acces.py` | Connexion avec le code de chaque compte, inscription, code provisoire, jetons, blocage après 5 essais. |
| `comptes.py` | Ma fiche, rôles libres, changer son code, Me rembourser (IBAN vérifié...), photo, notifications, annonce du staff. |
| `staff.py` | Staff > Comptes : droit staff, code à zéro, rôles, muet, nom, désactivation, journal (`data/journal-staff.json`). |
| `forum.py` | Communauté > Forum, repris de NextSession : posts, commentaires en arbre, votes, réactions, suivi des fils, modération par le staff (`data/forum.json`). |
| `flairs.json`, `reactions.json` | Les flairs du forum (certains réservés au staff) et les réactions en texte. Modifiés par le webmaster, versionnés. |
| `sejour.py` | Les dates du séjour (`config.json > sejour`) et le modèle de présence : créneaux, nuits, repas, heures des repas. |
| `presence.py` | Gîte > Présence : arrivée et départ de chacun (`data/presences.json`). Prévient les hébergeurs, les créanciers d'un retardataire, le staff si la capacité est dépassée. |
| `lits.py` | Gîte > Lits : les réservations nuit par nuit (`data/lits.json`), retirées quand les dates ou les lits changent. |
| `repas.py` | Repas > Mes repas : les repas décochés (`data/repas.json`). |
| `gite_salle.py` | Staff > Gîte et salle (`data/gite-salle.json`) : montants, hébergeurs, dates limites, exemptions, ouverture des paiements (avec l'instantané des nuits), lits, plan, inscriptions tardives. |
| `compta.py` | **Le calcul de l'argent**, sans rien enregistrer : parts du gîte et de la salle, retardataires, parts des dépenses, grand livre, soldes, dettes (direct ou minimum de virements). |
| `creances.py` | Budget > Créances : paiements à l'hébergeur, confirmations, reports, rappels datés (`data/creances.json`). |
| `depenses.py` | Budget > Dépenses et Staff > Validation : brouillon, envoi, validation (parts figées) ou refus (`data/depenses.json`). |
| `mes_comptes.py` | Budget > Mes comptes : remboursements, grâces, relances, confirmation d'office (`data/remboursements.json`). |
| `reglages_compta.py` | Staff > Réglages compta : catégories (`data/categories.json`), mode de remboursement et clôture (`data/reglages-compta.json`). |
| `taches.py` | Les rappels datés, vérifiés au chargement de l'état au plus toutes les 5 minutes (`data/taches.json`). |
| `euros.py` | Montants en centimes : écriture en euros (notifications), lecture d'un montant reçu. |
| `notifications.py` | Web Push (VAPID et chiffrement RFC 8291), `notifier()`, mentions `@Nom`. |
| `lus.py` | Ce que chacun a vu, pour les pastilles « nouveau ». Chaque module déclare un `@compteur`. |
| `medias.py` | Fichiers envoyés, rangés sous des noms aléatoires dans `data/medias/`, avec un aperçu léger. |
| `etat.py` | **Ce que voit chaque compte.** Chaque module y ajoute sa partie. |
| `environnement.py` | Production, test (`test.`) ou local (localhost, 127.x, 192.168.x, 10.x, .local), d'après l'adresse. Hors production, le nom et l'icône de l'appli, le titre, le bandeau et les notifications le disent. |
| `config.json` | Titre, comptes de départ, régimes proposés, thèmes, catégories de notifications, dates du séjour (`sejour`), heures des repas (`heures_repas`), lien du Discord de gestion (`discord_gestion`). |
| `roles.json` | Les rôles du carnet et leur type (`libre`, `staff`, `automatique`). Modifié par le webmaster, versionné. |
| `static/index.html` | La coquille : barre du haut, `<main id="vue">`, panneau, fenêtres, visionneuse. |
| `static/tokens.css` | Les jetons de design (couleurs, espacements, tailles, arrondis), en clair et en sombre. |
| `static/style.css` | Tous les styles, construits **uniquement** sur les jetons. |
| `static/sw.js` | Service worker : appli installable, copie hors ligne, réception des notifications, pastille de l'icône. |
| `static/js/main.js` | Le rendu de toute la page selon l'adresse `#rubrique/argument`. Générique. |
| `static/js/rubriques.js` | **Le fichier à adapter** : les écrans, le contenu du panneau, ce qui se relit tout seul. |
| `static/js/panneau.js` | Le panneau latéral. Sur téléphone, la bulle de compte l'ouvre ; en paysage, il est toujours affiché. Générique. |
| `static/js/commun.js` | `el()`, `saisie()`, échanges serveur, avatars, icônes, fenêtres, connexion, pastilles, couvertures. |
| `static/js/fiche.js` | Ma fiche : chaque champ s'enregistre quand on le quitte. |
| `static/js/rembourser.js` | Me rembourser : les moyens de paiement, et l'aperçu de la page « Payer ». |
| `static/js/paiement.js` | Montants en euros, QR code de virement SEPA, page « Payer » (`moyensPaiement`), repris de NextSession. |
| `static/js/qrcode.js` | qrcode-generator 1.4.4 (MIT), pour le QR code de virement. |
| `static/js/carnet.js` | Carnet d'adresses : répertoire par lettre, filtres par rôle, fiche contact façon iPhone. |
| `static/js/staff.js` | Staff > Comptes : choix des membres, actions, code provisoire, journal. |
| `static/js/forum.js`, `reactions.js` | Le forum de NextSession : liste, nouveau post, un post et ses commentaires, réactions. |
| `static/js/contact.js` | Contacter le staff : le Discord de gestion, les hébergeurs et le staff (en attendant les messages privés). |
| `static/js/sejour.js` | Le modèle de présence côté page : créneaux, nuits, repas pris, présents à un créneau. |
| `static/js/presence.js`, `lits.js`, `repas.js` | Présence, Lits (et le plan), Mes repas. |
| `static/js/mes-comptes.js`, `creances.js` | Mes comptes, Créances ; `pagePaiement()` sert à Payer comme à Rembourser. |
| `static/js/depenses.js`, `validation.js` | Dépenses (liste, saisie, détail) et Staff > Validation, qui reprend le détail. |
| `static/js/faq.js`, `static/faq.json` | Comment ça marche : le texte de la FAQ du budget (modifié par le webmaster), les réglages lus en direct. |
| `static/js/gite-salle.js`, `reglages-compta.js` | Staff > Gîte et salle, Staff > Réglages compta. |
| `static/js/reglages.js` | Photo, thème, mode, changer son code, Installer l'appli, Annonce, déconnexion. |
| `static/js/notifs.js` | Activer les notifications sur l'appareil, choisir ce qu'on reçoit. |
| `static/js/installation.js` | Écrans d'arrivée : guide d'installation (iPhone ou Android), puis activation des notifications. |
| `static/js/images.js` | Choix d'images avant envoi, envoi, galerie qu'on fait défiler. |
| `static/js/visionneuse.js` | Plein écran : zoom au pincement, glisser pour changer d'image, télécharger. |
| `static/js/zone-message.js` | Zone d'envoi collée en bas (champ qui grandit, icône image, envoyer). |
| `static/js/mentions.js` | `@Nom` : suggestions en tapant, mise en couleur dans les textes. |
| `static/js/bandeau-test.js` | Bandeau en haut de tous les écrans hors production (`environnement.py`) : rouge « Serveur de test », bleu « Local ». |
| `static/js/icones-fa.js` | Icônes pleines Font Awesome Free (CC BY 4.0). |
| `static/icones/` | Icônes de l'appli (192, 512, maskable, apple-touch, badge). `test/` et `local/` : les mêmes, en rouge et en bleu, marquées « TEST » ou « LOCAL ». `ui/<nom>.svg` remplace une icône par un dessin. |
| `outils/captures.mjs` | Captures d'écran dans Chromium sans fenêtre, pour vérifier un rendu. |
| `outils/icones_environnements.py` | Refait `static/icones/test/` et `local/` depuis les icônes de production. |

---

## 3. Le trajet d'une action

```
page (envoyer("profil", {prenom, ...}))
  -> POST /api/profil   corps JSON + nom du compte + en-tête X-Jeton
  -> app.py : lire_corps, puis sous verrou() : Demande(config, corps, jeton, chemin)   (compte actif ? jeton ? code provisoire ?)
  -> comptes.modifier_profil(d) : vérifie, écrit data/profils.json
  -> app.py répond etat(d.nom), l'état complet
  -> page : app.etat = réponse ; afficher() redessine tout
```

En cas d'erreur, l'action lève `Refus("message lisible")`. La page affiche alors « Pas enregistré : message lisible » et ne change rien. **Écris les messages de `Refus` pour l'utilisateur.**

Lecture seule : `GET /api/etat?nom=` (tout) et, pour un détail trop lourd pour l'état général, un `GET` à part (`/api/note?id=`, branché dans `app.py`).

---

## 4. Les données

- Chaque fichier a sa constante dans `stockage.py` (`PROFILS = DOSSIER_DONNEES / "profils.json"`).
- **Une fonction `lire_xxx()` pose les valeurs par défaut** (`setdefault`). C'est la migration : quand on ajoute un champ, les anciennes données restent lisibles. Il n'y a pas de script de migration.
- `ecrire_json` écrit dans un fichier temporaire puis le renomme : on n'a jamais un fichier à moitié écrit.
- **Toute écriture se fait sous `verrou()`.** Les actions POST y sont déjà, grâce à `app.py`. Si tu écris ailleurs (pendant un GET, dans une tâche), prends le verrou toi-même. Passenger peut lancer plusieurs processus.
- Les identifiants viennent de `nouvel_id()` : 8 caractères hexadécimaux. `lus.py` s'y attend.
- Les dates sont des textes ISO (`maintenant()` donne `2026-10-15T21:16:26`, `aujourdhui()` donne `2026-10-15`). On les compare comme du texte.
- **Médias** : la page envoie le fichier brut (`POST /api/televerser?type=image`) et reçoit son nom (`televerse`). Elle joint ensuite ce nom à l'action (`images: [...]`), et le serveur vérifie qu'il existe (`images_valides`). La page envoie aussi un aperçu léger (`<id>-a.jpg`, 1280 px), qui sert dans les listes ; l'original sert à la visionneuse. Quand on retire une image, il faut **l'effacer du disque** (`medias.supprimer`). Ne l'efface pas si elle sert encore ailleurs, par exemple comme couverture.
- `data/` ne se publie jamais : l'appli le protège en ne le servant pas. **À sauvegarder** : tout `data/`, dont `vapid.json`, les clés des notifications. Si on les perd, tous les appareils doivent se réabonner.

---

## 5. Comptes et accès

- **Les comptes sont dans `data/comptes.json`** (`comptes_donnees.py`). Au premier démarrage, ce fichier n'existe pas : les comptes de départ viennent de `config.json > comptes` (`{"nom", "staff": true, "code": "1234"}`). Ensuite, c'est l'appli qui décide, et le webmaster peut corriger le fichier à la main.
- **Chaque compte a son code à 4 chiffres**, haché (pbkdf2), jamais en clair. On choisit son compte sur « Qui es-tu ? », puis on tape son code sur le pavé façon iPhone. Le serveur remet un jeton à l'appareil (`data/acces.json`), envoyé dans l'en-tête `X-Jeton`. Sans jeton valable, rien ne se fait ni ne se lit au nom d'un compte. Après 5 erreurs, le compte est bloqué 5 minutes.
- **Inscription libre** : « Créer un compte » (le nom, puis le code deux fois). Un nom trop proche d'un autre (majuscules et accents ignorés) est refusé. Le staff est prévenu.
- **Code provisoire** : un code venu de `config.json`, ou remis à zéro par le staff (Staff > Comptes), doit être changé à la connexion suivante. Tant que ce n'est pas fait, seule `/api/code/changer` est acceptée (`requetes.ROUTES_CODE_PROVISOIRE`).
- **Deux niveaux de droits** : participant et staff. `d.staff`, `d.exiger_staff()`. Un membre muet (`d.muet`, `d.exiger_parole()`) ne peut plus écrire dans la Communauté. Les rôles (`roles.json`) ne donnent aucun droit.
- **Un compte n'est jamais supprimé**, seulement désactivé : il ne peut plus se connecter et disparaît des listes, mais son historique reste.
- **Renommer un compte** (Staff > Comptes) : chaque module qui range des noms déclare une fonction `@renommage` (voir `comptes_donnees.py`). L'appareil de la personne suit le nouveau nom (`renomme` dans l'état).
- Ce n'est pas une sécurité forte (4 chiffres), et c'est voulu : c'est fait pour un groupe d'amis.
- **Piège** : `nom` dans le corps est **toujours** le compte qui agit, et la page l'ajoute d'office. Pour désigner une autre personne (confirmer son paiement, la réintégrer...), utilise une autre clé, par exemple `qui`.

---

## 6. Ajouter un module (ta propre organisation des données)

Pour chaque nouvelle page du cahier des charges. Le modèle complet (Notes) est dans `../Squelette-PWA/notes.py` et `static/js/notes.js` ; ici, `comptes.py` et `fiche.js` en sont des exemples plus simples.

**Serveur**

1. `stockage.py` : le chemin du fichier (`TRUCS = DOSSIER_DONNEES / "trucs.json"`).
2. `trucs.py` :
   - `lire_trucs()` avec les `setdefault` ;
   - `resumes()` : ce qui part dans l'état, **léger**, sans les longs fils ;
   - `detail(id)` si le détail est lourd ;
   - les actions `@route("/api/trucs/...")`, qui vérifient les droits puis écrivent ;
   - un `@compteur("trucs")` pour les pastilles « nouveau ».
3. `app.py` : `import trucs` (sinon ses routes n'existent pas), et le `GET /api/truc` du détail s'il y en a un.
4. `etat.py` : `"trucs": resumes_trucs(lire_trucs())`, **filtré selon `nom`** si certains éléments sont privés.
5. `config.json > categories_notifications` : `"trucs": "Mes trucs"`, si le module notifie.

**Page**

1. `trucs.js` exporte une fonction par écran (`vueTrucs`, `vueTruc(id)`...). Ce sont des fonctions qui **renvoient des éléments** (`el(...)`) à partir de `app.etat`.
2. `rubriques.js` :
   - dans `ecran()`, les adresses (`#trucs`, `#trucs/nouveau`, `#trucs/<id>`) avec titre, retour, action, `lu` et `vue` ;
   - dans `groupesPanneau()`, l'entrée du panneau (icône, titre, résumé, pastille) ;
   - dans `A_RAFRAICHIR`, la relecture du détail.
3. `style.css` : une section pour le module, construite sur les jetons.

**Ce qu'il faut savoir en écrivant un écran**

- `el(tag, props, ...enfants)` crée un élément. Le texte n'est **jamais** interprété comme du HTML, donc il n'y a pas d'injection possible. `false`, `null` et `undefined` sont ignorés : on écrit `condition && el(...)`. Les tableaux sont aplatis.
- **Toute la page est redessinée** à chaque changement. Un champ de saisie doit donc venir de `saisie(cle, ...)`, sinon ce qu'on tape disparaît au prochain rafraîchissement. Une fois l'envoi réussi, on appelle `oublier(cle)`.
- Le rafraîchissement automatique ne redessine pas pendant qu'un champ a le focus : le clavier du téléphone se fermerait.
- Pour une action, `envoyer(route, corps)` renvoie `true` ou `false` et redessine tout seul. Si le détail est chargé à part, il faut le relire après l'action (voir `agir()` dans `../Squelette-PWA/static/js/notes.js`).
- Les fenêtres se font avec `ouvrirModale(titre, champs, libellé, action)` ; l'action renvoie `true` pour fermer la fenêtre.
- Les adresses : un lien change `location.hash` et la page se redessine. Le retour du téléphone marche donc partout. Un écran d'écriture a `retour: [lien, "Annuler"]` : on voit « Annuler » en toutes lettres et pas de bulle de compte.
- Les nouveautés : un écran déclare `lu: "trucs/<id>"`, et l'ouvrir le marque comme lu. `nombreNouveautes("trucs")` donne la pastille du panneau.

---

## 7. Design

- **`tokens.css` contient les seules valeurs autorisées.** Dans `style.css`, une couleur, une taille ou un espacement en dur est un bug.
  - Couleurs : une échelle de gris de 12 nuances (`--g1` à `--g12`, « sand » de Radix Colors), avec un rôle par nuance. Les fonds sont `1-2`, les composants `3-5`, les traits `6-8`, les pleins `9-10` et le texte `11-12`.
  - Rôles : `--fond`, `--surface`, `--texte`, `--texte-doux`, `--separateur`...
  - Rouge et vert standards, pour les erreurs et les succès.
- **Le thème est une seule couleur** (`--c`), choisie par chaque compte dans Réglages parmi `config.json > themes`. `tokens.css` en tire toute l'échelle (`--c3` à `--c11`) avec `color-mix`, en clair comme en sombre.
- **Le mode sombre** (`:root.sombre`) redéfinit les gris. Il se règle sur Clair, Sombre ou Auto, et est appliqué dès le `<head>` pour éviter un éclair blanc.
- Espacements `--e1` à `--e8` (4 à 48 px), tailles de texte iOS (`--t-grand` 34, `--t-corps` 17...), arrondis `--r-*`, cible tactile de 44 px minimum.
- **Composants prêts** (classes de `style.css`) :
  - `.grand-titre`, `.barre-nav` (écran poussé) ;
  - `.liste-groupee` et `.ligne` (comme les Réglages de l'iPhone), `.carte` ;
  - `.btn.principal`, `.btn`, `.discret`, `.danger`, `.bouton-icone`, `.bulle-action` ;
  - `.segments` (contrôle segmenté) ;
  - interrupteurs (`input[type=checkbox]`) ;
  - `.nouveau` (pastille), `.avatar`, `.badge` ;
  - `.affiche`, `.vignette` et `.grille-affiches` : image de fond, voile, texte blanc. Sans image, un dégradé de la palette et un filigrane ;
  - `.galerie-post` (carrousel), `.commentaire*` (bulles), `.composer.collant` (zone d'envoi) ;
  - le pavé de code, la visionneuse, les fenêtres (`.feuille`).
- **Navigation**
  - Téléphone (moins de 900 px) : pas de barre d'onglets. La **bulle de compte** (en haut à gauche, avec une pastille s'il y a du nouveau) ouvre le panneau latéral. On ne l'ouvre pas en glissant depuis le bord, parce que ce geste veut dire « retour » sur Android et dans Safari.
  - Paysage (900 px et plus) : le même panneau reste ouvert en colonne de 320 px.
  - Pas de contrôle segmenté pour naviguer : chaque page a son titre et son entrée dans le panneau.
- **Icônes** :
  - en traits (`ICONES` dans `commun.js`) pour les petites actions ;
  - pleines (`icones-fa.js`, Font Awesome Free 7.1.0) pour le panneau et les fiches. Chaque nom de l'appli (`fa-carnet`, `fa-staff`...) dit en commentaire de quelle icône Font Awesome il vient et où il sert ; celles des pages des jalons suivants sont déjà là. Pour en ajouter une, prendre son SVG sur `cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.1.0/svgs/solid/<nom>.svg` ;
  - un fichier `static/icones/ui/<nom>.svg` remplace n'importe laquelle par un dessin.
- **À personnaliser** :
  - les couleurs des dégradés (`DEGRADES` dans `commun.js`) ;
  - les couleurs des groupes du panneau (`.groupe-1` à `.groupe-4` dans `style.css`) ;
  - les thèmes de `config.json` ;
  - les icônes de `static/icones/` : le gîte et son feu d'artifice doré, sur le prune du thème. Les PNG se refont depuis les SVG : `rsvg-convert -w 512 -h 512 icone.svg -o icone-512.png` (192, 512, maskable 512, apple-touch 180 depuis le maskable, badge 96). Ensuite, `python3 outils/icones_environnements.py` refait celles du test et du local.

---

## 8. Appli installable (PWA)

- Le manifeste est construit d'après `config.json` (`titre`, `nom_court`, `description`).
- `sw.js` est servi à la racine. Il va **toujours au réseau d'abord** : après une mise à jour du site, on n'utilise jamais une vieille copie. La copie ne sert qu'en cas de coupure. Rien n'est gardé de `/api/` ni de `/media/`.
- **Mises à jour** : `etat.version` change dès qu'un fichier du site change. Une page restée ouverte propose alors « Mettre à jour ».
- **Arrivée sur téléphone** (`installation.js`) :
  - dans le navigateur, un guide d'installation adapté à iPhone (Safari, Partager, « Sur l'écran d'accueil ») ou à Android (bouton, ou menu) ;
  - à la première ouverture de l'appli installée, l'activation des notifications. Si le téléphone les a bloquées, une explication.
- Pour télécharger un fichier dans l'appli installée, on passe par le menu de partage du téléphone (`telechargerFichier`). Un lien de téléchargement ferait sortir de l'appli.
- **À changer pour chaque appli** :
  - `PREFIXE` dans `commun.js`, avec la même valeur dans le script du `<head>` d'`index.html` et dans `outils/captures.mjs` ;
  - `CACHE` dans `sw.js`, avec le même nom dans `effacerPastille` de `main.js`.

  Deux applis sur le même domaine se mélangeraient sinon.

---

## 9. Notifications push

- Il faut `cryptography` (`requirements.txt`). Sans elle, `notifications.DISPONIBLE` vaut `False` : le site marche, et la page dit que les notifications sont indisponibles.
- Les clés VAPID sont créées au premier besoin (`data/vapid.json`). Chaque appareil s'abonne : `data/abonnements.json` tient `{nom: [abonnements]}`.
- Pour envoyer : `notifier(config, "categorie", titre, texte, "#adresse", destinataires=..., sauf=d.nom)`.
  - La catégorie doit exister dans `config.json > categories_notifications`, et chacun peut la couper dans Réglages > Notifications.
  - `None` envoie quelles que soient les préférences (annonce, mention, test).
  - L'adresse sert aussi d'étiquette : une notification remplace la précédente de la même page.
- **Mentions** : `mentionnes(config, texte)` trouve les `@Nom`. `notifier_mentions` envoie « Untel t'a mentionné » même si la personne a coupé la catégorie.
- L'envoi se fait en arrière-plan, pour que la requête n'attende pas. Un abonnement mort (réponse 404 ou 410) est oublié.
- **iPhone** : les notifications ne marchent que dans l'appli installée depuis Safari (iOS 16.4 et plus).
- **Il faut du HTTPS**, ou `127.0.0.1` en local. Une adresse `http://192.168...` ne suffit pas.
- Il n'y a pas de tâche planifiée. Pour un rappel daté, NextSession vérifie au chargement de l'état (`GET /api/etat`), sous verrou, et note dans les données ce qui a été envoyé pour ne pas l'envoyer deux fois.

---

## 10. Déployer (O2Switch, cPanel, Passenger)

1. cPanel > Domaines : crée le sous-domaine.
2. cPanel > Setup Python App :
   - Python le plus récent ;
   - Application root : un dossier **hors de `public_html`** (ex. `monappli`) ;
   - URL : le sous-domaine ;
   - startup file : `passenger_wsgi.py`, entry point : `application`.
3. En FTP (FileZilla, « FTP explicite sur TLS »), envoie dans ce dossier :
   - les `.py`, les `.json` du dossier (`config.json`, `roles.json`, `flairs.json`, `reactions.json`), `requirements.txt` et `static/` ;
   - `data/` seulement au premier déploiement. **Ne l'écrase jamais ensuite.**
4. Setup Python App :
   - ajoute `requirements.txt` puis clique « Run Pip Install » (pour les notifications) ;
   - ensuite **Restart**, à refaire après chaque envoi de fichiers Python.
5. cPanel > Statut SSL/TLS > AutoSSL, puis force le HTTPS dans le `.htaccess` du dossier du sous-domaine.
6. Si quelque chose casse : le chemin du `stderr.log` est affiché dans Setup Python App.

Le guide pas à pas complet est dans `../Nextsession/DEPLOIEMENT.md`.

---

## 11. Tester

- **Toujours sur une copie** : les essais écrivent dans `data/`.

  ```
  cp -r Squelette-PWA /tmp/essai && cd /tmp/essai && PORT=9124 python3 app.py
  ```

- **Captures sans téléphone** (Node 22+ et Chromium) :

  ```
  node outils/captures.mjs /tmp/captures 390 sombre Bob:2345 "#fiche" "#carnet"
  ```

  Tu obtiens une image par adresse et la liste des erreurs JS. Fais-le en 390 px (téléphone) et en 1280 px (paysage).
- **Les actions** se testent directement avec curl, sans la page :

  ```
  curl -X POST localhost:9124/api/connexion -H 'Content-Type: application/json' -d '{"nom":"Bob","code":"2222"}'
  # puis, avec le jeton reçu :
  curl -X POST localhost:9124/api/profil -H 'Content-Type: application/json' -H 'X-Jeton: <jeton>' -d '{"nom":"Bob","prenom":"Robert"}'
  ```

  Teste aussi les refus : un autre compte qui modifie, un champ vide, un id inconnu.
- Pour arrêter un serveur sur un port : `kill $(fuser 9124/tcp)`. Évite `pkill -f`, qui peut tuer le terminal qui l'a lancé.
- `python3 -m py_compile *.py` et `node --check static/js/*.js` vérifient la syntaxe.

---

## 12. Pièges déjà rencontrés

- **Redessiner pendant la frappe** ferme le clavier du téléphone. C'est pour ça que `charger(auto)` ne redessine pas quand un champ a le focus, et que `saisie()` garde les brouillons.
- **Glisser depuis le bord gauche** pour ouvrir un menu entre en conflit avec le geste « retour » d'Android et de Safari. Le panneau s'ouvre donc par la bulle, et se referme en glissant vers la gauche, en touchant à côté ou avec le retour du téléphone (il est une entrée de l'historique).
- **Un `catch` trop large** masque les bugs de rendu derrière « Impossible de charger ». Sépare l'erreur réseau de l'erreur de dessin (`.then(ok, erreur)`).
- **Une icône inconnue** fait planter le rendu de la page. `icone()` renvoie maintenant une icône vide plutôt que de planter, mais vérifie les noms.
- **`nom` dans le corps** est toujours le compte qui agit (voir la section 5).
- **Les images d'iPhone (HEIC)** sont converties en JPEG dans le navigateur avant l'envoi. Les GIF ne sont jamais réduits, pour garder l'animation.
- **Passenger lance plusieurs processus.** Sans `verrou()`, deux écritures simultanées perdent des données.
- **Le service worker** : en « cache d'abord », une mise à jour n'arrive jamais. Garde « réseau d'abord ».
- **En `zsh`**, un motif qui ne trouve rien (`rm data/*.tmp`) arrête toute la commande.

---

## 13. Repartir de ce squelette : la liste

1. Copie le dossier et renomme-le.
2. `config.json` : titre, nom court, description, comptes de départ (staff, code provisoire), thèmes, catégories de notifications, contact (`mailto:`).
3. Le préfixe de stockage :
   - `PREFIXE` dans `commun.js` ;
   - le même dans `index.html` (`appli-mode`) et dans `outils/captures.mjs`.
4. Le nom de cache :
   - `CACHE` dans `sw.js` ;
   - le même dans `effacerPastille` de `main.js`.
5. `static/icones/` : tes icônes (192, 512, maskable 512, apple-touch 180, badge 96 monochrome), et le titre dans `index.html`.
6. Ta palette : `DEGRADES` dans `commun.js`, `.groupe-*` dans `style.css`, `themes` dans `config.json`.
7. Remplace le module Notes par les tiens (section 6). Fait pour la Groutte : Notes est retiré.
8. Écris un `TODO.md` et tiens ce README à jour à chaque changement.

---

## 14. L'argent (jalon 2)

- **Tout se compte en centimes** (des entiers), et ne s'écrit en euros qu'à l'affichage (`euros.py`, `paiement.js`). Les centimes en trop d'une division vont au payeur, ou à l'hébergeur pour le gîte et la salle (`compta.repartir`).
- **Rien n'est enregistré par le calcul.** `Compta(config)` lit une fois tous les fichiers, puis calcule à la demande (résultats gardés le temps de la requête). L'état et les actions partent d'un seul `Compta` : la page ne voit jamais deux calculs différents.
- **Le gîte et la salle se font en deux temps.** Avant l'ouverture des paiements, les parts suivent les présences en direct. À l'ouverture, `gite_salle.py` enregistre l'instantané des nuits de chacun : un changement de montant, d'exemption ou de répartition recalcule les parts sur cet instantané ; des nuits en plus font un retardataire (`Compta.retards`), des nuits en moins ne changent rien.
- **Le grand livre** (`Compta.obligations`) : parts des dépenses validées, reports, avoirs (trop-payés), manques (après la clôture) et dettes des retardataires. Un remboursement confirmé (ou une grâce) de A à B compte comme une dette de B envers A.
- **Les dettes** : `dettes_directes()` (par paire, sans compensation, sauf le tampon des retardataires) ou `dettes_minimum()` (le plus gros débiteur paie le plus gros créancier). `dettes()` donne celles du mode actif.
- **Les parts d'une dépense sont figées à la validation** (`depenses.valider` les enregistre). Avant, `Compta.parts_depense` donne l'aperçu affiché au staff.
- **Les rappels datés** (paiements du gîte, confirmation d'office d'un remboursement) partent au chargement de l'état, sous le verrou, au plus toutes les 5 minutes (`taches.py`). Chaque envoi est noté pour ne jamais partir deux fois.
- **La clôture des comptes** arrive avec Suivi des dépenses (jalon 3) : `reglages-compta.json > cloture` est déjà respecté partout (plus de dépense, plus de changement de présence, les restes deviennent des manques).
- **Piège** : dans une action, `nom` est toujours le compte qui agit. Le nom d'une catégorie s'envoie donc sous `libelle`.
