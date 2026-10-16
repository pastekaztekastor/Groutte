"""Les comptes (data/comptes.json) et les rôles (roles.json).

data/comptes.json : {nom: {"couleur", "staff", "roles": [id], "muet", "desactive", "code", "code_provisoire", "cree",
                           "inscription_acceptee"}}
- "code" : le code à 4 chiffres, haché (pbkdf2), jamais en clair. Vide : le compte choisira son code à la connexion.
- "code_provisoire" : le code a été remis à zéro par le staff (ou vient de config.json) ; à la connexion, la personne
  doit en choisir un nouveau.

Au premier démarrage, data/comptes.json n'existe pas : les comptes de départ viennent de config.json > comptes
({"nom", "staff", "code"}). Ensuite, c'est data/comptes.json qui décide (config.json n'est plus relu pour les comptes).

Ce module n'importe ni requetes ni acces : tout le monde peut l'importer.
"""
import hashlib
import hmac
import json
import re
import secrets

from stockage import COMPTES, ROLES, ecrire_json, lire_json, maintenant, sans_accent

ITERATIONS = 200_000
NOM_MAX = 30


# --- Codes ----------------------------------------------------------------------------------------

def hacher(code):
    sel = secrets.token_hex(16)
    empreinte = hashlib.pbkdf2_hmac("sha256", code.encode(), bytes.fromhex(sel), ITERATIONS).hex()
    return f"pbkdf2${ITERATIONS}${sel}${empreinte}"


def code_correct(code, hache):
    try:
        _, iterations, sel, empreinte = hache.split("$")
        calcul = hashlib.pbkdf2_hmac("sha256", str(code).encode(), bytes.fromhex(sel), int(iterations)).hex()
    except (ValueError, AttributeError):
        return False
    return hmac.compare_digest(calcul, empreinte)


def code_valide(code):
    return isinstance(code, str) and re.fullmatch(r"\d{4}", code) is not None


# --- Lecture et écriture --------------------------------------------------------------------------

def _compte_vide():
    # "inscription_acceptee" : {"par", "quand"} quand le staff accepte une inscription tardive (Gîte et salle).
    return {"couleur": "", "staff": False, "roles": [], "muet": False, "desactive": False,
            "code": "", "code_provisoire": False, "cree": "", "inscription_acceptee": None}


def _depart(config):
    """Les comptes de départ de config.json (premier démarrage seulement)."""
    comptes = {}
    for c in config.get("comptes", []):
        if not isinstance(c, dict) or not isinstance(c.get("nom"), str) or not c["nom"].strip():
            continue
        compte = _compte_vide()
        compte.update(couleur=c.get("couleur", ""), staff=bool(c.get("staff") or c.get("admin")), cree=maintenant())
        code = str(c.get("code", ""))
        if code_valide(code):
            compte.update(code=hacher(code), code_provisoire=True)
        comptes[c["nom"].strip()] = compte
    return comptes


def lire_comptes(config):
    """Tous les comptes, désactivés compris. Sans data/comptes.json : ceux de config.json (sans écrire)."""
    comptes = lire_json(COMPTES, None)
    if comptes is None:
        comptes = _depart(config)
    for compte in comptes.values():
        for cle, valeur in _compte_vide().items():
            compte.setdefault(cle, valeur)
    return comptes


def assurer_comptes(config):
    """Sous le verrou : écrit data/comptes.json s'il n'existe pas encore (premier démarrage)."""
    if not COMPTES.exists():
        ecrire_json(COMPTES, _depart(config))


def ecrire_comptes(comptes):
    ecrire_json(COMPTES, comptes)


def noms_actifs(config):
    return {nom for nom, c in lire_comptes(config).items() if not c["desactive"]}


def est_staff(config, nom):
    c = lire_comptes(config).get(nom)
    return bool(c and c["staff"] and not c["desactive"])


def staffs_actifs(comptes):
    return [nom for nom, c in comptes.items() if c["staff"] and not c["desactive"]]


def nom_propre(nom):
    """Un nom de compte nettoyé, ou une erreur lisible (None si tout va bien)."""
    nom = re.sub(r"\s+", " ", nom or "").strip()
    if not nom:
        return nom, "indique ton nom"
    if len(nom) > NOM_MAX:
        return nom, f"nom trop long ({NOM_MAX} caractères max)"
    if not re.fullmatch(r"[\w' .-]+", nom):
        return nom, "le nom ne peut contenir que des lettres, des chiffres, des espaces, ' . et -"
    return nom, None


def nom_pris(comptes, nom, sauf=None):
    """Un nom déjà pris, en ignorant les majuscules et les accents (« Chloé » = « chloe »)."""
    cible = sans_accent(nom)
    return any(sans_accent(n) == cible for n in comptes if n != sauf)


# --- Rôles (roles.json) ---------------------------------------------------------------------------

TYPES_ROLES = ("libre", "staff", "automatique")


def lire_roles():
    """[{"id", "nom", "type", ...}] : les entrées invalides sont ignorées."""
    try:
        brut = json.loads(ROLES.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return []
    roles = brut.get("roles", brut) if isinstance(brut, dict) else brut
    return [r for r in roles if isinstance(r, dict) and isinstance(r.get("id"), str) and isinstance(r.get("nom"), str)
            and r.get("type") in TYPES_ROLES]


def role(ident):
    return next((r for r in lire_roles() if r["id"] == ident), None)


# --- Renommer un compte partout -------------------------------------------------------------------
# Chaque module qui range des noms de comptes déclare comment les renommer :
#
#     @renommage
#     def renommer_trucs(ancien, nouveau):
#         ...   # appelé sous le verrou
#
RENOMMAGES = []


def renommage(fonction):
    RENOMMAGES.append(fonction)
    return fonction


def renommer_cle(chemin, ancien, nouveau):
    """Pour les fichiers {nom: ...} : déplace la clé `ancien` vers `nouveau`."""
    donnees = lire_json(chemin, {})
    if ancien in donnees:
        donnees[nouveau] = donnees.pop(ancien)
        ecrire_json(chemin, donnees)


def renommer_dans(donnees, ancien, nouveau, cles):
    """Renomme un compte dans une structure JSON : les clés de dictionnaire égales à `ancien` ({nom: ...}), et,
    sous les clés listées dans `cles`, les valeurs égales à `ancien` ou les listes qui le contiennent. Les textes
    libres (titres, messages) ne sont jamais touchés. Renvoie la structure modifiée."""
    if isinstance(donnees, list):
        return [renommer_dans(x, ancien, nouveau, cles) for x in donnees]
    if not isinstance(donnees, dict):
        return donnees
    resultat = {}
    for cle, valeur in donnees.items():
        if cle in cles:
            if valeur == ancien:
                valeur = nouveau
            elif isinstance(valeur, list):
                valeur = [nouveau if x == ancien else x for x in valeur]
        resultat[nouveau if cle == ancien else cle] = renommer_dans(valeur, ancien, nouveau, cles)
    return resultat


def renommer_fichier(chemin, ancien, nouveau, cles):
    """renommer_dans() appliqué à tout un fichier de données (sous le verrou)."""
    if chemin.exists():
        ecrire_json(chemin, renommer_dans(lire_json(chemin, {}), ancien, nouveau, cles))
