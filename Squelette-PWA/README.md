# Squelette PWA

Le socle de NextSession, sans rien de propre au JDR, pour repartir sur un autre projet. C'est une petite appli de groupe, mobile first et installable. Elle a les notifications push, des comptes sans mot de passe (un code à 4 chiffres pour l'admin), des images et le mode sombre. Il n'y a ni build ni framework : du Python (bibliothèque standard) côté serveur, et des modules JavaScript natifs côté page.

Un module d'exemple, **Notes**, montre tout ce qu'un module fait. On copie ce modèle pour ses propres données. Une note a un titre, un texte, des images, une image de fond et des commentaires. Elle a aussi des pastilles « nouveau » et des notifications.

```
python3 app.py                 # http://127.0.0.1:8000
PORT=9124 python3 app.py       # autre port
```

Comptes de démonstration dans `config.json` : Alice (admin), Bob, Chloé.

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
| `acces.py` | Code admin à 4 chiffres, jetons, blocage après 5 essais. |
| `comptes.py` | Profil (couleur), photo, abonnement aux notifications, préférences, test, annonce admin. |
| `notifications.py` | Web Push (VAPID et chiffrement RFC 8291), `notifier()`, mentions `@Nom`. |
| `lus.py` | Ce que chacun a vu, pour les pastilles « nouveau ». Chaque module déclare un `@compteur`. |
| `medias.py` | Fichiers envoyés, rangés sous des noms aléatoires dans `data/medias/`, avec un aperçu léger. |
| `etat.py` | **Ce que voit chaque compte.** Chaque module y ajoute sa partie. |
| `notes.py` | Module d'exemple (serveur). |
| `config.json` | Titre, comptes, admin, code, thèmes, catégories de notifications. |
| `static/index.html` | La coquille : barre du haut, `<main id="vue">`, panneau, fenêtres, visionneuse. |
| `static/tokens.css` | Les jetons de design (couleurs, espacements, tailles, arrondis), en clair et en sombre. |
| `static/style.css` | Tous les styles, construits **uniquement** sur les jetons. |
| `static/sw.js` | Service worker : appli installable, copie hors ligne, réception des notifications, pastille de l'icône. |
| `static/js/main.js` | Le rendu de toute la page selon l'adresse `#rubrique/argument`. Générique. |
| `static/js/rubriques.js` | **Le fichier à adapter** : les écrans, le contenu du panneau, ce qui se relit tout seul. |
| `static/js/panneau.js` | Le panneau latéral. Sur téléphone, la bulle de compte l'ouvre ; en paysage, il est toujours affiché. Générique. |
| `static/js/commun.js` | `el()`, `saisie()`, échanges serveur, avatars, icônes, fenêtres, connexion, pastilles, couvertures. |
| `static/js/notes.js` | Module d'exemple (page). |
| `static/js/reglages.js` | Photo, thème, mode, Installer l'appli, Annonce, déconnexion. |
| `static/js/notifs.js` | Activer les notifications sur l'appareil, choisir ce qu'on reçoit. |
| `static/js/installation.js` | Écrans d'arrivée : guide d'installation (iPhone ou Android), puis activation des notifications. |
| `static/js/images.js` | Choix d'images avant envoi, envoi, galerie qu'on fait défiler. |
| `static/js/visionneuse.js` | Plein écran : zoom au pincement, glisser pour changer d'image, télécharger. |
| `static/js/zone-message.js` | Zone d'envoi collée en bas (champ qui grandit, icône image, envoyer). |
| `static/js/mentions.js` | `@Nom` : suggestions en tapant, mise en couleur dans les textes. |
| `static/js/bandeau-test.js` | Bandeau en haut de tous les écrans hors production : rouge « Serveur de test » si l'adresse commence par `test.`, bleu « Local » sur localhost, 127.x, 192.168.x, 10.x ou .local. Rien en production. |
| `static/js/icones-fa.js` | Icônes pleines Font Awesome Free (CC BY 4.0). |
| `static/icones/` | Icônes de l'appli (192, 512, maskable, apple-touch, badge). `ui/<nom>.svg` remplace une icône par un dessin. |
| `outils/captures.mjs` | Captures d'écran dans Chromium sans fenêtre, pour vérifier un rendu. |

---

## 3. Le trajet d'une action

```
page (envoyer("notes/creer", {titre, ...}))
  -> POST /api/notes/creer   corps JSON + nom du compte (+ en-tête X-Jeton pour l'admin)
  -> app.py : lire_corps, puis sous verrou() : Demande(config, corps, jeton)   (compte connu ? code admin ?)
  -> notes.creer(d) : vérifie, écrit data/notes.json, notifie
  -> app.py répond etat(d.nom), l'état complet
  -> page : app.etat = réponse ; afficher() redessine tout
```

En cas d'erreur, l'action lève `Refus("message lisible")`. La page affiche alors « Pas enregistré : message lisible » et ne change rien. **Écris les messages de `Refus` pour l'utilisateur.**

Lecture seule : `GET /api/etat?nom=` (tout) et, pour un détail trop lourd pour l'état général, un `GET` à part (`/api/note?id=`, branché dans `app.py`).

---

## 4. Les données

