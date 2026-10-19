# À faire

## Rapidement

- [x] les réglage des mode de répartition de gite et salle bouge dans réglage compta
- [ ] Le X/X qui est dans le menu. Affiche nombre d'inscrit sur nombre de mangeur mais c'est le meme nombre donc on fait nombre d'inscrit sur nombre de présent.
- [ ] grand notif indigest, soit une liste soit un "ouvrir pour voire" 
- [ ] staff peu reroll l'ia dans validation de dépense et dépenses.
- [x] ajouter brouillon pour les dépense pour save la dépense et le ticket mais ladétaillé plus tard
- [ ] J'ai tester avec une vrai clée et quand je la teste et que je vais tester ça ne marche pas. juste ça tourne et rien. 

## Avant lancement

- [x] sur téléphone l'icon de l'app n'as pas la pastille avec le nombre de notif non lu. 
- [x] Page d'accueil en dashboard ?
- [x] Quand on se connecte la promière fois un enchainement de page pour guider les utilisateurs ? Comme on a déjà commecer l'orga certain utilisateur existerons déjà et aurons été pré remplis avec ce qu'il nous on dis. Si c'est la cas les infos seront pré rempli
- [x] Faire la premier page du tournoi et les cdc à envoer à jik

## Jalon 3 : rodage (avant la présentation à Josh)

- [x] quand on utilise annonce le texte d'exemple doit être préremplit pas jsute en model pour ne pas avoir à le retaper.
- [x] quand tu set ta venu ca te met ta préence on te dis combien coutera le git mais pas la sall on vire cette info c'est un doublon avec la page de créance on la remplace pas un lien pour la page. 
- [x] Les filtres sont sous "filtre" puis "groupe" ... On fait "fitre par groupe" , "filtre par ..." pour chaque groupe de filtre et on faite en sorte que les filtre de ces groupes soient dépliables avec une fleche. evite de scroll sur une page longue pour rien.
- [x] moyen de paiment pref si 'il n'y en a qu'un c'est celui qu'on a renseigné.
- [x] Afficher la page dépenses que quand un bouton dans la page staff compta pour le rendre visibe ou non. 
- [x] si on met son num de téléphone, le wero est rempli aussi 
- [x] dans le side pan vire le bouton ma fiche qui fait doulbon avec le top ptn
- [x] Mes compte deviens Remboursement
- [x] Quand on se déconnect, il faut fermet le sid panel.
- [x] Me rembourser deveins moyen de paiment 
- [x] refaire l'orde dans le side pan
- [x] Poser une vraie clé LLM et tester la lecture d'un vrai ticket (le chemin complet n'a été testé qu'avec un fournisseur simulé, et avec une fausse clé refusée par Anthropic).

## Jalon 2

Fait, testé en local (API et parcours dans Chromium). À faire ou à trancher :

- [x] Faire des icônes d'app différentes pour les différents environnements et changer aussi les noms des bandeaux, notifs, etc.

