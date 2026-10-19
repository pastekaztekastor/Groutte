@socle/CLAUDE.md

# Groutte

L'appli du séjour du Nouvel An à la Groutte (un gîte et une salle, une quinzaine de personnes) : inscription, présence, lits, repas et menu, budget partagé (gîte, salle, dépenses, remboursements), forum, tournois, annonces du staff. Le cahier des charges est dans `../cdc/` (vue d'ensemble : `../cdc/README.md`), ce qui reste à faire dans `../TODO.md`, la technique propre à Groutte dans `README.md`.

- **Ce qui touche au socle est réuni dans deux fichiers** : `serveur/branchements.py` (état, cartes, filtres d'annonce, protections, vérifications) et `static/js/branchements.js` (liens, textes, journal, désactivation, annonces, Contacter le staff). Chercher là avant d'ajouter un branchement ailleurs.
- **L'argent est en centimes** (entiers), écrit en euros seulement à l'affichage (`euros.py`, `paiement.js`). Tout calcul passe par `compta.Compta(config)`, qui n'enregistre rien.
- **Les données de production sont précieuses** : ne jamais lancer de test sur `data/` ni sur une sauvegarde de `../Backup/` ; copier d'abord, et retirer `abonnements.json` de la copie (sinon de vraies notifications partent vers les téléphones).
- **Le ton** : tutoiement, un peu potache (« ploucs »), jamais d'emoji.
- Le dépôt git est le dossier du dessus (`Groutte/`) ; le socle est le sous-module `Groutte-PWA/socle`.
