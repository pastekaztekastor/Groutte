# Groutte

L'appli de préparation du séjour du Nouvel An à la Groutte (28/12/2026 au 03/01/2027) : inscription, présence, couchages, repas, budget partagé, tournois, communauté. Elle remplace Discord pour le groupe. Elle est en service : le jalon 3 est en rodage.

- **Le cahier des charges** (ce que fait l'appli, et pourquoi) : [cdc/README.md](cdc/README.md).
- **Ce qui reste à faire** : [TODO.md](TODO.md).
- **La technique** (serveur, page, données) : [Groutte-PWA/README.md](Groutte-PWA/README.md).

## Installer

```
git clone --recurse-submodules https://github.com/pastekaztekastor/Groutte.git
cd Groutte && git config submodule.recurse true
```

Il faut Python 3.7 ou plus. Pour les notifications : `pip install cryptography` (facultatif en local).

## Lancer

```
python3 Groutte-PWA/lancer.py          # http://127.0.0.1:8000 (PORT=9124 pour un autre port)
```

Sans `Groutte-PWA/data/`, l'appli démarre avec les comptes de départ de `Groutte-PWA/reglages/config.json`.

## Organisation

| Dossier ou fichier | Rôle |
| --- | --- |
| `cdc/` | Le cahier des charges : la vue d'ensemble, le périmètre, le tableau des pages, une fiche par page. `cdc/archives/` : le brouillon d'origine. |
| `Groutte-PWA/` | L'appli, bâtie sur le socle PWA partagé (`Groutte-PWA/socle/`, sous-module). |
| `Coming-Soon/` | La page d'attente publiée avant l'ouverture de l'appli. |
| `outils/` | `nav_cdc.py` : les liens Précédent / Menu / Suivant des fiches du cahier des charges. |
| `methode/` | Ma méthode de travail (sous-module) : règles, modèles, commandes. |
| `prive/` | Ignoré par git : notes, échanges, listes de codes, données de référence. |
| `secrets/`, `Backup/` | Ignorés par git : les clés, les sauvegardes de la production. |

## Tester

Toujours sur une copie des données, sans `abonnements.json` (sinon de vraies notifications partent) : voir [Groutte-PWA/README.md](Groutte-PWA/README.md), section Tester.

## Déployer

En FTP sur O2Switch : voir [Groutte-PWA/README.md](Groutte-PWA/README.md), section Déployer, ou la commande `/livrer`.
