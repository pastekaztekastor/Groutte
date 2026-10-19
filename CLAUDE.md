@methode/CLAUDE.md

# Groutte

L'appli du séjour du Nouvel An à la Groutte, pour une quinzaine de personnes (« les ploucs »). Le dépôt est ce dossier ; l'appli est dans `Groutte-PWA/`, qui a son propre `CLAUDE.md` (il importe celui du socle PWA).

- **Le cahier des charges fait foi** : `cdc/README.md` (principes, périmètre, tableau des pages avec priorité et statut) et une fiche par page dans `cdc/<groupe>/`. Les statuts de Groutte sont *rédigé*, *validé*, *à revoir* (voir le tableau).
- Après avoir ajouté ou déplacé une fiche : `python3 outils/nav_cdc.py` refait les liens Précédent / Menu / Suivant.
- **Les données de production sont précieuses** : `Groutte-PWA/data/` sur le serveur, ses sauvegardes dans `Backup/`. Jamais d'essai dessus.
- `prive/` contient des notes et des listes de codes des comptes : ne jamais en citer le contenu dans un fichier versionné.
