<!-- nav -->
[Précédent : Comptes](../staff/comptes.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Compte > Inscription et connexion

- **Priorité** : 1
- **Statut** : décrite

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Créer son compte ou se connecter à un compte existant, à l'installation ou sur un nouvel appareil.

## Qui voit, qui agit
<!-- Participant, staff, ou seulement la personne concernée. -->
- Tout le monde, avant d'être connecté.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
**On reprend l'écran de connexion de NextSession**, déjà présent dans le squelette (`afficherConnexion()` et `demanderCode()` dans `static/js/commun.js`). Il fait deux choses :
- il affiche **« Qui es-tu ? »** avec une grille de photos, une par compte, et l'on touche la sienne ;
- il demande ensuite le code sur un **pavé numérique façon iPhone** : 4 points qui se remplissent, puis une vérification.

**Les changements pour la Groutte** :
- le pavé est demandé à **tous les comptes**, et plus seulement au compte admin ;
- un bouton **« Créer un compte »** est ajouté sous la grille ;
- les comptes désactivés n'apparaissent pas dans la grille.

```
        Nouvel An à la Groutte
             Qui es-tu ?
   (o)     (o)     (o)     (o)
  Alice    Bob    Chloé   David
   (o)     (o)
  Emma    Fred
         [ Créer un compte ]

  --- après avoir touché sa photo ---

               (o) Bob
           ●  ●  ○  ○
          1    2    3
          4    5    6
          7    8    9
               0    <
```

**La création de compte** se fait en trois étapes :
1. Le nom.
2. Le code à 4 chiffres, sur le même pavé.
3. Le même code une seconde fois, pour confirmer.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Se connecter** : je touche ma photo, puis je tape mon code. Le serveur vérifie le code et remet un jeton à l'appareil, que la page joint à chaque demande.
- **Créer un compte** : je saisis mon nom, puis je choisis mon code et je le confirme. Je suis connecté directement, et j'arrive sur [Ma fiche](ma-fiche.md) pour la remplir.
- **Code provisoire** : si un staff a remis mon code à zéro (voir [Staff > Comptes](../staff/comptes.md)), je tape le code provisoire qu'il m'a transmis, puis je choisis tout de suite un nouveau code.
- **Après la date limite d'inscription** : créer un compte reste possible, mais le nouveau compte ne peut pas réserver ses nuits ([Ma réservation](../gite/ma-reservation.md)) tant que l'hébergeur n'a pas accepté. C'est le même principe que pour un paiement en retard dans [Créances](../budget/creances.md) :
  - à la place de la réservation, un bouton **« Demander à l'hébergeur »** ouvre un message privé avec l'hébergeur du gîte ;
  - l'hébergeur (ou un staff) touche **« Accepter l'inscription »** : le compte peut alors réserver normalement.
- **Se déconnecter** (dans Réglages) : le jeton de l'appareil est annulé, et l'on revient à « Qui es-tu ? ».

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
- **Les comptes** sont dans `data/comptes.json` (voir [Staff > Comptes](../staff/comptes.md)) :
  - le nom ;
  - le hash du code, jamais en clair ;
  - s'il y a un code provisoire à changer ;
  - s'il est staff ;
  - ses rôles ;
  - s'il est muet ;
  - s'il est désactivé.
- **Les jetons** sont dans `data/acces.json`, comme dans NextSession : un jeton par appareil connecté. On y garde aussi les essais ratés.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Chaque compte a son code à 4 chiffres.** Après 5 erreurs, le compte est bloqué 5 minutes, comme dans NextSession.
- **Sans jeton valable, rien ne se fait ni ne se lit au nom d'un compte.**
- **Les inscriptions ne ferment jamais.** Après la date limite d'inscription, fixée par le staff, une inscription tardive doit être acceptée par l'hébergeur.
- **Les staffs de départ** viennent de `config.json`, au premier démarrage seulement.
- **Les comptes** sont dans un fichier JSON de `data/`, que le webmaster peut modifier à la main.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- **Le staff**, quand un nouveau compte est créé : « Nouvelle inscription : Bob ».
- **L'hébergeur**, quand le compte est créé après la date limite : « Inscription tardive de Bob, à accepter ».
- **Le nouveau membre**, quand son inscription tardive est acceptée.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Un nom déjà pris**, ou trop proche d'un autre (en ignorant les majuscules et les accents) : la création est refusée.
- **Un nom vide** est refusé.
- **Un code qui n'a pas exactement 4 chiffres** est refusé, de même qu'**une confirmation différente du code**.
- **Un code oublié** : un staff le remet à zéro (Staff > Comptes).
- **Un compte désactivé** ne peut plus se connecter.
- **Une inscription tardive pas encore acceptée** : le compte peut tout lire et remplir sa fiche, mais pas réserver de nuits.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
- Aucune.

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Ma fiche](../compte/ma-fiche.md)
<!-- /nav -->
