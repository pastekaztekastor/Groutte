<!-- nav -->
[Précédent : Mes repas](../repas/mes-repas.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Staff > Réglages LLM

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Poser les clés d'API des LLM qui lisent les tickets de caisse dans [Dépenses](../budget/depenses.md) (« Préremplir avec le ticket »).
- Trois fournisseurs possibles : **Claude** (Anthropic), **ChatGPT** (OpenAI) et **Mistral**. On en aura sans doute un seul, mais la page en accepte trois, et le staff choisit celui qui sert.
- Sans clé qui marche, l'option « Préremplir avec le ticket » n'apparaît pas dans Dépenses. La saisie à la main suffit.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Le staff seul.** Les ploucs voient seulement le résultat : l'option dans Dépenses, et la question 17 de [Comment ça marche](../budget/comment-ca-marche.md).
- **Tout staff peut tout modifier**, y compris une clé posée par un autre. Qui paie la clé s'arrange entre staffs, à la bonne franquette.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Le fournisseur actif** : un choix parmi les fournisseurs dont la clé a été testée avec succès. Les autres sont grisés.
2. **Un bloc par fournisseur** (Claude, ChatGPT, Mistral) :
   - l'état de la clé : *aucune clé*, *clé testée le 12/11*, ou *clé refusée le 30/12* ;
   - la clé, masquée : seuls les 4 derniers caractères sont affichés (`sk-…a3f2`) ;
   - les boutons **Poser une clé**, **Tester** et **Retirer** ;
   - **l'encart d'aide**, replié, qui explique comment obtenir une clé chez ce fournisseur (voir Règles et calculs).
3. **Le compteur** : le nombre de tickets lus ce mois-ci, par fournisseur.

```
Réglages LLM
┌───────────────────────────────────────────┐
│ Fournisseur actif                         │
│ (o) Claude   ( ) ChatGPT   ( ) Mistral    │
│                  grisé      grisé         │
├─ Claude ──────────────────────────────────┤
│ Clé testée le 12/11         sk-…a3f2      │
│ [Remplacer]  [Tester]  [Retirer]          │
│ > Comment obtenir une clé ?               │
├─ ChatGPT ─────────────────────────────────┤
│ Aucune clé                [Poser une clé] │
│ > Comment obtenir une clé ?               │
├─ Mistral ─────────────────────────────────┤
│ Aucune clé                [Poser une clé] │
│ > Comment obtenir une clé ?               │
├───────────────────────────────────────────┤
│ Ce mois-ci : 23 tickets lus (Claude)      │
└───────────────────────────────────────────┘
```

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Poser une clé** (ou la remplacer) : un champ où on colle la clé. Elle est **testée tout de suite** ; si le test échoue, elle n'est pas enregistrée, et la page dit pourquoi (clé invalide, pas de crédit, fournisseur injoignable).
- **Tester** : un appel au fournisseur avec une image d'essai (un faux ticket). La page dit si la clé marche, et si la lecture d'image marche.
- **Choisir le fournisseur actif** : seulement parmi ceux dont la clé est testée.
- **Retirer** une clé, avec une confirmation. Si c'était le fournisseur actif, l'appli passe à un autre fournisseur testé s'il y en a un ; sinon, l'option disparaît de Dépenses.
- Chaque action est inscrite dans le journal du staff (voir [Staff > Comptes](comptes.md)), **sans jamais la clé**.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Les clés** sont dans `secrets/llm.json`, à la racine de l'appli, **hors de `data/`** et hors de git (voir Règles et calculs). Pour chaque fournisseur :
- la clé ;
- la date du dernier test réussi ;
- la date du dernier refus, s'il y en a un.

**Dans `data/reglages-llm.json`** :
- le fournisseur actif ;
- le compteur de tickets lus, par fournisseur et par mois.

**Dans `config.json`** : le modèle utilisé pour chaque fournisseur, choisi par le webmaster (le moins cher qui lit bien les images). Il n'est pas réglable dans l'appli.

**Dans chaque dépense** ([Dépenses](../budget/depenses.md)) : si le ticket a déjà été lu.

**Ce qui est lu ailleurs** : les catégories, dans [Réglages compta](reglages-compta.md), qu'on envoie au LLM pour qu'il les propose.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
**La sécurité des clés**
- **Une clé n'est jamais renvoyée** par le serveur, à personne, pas même au staff qui l'a posée. L'écran n'en reçoit que les 4 derniers caractères.
- **Elle n'apparaît nulle part ailleurs** : ni dans le journal du staff, ni dans les logs du serveur, ni dans les messages d'erreur.
- **Elle est rangée à part**, dans `secrets/` : hors de `data/`, donc hors des sauvegardes de `data/`, et dans `.gitignore`. Le fichier n'est lisible que par le serveur (droits `600`).
- **Si le serveur est réinstallé**, les clés sont perdues : il suffit de les reposer. C'est le prix de la sécurité.

**Une lecture par ticket, au plus**
- Chaque dépense a droit à **une seule lecture réussie**. Ensuite, le bouton « Préremplir avec le ticket » est grisé : « Ce ticket a déjà été lu ». Changer la photo ne donne pas une nouvelle lecture.
- **Un échec du fournisseur** (injoignable, clé refusée) ne compte pas : on peut réessayer.

**Ce qu'on demande au LLM**
- Le serveur envoie la photo avec une consigne claire : rendre la date, le total, et les lignes du ticket, chacune avec son montant et une catégorie choisie parmi celles de [Réglages compta](reglages-compta.md) (NON GÉRÉ compris), dans un format JSON fixé.
- **Si la réponse est lisible mais ne tombe pas juste** (la somme des lignes n'est pas le total) : la dépense est préremplie, et l'écart est affiché à l'auteur.
- **Si la réponse est illisible** (pas au bon format, catégorie inconnue, pas de montant) : « La lecture a échoué, saisis la dépense à la main ». La lecture compte quand même.
- Dans tous les cas, ce n'est qu'un préremplissage : l'auteur vérifie avant d'envoyer.

**Quand une clé ne marche plus** (refusée, crédit épuisé, fournisseur injoignable au moment de lire un ticket) :
1. le plouc voit : « La lecture des tickets n'est pas disponible pour le moment, saisis la dépense à la main ». Sa dépense reste en brouillon ;
2. **s'il y a un autre fournisseur testé**, l'appli bascule dessus pour les lectures suivantes, et le fournisseur actif change ;
3. **sinon**, l'option « Préremplir avec le ticket » disparaît de Dépenses, jusqu'à ce qu'un staff repose une clé qui marche ;
4. le staff est prévenu (voir Notifications).

**La vie privée** : la photo du ticket part chez le fournisseur. Une ligne le dit sous le bouton, dans Dépenses : « La photo est envoyée à Claude (Anthropic) pour être lue. Cache ta carte de fidélité si tu préfères. »

**Le coût** : la clé est payée par un staff, comme un frais de fonctionnement du site (nom de domaine, hébergement). Ces frais devraient être notés dans [Prévisionnel](previsionnel.md), qui est reporté.

**Les encarts d'aide**, un par fournisseur :

> **Claude (Anthropic)**
> 1. Va sur **console.anthropic.com** et crée un compte (ce n'est pas le même que claude.ai).
> 2. Dans *Billing*, ajoute un peu de crédit : 5 € suffisent largement pour la semaine.
> 3. Dans *Settings > Limits*, mets une limite de dépense mensuelle.
> 4. Dans *API Keys*, crée une clé, copie-la, et colle-la ici. Elle ne s'affiche qu'une fois.
>
> ⚠ Un abonnement Claude Pro ou Max **ne donne pas de clé d'API** : l'API se paie à part, à l'usage.

> **ChatGPT (OpenAI)**
> 1. Va sur **platform.openai.com** et connecte-toi (ce n'est pas la même chose que chatgpt.com).
> 2. Dans *Billing*, ajoute un peu de crédit : 5 € suffisent largement pour la semaine.
> 3. Dans *Limits*, mets une limite de dépense mensuelle.
> 4. Dans *API keys*, crée une clé, copie-la, et colle-la ici. Elle ne s'affiche qu'une fois.
>
> ⚠ Un abonnement ChatGPT Plus ou Pro **ne donne pas de clé d'API** : l'API se paie à part, à l'usage.

> **Mistral**
> 1. Va sur **console.mistral.ai** et crée un compte.
> 2. Choisis une offre d'API (il existe une offre d'essai gratuite, limitée : lis ses conditions, notamment sur l'usage des données envoyées).
> 3. Dans *API Keys*, crée une clé, copie-la, et colle-la ici.
>
> ⚠ Un abonnement Le Chat Pro **ne donne pas de clé d'API**.

> **Combien ça coûte ?** Lire un ticket coûte de l'ordre d'un centime, parfois moins. Une semaine de courses, c'est quelques dizaines de centimes.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
Dans la catégorie Dépenses (voir [Notifications](../compte/notifications.md)) :
- **Le staff**, quand une clé est refusée ou ne marche plus, **la première fois seulement** (jusqu'au prochain test réussi) : « La clé Claude ne marche plus : la lecture des tickets passe sur ChatGPT » ou « … est coupée ».

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Une clé qui échoue au test** n'est pas enregistrée.
- **Choisir comme actif un fournisseur sans clé testée** : impossible, il est grisé.
- **Retirer la dernière clé** : accepté, avec une confirmation qui dit que l'option disparaît de Dépenses.
- **Le fournisseur répond, mais très lentement** : au bout de 30 secondes, la lecture est considérée comme un échec du fournisseur, et ne compte pas.
- **Un ticket illisible** (photo floue, coupée) : la lecture a lieu et compte. La saisie à la main reste possible.
- **Deux ploucs lisent un ticket en même temps** : pas de souci, chaque lecture est indépendante.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Menu](../repas/menu.md)
<!-- /nav -->