- [ ] Commencer à remplire les info de test avec le jeux de donné de anné précédente
- [ ] Reporter dans `Squelette-PWA` ce qui est générique : `ouvrirFeuille()`, `qui(nom, lien)`, `lienContact()`, `renommer_dans()`.
- [x] Remplir `discord_gestion` dans `Groutte-PWA/config.json` (sinon pas de bouton Discord sur Contacter le staff).
- [x] Vérifier les heures des repas (`heures_repas` dans `config.json` : 8 h, 12 h, 19 h), question ouverte de Mes repas.
- [x] Lits : une date d'ouverture des réservations ? (question ouverte de la fiche Lits ; aujourd'hui, premier arrivé, premier servi). on garde ce système
- [x] Ma fiche : SAM repoussé, seul le texte est affiché (décidé au jalon 3).
- [x] Clôture des comptes : le bouton est dans Réglages compta (jalon 3).
- [x] Choix fait sans fiche : un staff n'est jamais une inscription tardive (c'est lui qui accepte les inscriptions).
- [x] répartition du prix du gite : prévoire l'option a part égale aussi. 
- [x] rajouter l'exemptation de frait de communauté. 
- [x] Faire l'auto cochage des repas (jalon 3 : repas gérés dans Réglages compta). Nous ne gérons pas le petit déjeuné ni le diné. seulement le soir qui est compté par défaut. Pour ne pas defaire ce que j'ai fait dans une page staff (a définir) on met en option pour les 3 repas de la journée s'il sont prit en compte par l'orge (si oui la colonne de mes-repas est disponible) et si on à le choix par défaut a oui ou non. pour savoir s'il sont coché de base (ce que l'on fait) ou non. par d"faut l'option est a oui. Le tableau de "mes repas" ne change pas, juste les zone sont éditable ou non. 
- [x] (jalon 3) Dans la page contacter le staff qui est la en attendant le mp. Ossibilité de faire un message qui sera une notif pour tout les membre staff. message de 40 caractère max. (c'est une notif pas un roman)

## Plus tard

- [ ] Vérifier les modèles de `llm_modeles` dans `config.json` (gpt-4o-mini et mistral-small-latest sont des choix par défaut, pas vérifiés avec une clé).
- [x] dans suivi des dépenses sur téléphone, ne garder que les colone de montant et a et mettre le reste en info si on clique sur la ligne
- [ ] les ticket seron tarpin long prévoir plusieur photo d'un meme ticket. 
- [ ] Scroll horizontall dans le forum désagrable sur ordi. Soit on met des fleche gauche droit soit pleine lagreur.
- [ ] Faire un bouton de changement de dataset. (avant la page de connection)
- [ ] Une fois la clée api connecter j'arrive a la tester elle est up sur le site mais l'auto remplissage ne marche pas. Je veux aussi qu'il propose de draft le montant et le titre s'il ne sont pas remplit
- [ ] Dans "Lits" faire un carouselle qui prend le plan et génè_re des image pour voir qui doirt ou sur le plan a chaque nuit. (mdr c'est inutile donc indispensable)

- [x] On vas faire un nouveau truc. 
    une groupe de page tournoi. dedans une page : "inscription"
    dans cette page 3 bloc pour les 3 tournoi de prévu. chaque bloc a : 
    - Nom du tournoi
    - une description
    - une liste de prérequi
    - une liste de jeux avec les liens des pages steam
    - une coche "je m'inscrit ?" 
    ça ajoute un role pour chaque tournoi 
    ex : le nom c'est "Tournois du plouc suprème" qui ce joue sur "guilty gear stirk" on a un role "GuiltyGear" donc c'est un role qui n'est ni le nom ni le jeu. 
    tout la data du contenu de cette page est dans un json séparé rempli le avec un placeholder de 3 tournoi. 
    on ajoute l'incription à ce truc à la page d'accueil et au guide. 

- [x] On modifie le tableau "le groupe" dans la page "Présence" 
    Actuellement on à colonne [Matin][Midi][Soir][Nuit] et le ligne [Jours]... . Le contenue c'est la quantité de personner présente en chiffre
    On change ça, en colonne les image de profil de tout les présents en lignes [Jours 1 matin][Jours 1 midi][Jours 1 soir][Jours 1 nuit][Jours 2 matin] etc. 
    Le contenu c'est de bande de couleur qui vons de l'arrivé au départ de la personne.$
    je te met un ascii de ce que je veux 
    ```txt
                    (m) (a) (p) (j)
    L 28/12 matin    I  
            midi     I
            soir     I   I   I
            nuit     I   I   I 
    M 29/12 matin    I   I   I   I
            midi     I   I   I   I
            soir     I   I   I   I
            nuit         I   I   I
    ```
    De plus si c'est possible de mettre " L 28/12" en vertical pour gagner de la place (trop compliqué a faire en ascii)

- [x] On modifie un peu les pages. Actuellement le bandeau [[BTN ouverture side pane][Titre page]       ]change 
    - nouvelle disposition : [[burger menu][Titre page]      [Btn fiche]]
    - il est toujours visible top
    - modification uniquement téléphone

- [x] quand tu créer un compte, une fois que tu a mis ton nom est ton code et confirmé, il te remet sur la page de connexion mais on cmpte n'aparrais pas dans la liste. Il faut automatiqueùent charger le guide. On ne dois pas pouvoir acceder au res du site si on a pas completer oupasser le guide.

- [x] Revoire les grace
