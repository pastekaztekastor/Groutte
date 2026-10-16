# Page « Bientôt »

Page d'attente du serveur principal (la-groutte.champemont.fr), en attendant l'appli : le titre, les dates, le staff et un bouton vers le Discord. Une page HTML statique, sans Python.

- **Le lien Discord** est dans `index.html`, sur le bouton « Rejoindre le Discord » (`href="https://discord.gg/..."`).
- **Le staff** : la liste `<ul>` de la section « Le staff ».

## Déployer (O2Switch)

Envoie `index.html`, `icone.svg` et `apple-touch-icon.png` dans le dossier racine du domaine (cPanel > Domaines, colonne « Racine du document »). Il n'y a rien à redémarrer.

Quand l'appli sera prête, on retire ces fichiers et on branche l'appli Python sur le domaine (voir `../Groutte-PWA/README.md`, section Déployer).
