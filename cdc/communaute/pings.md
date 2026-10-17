<!-- nav -->
[Précédent : Annonces](../staff/annonces.md) · [Menu](../../README.md#les-pages)
<!-- /nav -->

# Communauté > Pings reçus

## But
<!-- À quoi sert la page, en une ou deux phrases. -->
- Retrouver toutes les notifications qu'on m'a envoyées, même celles que j'ai balayées, ou que je n'ai jamais reçues parce que mes notifications sont coupées.
- **Personne ne rate une annonce du staff ou une relance** : celui qui n'a pas les notifications les voit à sa prochaine ouverture de l'appli.

## Qui voit, qui agit
<!-- Plouc, staff, ou seulement la personne concernée. -->
- **Chacun voit les siens**, et seulement les siens. Le staff aussi, en tant que plouc.

## Écran
<!-- Ce qu'on voit, de haut en bas. Un croquis ASCII est bienvenu. -->
1. **Un bandeau**, si je n'ai pas activé les notifications sur cet appareil : « Tu ne reçois pas les notifications. Active-les pour ne rien rater », avec un bouton vers [Notifications](../compte/notifications.md).
2. **La liste**, de la plus récente à la plus ancienne. Chaque ligne : la date, le titre, le texte, et qui l'envoie (« Alice, staff » pour une annonce). Les pings déjà lus sont grisés.
   - Toucher une ligne ouvre la page de la notification, comme si on touchait la notification elle-même.
3. **Un filtre** : *Tout*, *Annonces du staff*, *Relances*.

```
Pings reçus
┌───────────────────────────────────────────┐
│ 🔕 Tu ne reçois pas les notifications.    │
│    [Les activer]                          │
├───────────────────────────────────────────┤
│ [Tout] [Annonces] [Relances]              │
├───────────────────────────────────────────┤
│ 20/12 18:02  Gîte : dernier rappel     >  │
│ Il te reste 3 jours pour payer…           │
│ Alice, staff                              │
├───────────────────────────────────────────┤
│ 18/12 10:15  Petit rappel              >  │
│ Tu dois 12,00 € à Bob                     │
└───────────────────────────────────────────┘
```

**À l'ouverture de l'appli**, si j'ai des annonces ou des relances non lues : une fenêtre les montre, avec le bouton **J'ai vu**. Si je n'ai pas activé les notifications, elle propose aussi **Activer les notifications**.

## Actions
<!-- Chaque bouton ou saisie, et ce qui se passe ensuite. -->
- **Toucher une ligne** : elle passe en lu, et la bonne page s'ouvre.
- **Tout marquer comme lu.**
- **Activer les notifications** (bandeau ou fenêtre) : ouvre la page Notifications.

## Données
<!-- Ce qui est enregistré, et d'où viennent les données lues ailleurs. -->
**Dans `data/pings.json`**, une ligne par notification envoyée à une personne :
- le destinataire ;
- la date ;
- le type : annonce, relance, ou autre ;
- le titre, le texte et la page qui s'ouvre ;
- qui l'envoie, quand c'est une personne ;
- lu ou non.

**Ce qui est écrit ici par les autres pages** : chaque notification envoyée par l'appli ([Annonces](../staff/annonces.md), la relance de [Mes comptes](../budget/mes-comptes.md), et les autres), qu'elle soit partie ou non.

## Règles et calculs
<!-- Formules, répartitions, valeurs par défaut. -->
- **Tout est gardé**, que la notification soit partie ou non (pas de notifications activées, catégorie coupée).
- **La pastille** du menu Communauté compte les pings non lus.
- **La fenêtre à l'ouverture** ne concerne que les annonces du staff et les relances : ce sont les seuls messages qu'une personne envoie exprès à une autre. Elle s'affiche pour tout le monde, notifications activées ou non : une notification balayée sans être lue y revient.

## Notifications
<!-- Qui reçoit quoi, et quand. -->
- Aucune : la page garde celles des autres.

## Cas limites
<!-- Ce qui doit être refusé, et les cas bizarres. -->
- **Aucun ping** : « Rien pour l'instant ».
- **Une notification vers une page qui n'existe plus** (un menu supprimé, par exemple) : la ligne reste, et la toucher ouvre la page parente (Menu).
- **Un compte désactivé** : ses pings restent, mais il ne peut plus se connecter pour les voir.

## Questions ouvertes
<!-- Ce qui n'est pas encore tranché. -->
-

<!-- nav -->
[Menu](../../README.md#les-pages) · [Suivant : Messages](../communaute/messages.md)
<!-- /nav -->
