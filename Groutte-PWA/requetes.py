"""Lecture et validation des requêtes, refus renvoyés au navigateur."""
import json

import comptes_donnees as cd

TAILLE_MAX_CORPS = 50_000


class Refus(Exception):
    """Requête refusée : le message part tel quel au navigateur avec le statut HTTP. Écris-le pour l'utilisateur
    (la page l'affiche : « Pas enregistré : <message> »)."""

    def __init__(self, message, statut="400 Bad Request"):
        super().__init__(message)
        self.statut = statut


def interdit(message):
    return Refus(message, "403 Forbidden")


def lire_corps(environ):
    try:
        taille = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        raise Refus("requête invalide")
    if taille > TAILLE_MAX_CORPS:
        raise Refus("requête trop longue", "413 Payload Too Large")
    try:
        corps = json.loads(environ["wsgi.input"].read(taille))
    except ValueError:
        raise Refus("requête invalide")
    if not isinstance(corps, dict):
        raise Refus("requête invalide")
    return corps


def texte(corps, cle, maxi, requis=False):
    """Un champ texte du corps, nettoyé et borné."""
    valeur = corps.get(cle, "")
    if not isinstance(valeur, str):
        raise Refus(f"{cle} invalide")
    valeur = valeur.strip()
    if requis and not valeur:
        raise Refus(f"{cle} manquant")
    if len(valeur) > maxi:
        raise Refus(f"{cle} trop long ({maxi} caractères max)")
    return valeur


def compte(config, corps, cle):
    """Un compte actif désigné dans le corps (`nom` pour celui qui agit, `qui` pour une autre personne)."""
    nom = corps.get(cle)
    if not isinstance(nom, str) or nom not in cd.noms_actifs(config):
        raise Refus("compte inconnu")
    return nom


# Seules routes acceptées tant que le compte a un code provisoire à changer.
ROUTES_CODE_PROVISOIRE = {"/api/code/changer"}


class Demande:
    """Le corps d'une requête POST et le compte qui l'envoie (`nom`, toujours ajouté par la page)."""

    def __init__(self, config, corps, jeton="", chemin=""):
        from acces import exiger_jeton  # import ici : acces importe Refus depuis ce module
        self.config = config
        self.corps = corps
        self.nom = compte(config, corps, "nom")
        exiger_jeton(config, self.nom, jeton)   # chaque compte est protégé par son code
        fiche = cd.lire_comptes(config)[self.nom]
        if fiche["code_provisoire"] and chemin and chemin not in ROUTES_CODE_PROVISOIRE:
            raise Refus("choisis d'abord ton nouveau code", "401 Unauthorized")
        self.staff = fiche["staff"]
        self.muet = fiche["muet"]

    def exiger_staff(self):
        if not self.staff:
            raise interdit("réservé au staff")

    def exiger_parole(self):
        """Pour écrire, commenter, répondre ou réagir dans la Communauté."""
        if self.muet:
            raise interdit("tu ne peux plus écrire pour le moment")
