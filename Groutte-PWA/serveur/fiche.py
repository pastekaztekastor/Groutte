"""Ma fiche et Moyen de paiement : ce que chacun règle sur son compte en plus du socle (thème, photo, code).

Ranges dans data/profils.json (socle) : {nom: {
    "prenom", "pseudo", "discord", "telephone", "regimes": [..], "allergies", "photo_ok": bool,
    "categories": [id], "tournois": [id], "matelas": n, "duvets": n (absents : non renseigné),
    "paiement": {"titulaire", "iban", "paypal", "revolut", "lydia", "wero", "especes", "prefere"}}}
Les champs de la fiche passent par /api/profil (socle, comptes.py) grâce à @champ_profil.
"""
import re

from extensions import champ_profil
from requetes import Refus, texte
from routes import route
from stockage import PROFILS, ecrire_json, lire_json

MOYENS = ("virement", "wero", "paypal", "lydia", "revolut", "especes")


def regimes_proposes(config):
    regimes = config.get("regimes", [])
    return [r for r in regimes if isinstance(r, str) and r.strip()]


# --- Ma fiche ------------------------------------------------------------------------------------

def telephone_valide(valeur):
    if valeur and not re.fullmatch(r"\+?[\d ]{6,20}", valeur):
        raise Refus("téléphone invalide : seulement des chiffres, des espaces et un + au début")
    return valeur


@champ_profil
def regler_fiche(d, profil, corps):
    """/api/profil : les champs de Ma fiche (un champ à la fois, enregistré quand on le quitte)."""
    for cle, maxi in (("prenom", 40), ("pseudo", 40), ("discord", 40), ("allergies", 300)):
        if cle in corps:
            profil[cle] = texte(corps, cle, maxi)
    if "telephone" in corps:
        ancien = profil.get("telephone")
        profil["telephone"] = telephone_valide(texte(corps, "telephone", 20))
        # Wero se fait au numéro de téléphone : vide (ou resté sur l'ancien numéro), il suit le nouveau.
        paiement = profil.setdefault("paiement", {})
        if profil["telephone"] and paiement.get("wero", "") in ("", ancien):
            paiement["wero"] = profil["telephone"]
            ajuster_prefere(paiement)
        if not paiement:
            del profil["paiement"]
    if "photo_ok" in corps:
        if not isinstance(corps["photo_ok"], bool):
            raise Refus("consentement invalide")
        profil["photo_ok"] = corps["photo_ok"]
    if "categories" in corps:
        profil["categories"] = categories_cochees(corps["categories"], profil.get("categories", []))
    for objet in ("matelas", "duvets"):   # Couchage : un nombre, ou None (« non renseigné »)
        if objet in corps:
            n = corps[objet]
            if n is not None and (not isinstance(n, int) or isinstance(n, bool) or not 0 <= n <= 20):
                raise Refus(f"nombre de {objet} invalide")
            if n is None:
                profil.pop(objet, None)
            else:
                profil[objet] = n
    if "regimes" in corps:
        regimes = corps["regimes"]
        proposes = regimes_proposes(d.config)
        if not isinstance(regimes, list) or any(r not in proposes for r in regimes):
            raise Refus("régime inconnu")
        profil["regimes"] = [r for r in proposes if r in regimes]


def categories_cochees(demandees, actuelles):
    """Les catégories facultatives que je coche (Ce que je partage). Une catégorie supprimée garde sa coche : elle
    reste affichée, pour que chacun voie pourquoi il a payé."""
    import reglages_compta   # import ici : reglages_compta importe (de loin) ce module
    if not isinstance(demandees, list):
        raise Refus("catégories invalides")
    categories = reglages_compta.lire_categories()["categories"]
    proposees = {c["id"] for c in categories if c["type"] == "facultative" and not c["supprimee"]}
    if any(ident not in proposees for ident in demandees):
        raise Refus("catégorie inconnue")
    gardees = [i for i in actuelles if any(c["id"] == i and c["supprimee"] for c in categories)]
    return list(dict.fromkeys(gardees + demandees))


# --- Moyen de paiement ----------------------------------------------------------------------------

def iban_valide(valeur):
    iban = re.sub(r"\s", "", valeur).upper()
    if not iban:
        return ""
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{11,30}", iban):
        raise Refus("IBAN invalide")
    chiffres = "".join(str(int(c, 36)) for c in iban[4:] + iban[:4])
    if int(chiffres) % 97 != 1:
        raise Refus("IBAN invalide (clé de contrôle fausse, vérifie les chiffres)")
    return iban


def identifiant(valeur, domaine, nom):
    """« paypal.me/jean », « https://revolut.me/jean », « @jean » ou « jean » -> « jean »."""
    propre = re.sub(rf"^(https?://)?(www\.)?{re.escape(domaine)}/", "", valeur.strip(), flags=re.I).lstrip("@").strip("/")
    if propre and not re.fullmatch(r"[A-Za-z0-9._-]{1,40}", propre):
        raise Refus(f"identifiant {nom} invalide")
    return propre


@route("/api/paiement")
def regler_paiement(d):
    """Me rembourser : seules les clés envoyées changent. Vide = retiré."""
    corps = d.corps
    profils = lire_json(PROFILS, {})
    paiement = profils.setdefault(d.nom, {}).setdefault("paiement", {})
    if "titulaire" in corps:
        paiement["titulaire"] = texte(corps, "titulaire", 70)
    if "iban" in corps:
        paiement["iban"] = iban_valide(texte(corps, "iban", 50))
    if "paypal" in corps:
        paiement["paypal"] = identifiant(texte(corps, "paypal", 100), "paypal.me", "PayPal")
    if "revolut" in corps:
        paiement["revolut"] = identifiant(texte(corps, "revolut", 100), "revolut.me", "Revolut")
    if "lydia" in corps:
        lydia = texte(corps, "lydia", 300)
        if lydia and not re.fullmatch(r"https://\S+", lydia):
            raise Refus("lien Lydia/Sumeria invalide (il commence par https://)")
        paiement["lydia"] = lydia
    if "wero" in corps:
        wero = texte(corps, "wero", 100)
        if wero and not (re.fullmatch(r"\+?[\d ]{6,20}", wero) or re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", wero)):
            raise Refus("Wero : indique un numéro de téléphone ou une adresse mail")
        paiement["wero"] = wero
    if "especes" in corps:
        paiement["especes"] = bool(corps["especes"])
    if "prefere" in corps:
        if corps["prefere"] not in MOYENS + ("",):
            raise Refus("moyen inconnu")
        paiement["prefere"] = corps["prefere"]
    if paiement.get("iban") and not paiement.get("titulaire"):
        raise Refus("indique le titulaire du compte avec l'IBAN")
    for cle in [k for k, v in paiement.items() if v in ("", None, False)]:
        del paiement[cle]
    ajuster_prefere(paiement)
    ecrire_json(PROFILS, profils)


def ajuster_prefere(paiement):
    """Un seul moyen renseigné : c'est le préféré. Le préféré retiré : la préférence passe au premier moyen restant."""
    restants = moyens_renseignes(paiement)
    if paiement.get("prefere") in restants:
        return
    if paiement.get("prefere") or len(restants) == 1:
        paiement["prefere"] = restants[0] if restants else ""
    if not paiement.get("prefere"):
        paiement.pop("prefere", None)


def moyens_renseignes(paiement):
    """Les moyens remplis, dans l'ordre de MOYENS."""
    return [m for m in MOYENS if (paiement.get("iban") if m == "virement" else paiement.get(m))]
