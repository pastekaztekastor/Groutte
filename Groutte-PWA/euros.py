"""Montants : tout se compte en centimes (des entiers), et ne s'écrit en euros qu'à l'affichage."""


def euros(centimes):
    """« 1 400,00 € » d'après 140000 (les notifications ; la page a son propre format, paiement.js)."""
    signe = "-" if centimes < 0 else ""
    entiers, cents = divmod(abs(int(centimes)), 100)
    milliers = f"{entiers:,}".replace(",", " ")
    return f"{signe}{milliers},{cents:02d} €"


def centimes(valeur, requis=True):
    """Un montant reçu de la page : un entier de centimes, positif."""
    from requetes import Refus   # import ici : requetes importe comptes_donnees, pas ce module
    if not isinstance(valeur, int) or isinstance(valeur, bool):
        raise Refus("montant invalide")
    if valeur <= 0 and requis:
        raise Refus("le montant doit être plus grand que zéro")
    if valeur > 10_000_000:
        raise Refus("montant trop élevé")
    return valeur