- Chaque fichier a sa constante dans `stockage.py` (`NOTES = DOSSIER_DONNEES / "notes.json"`).
- **Une fonction `lire_xxx()` pose les valeurs par défaut** (`setdefault`). C'est la migration : quand on ajoute un champ, les anciennes données restent lisibles. Il n'y a pas de script de migration.
- `ecrire_json` écrit dans un fichier temporaire puis le renomme : on n'a jamais un fichier à moitié écrit.
- **Toute écriture se fait sous `verrou()`.** Les actions POST y sont déjà, grâce à `app.py`. Si tu écris ailleurs (pendant un GET, dans une tâche), prends le verrou toi-même. Passenger peut lancer plusieurs processus.
- Les identifiants viennent de `nouvel_id()` : 8 caractères hexadécimaux. `lus.py` s'y attend.
- Les dates sont des textes ISO (`maintenant()` donne `2026-10-15T21:16:26`, `aujourdhui()` donne `2026-10-15`). On les compare comme du texte.
- **Médias** : la page envoie le fichier brut (`POST /api/televerser?type=image`) et reçoit son nom (`televerse`). Elle joint ensuite ce nom à l'action (`images: [...]`), et le serveur vérifie qu'il existe (`images_valides`). La page envoie aussi un aperçu léger (`<id>-a.jpg`, 1280 px), qui sert dans les listes ; l'original sert à la visionneuse. Quand on retire une image, il faut **l'effacer du disque** (`medias.supprimer`). Ne l'efface pas si elle sert encore ailleurs, par exemple comme couverture.
- `data/` ne se publie jamais : l'appli le protège en ne le servant pas. **À sauvegarder** : tout `data/`, dont `vapid.json`, les clés des notifications. Si on les perd, tous les appareils doivent se réabonner.

---

## 5. Comptes et accès

- Les comptes sont dans `config.json > comptes` : `{"nom", "couleur", "admin": true}`. Il n'y a pas d'inscription.
- On choisit son compte sur l'écran « Qui es-tu ? ». C'est mémorisé sur l'appareil (`localStorage`).
- **L'admin peut être protégé** par `code_admin` (4 chiffres), saisi sur un pavé comme celui de l'iPhone. Le serveur remet alors un jeton à l'appareil (`data/acces.json`), envoyé dans l'en-tête `X-Jeton`. Sans jeton, rien ne se fait ni ne se lit au nom de l'admin. Après 5 erreurs, le compte est bloqué 5 minutes.
- Ce n'est pas une sécurité forte, et c'est voulu : c'est fait pour un groupe d'amis. Pour un public ouvert, il faudrait de vrais mots de passe.
- Droits dans une action : `d.nom` est qui agit, et `d.admin` dit si c'est l'admin. `d.exiger_admin()` réserve une action à l'admin. Le modèle courant est **l'auteur ou l'admin** (`peut_gerer` dans `notes.py`).
- **Piège** : `nom` dans le corps est **toujours** le compte qui agit, et la page l'ajoute d'office. Pour désigner une autre personne (confirmer son paiement, la réintégrer...), utilise une autre clé, par exemple `qui`.

---

## 6. Ajouter un module (ta propre organisation des données)

C'est la partie à refaire pour un nouveau projet. Copie `notes.py` et `notes.js`, puis suis ces étapes.

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
- Pour une action, `envoyer(route, corps)` renvoie `true` ou `false` et redessine tout seul. Si le détail est chargé à part, il faut le relire après l'action (voir `agir()` dans `notes.js`).
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
  - pleines (`icones-fa.js`, Font Awesome Free) pour le panneau. Leurs noms viennent de NextSession : renomme-les ou ajoutes-en (un `viewBox` et des tracés SVG) ;
  - un fichier `static/icones/ui/<nom>.svg` remplace n'importe laquelle par un dessin.
- **À personnaliser** :
  - les couleurs des dégradés (`DEGRADES` dans `commun.js`) ;
  - les couleurs des groupes du panneau (`.groupe-1` à `.groupe-4` dans `style.css`) ;
  - les thèmes de `config.json` ;
  - les icônes de `static/icones/` (c'est le dé de NextSession, à remplacer).

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
   - les `.py`, `config.json`, `requirements.txt` et `static/` ;
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
  node outils/captures.mjs /tmp/captures 390 sombre Bob "#notes" "#reglages"
  ```

  Tu obtiens une image par adresse et la liste des erreurs JS. Fais-le en 390 px (téléphone) et en 1280 px (paysage).
- **Les actions** se testent directement avec curl, sans la page :

  ```
  curl -X POST localhost:9124/api/notes/creer -H 'Content-Type: application/json' -d '{"nom":"Bob","titre":"Essai"}'
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
2. `config.json` : titre, nom court, description, comptes, admin, code, thèmes, catégories de notifications, contact (`mailto:`).
3. Le préfixe de stockage :
   - `PREFIXE` dans `commun.js` ;
   - le même dans `index.html` (`appli-mode`) et dans `outils/captures.mjs`.
4. Le nom de cache :
   - `CACHE` dans `sw.js` ;
   - le même dans `effacerPastille` de `main.js`.
5. `static/icones/` : tes icônes (192, 512, maskable 512, apple-touch 180, badge 96 monochrome), et le titre dans `index.html`.
6. Ta palette : `DEGRADES` dans `commun.js`, `.groupe-*` dans `style.css`, `themes` dans `config.json`.
7. Remplace le module Notes par les tiens (section 6), ou garde-le comme modèle et retire-le à la fin. Il est cité dans `stockage.py`, `etat.py`, `app.py`, `rubriques.js` et `style.css`.
8. Écris un `TODO.md` et tiens ce README à jour à chaque changement.
