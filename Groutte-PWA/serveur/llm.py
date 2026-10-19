"""Staff > Réglages LLM, et la lecture des tickets de caisse dans Dépenses (« Préremplir avec le ticket »).

Trois fournisseurs possibles : Claude (Anthropic), ChatGPT (OpenAI) et Mistral. Le staff pose une clé d'API par
fournisseur, et choisit celui qui sert (le fournisseur actif). Les appels se font en HTTP, avec la bibliothèque
standard ; le modèle de chaque fournisseur est réglé par le webmaster dans config.json > llm_modeles.

La sécurité des clés :
- secrets/llm.json, à la racine de l'appli : hors de data/ (donc hors des sauvegardes de data/) et hors de git ; le
  dossier en 700, le fichier en 600. {fournisseur: {"cle", "teste": horodatage, "refuse": horodatage}}.
- Une clé n'est jamais renvoyée, à personne : l'état n'en donne que les 4 derniers caractères. Elle n'apparaît ni dans
  le journal du staff, ni dans les messages d'erreur, ni dans les logs.
- Si le serveur est réinstallé, les clés sont perdues : il suffit de les reposer.

data/reglages-llm.json : {"actif": fournisseur ou "", "compteur": {"AAAA-MM/fournisseur": n}, "prevenu": {fournisseur: bool}}

Une lecture prend jusqu'à 30 s : les routes qui appellent un fournisseur sont hors du verrou (routes.py, sans_verrou) et
le prennent seulement pour écrire. Une seule lecture réussie par dépense (« lu_llm » dans la dépense) ; un échec du
fournisseur ne compte pas. Quand une clé ne marche plus, l'appli bascule sur un autre fournisseur testé (le fournisseur
actif change), sinon l'option disparaît de Dépenses ; le staff est prévenu la première fois.
"""
import base64
import json
import os
import re
import urllib.error
import urllib.request
from datetime import date

import comptes_donnees as cd
import depenses
import medias
import reglages_compta
from notifications import notifier
from requetes import Refus
from routes import route
from donnees import DEPENSES, REGLAGES_LLM
from stockage import DOSSIER_SECRETS, SERVEUR_PROJET as SERVEUR, aujourdhui, ecrire_json, lire_json, maintenant, nouvel_id, verrou

FOURNISSEURS = {
    "claude": {"nom": "Claude", "societe": "Anthropic", "url": "https://api.anthropic.com/v1/messages"},
    "chatgpt": {"nom": "ChatGPT", "societe": "OpenAI", "url": "https://api.openai.com/v1/chat/completions"},
    "mistral": {"nom": "Mistral", "societe": "Mistral AI", "url": "https://api.mistral.ai/v1/chat/completions"},
}
# Le moins cher qui lit bien les images, pour chaque fournisseur. Le webmaster le change dans config.json > llm_modeles.
MODELES_DEFAUT = {"claude": "claude-haiku-5-5", "chatgpt": "gpt-4o-mini", "mistral": "mistral-small-latest"}
SECRETS = DOSSIER_SECRETS / "llm.json"
ESSAI = SERVEUR / "llm-essai.png"   # faux ticket (outils/ticket-essai.svg) : 3 lignes, 12,50 € au total
DELAI = 30
TAILLE_MAX_IMAGE = 3_500_000    # au-delà, on envoie l'aperçu léger (1280 px)
ECHEC_LECTURE = "la lecture a échoué : saisis la dépense à la main"
INDISPONIBLE = "la lecture des tickets n'est pas disponible pour le moment : saisis la dépense à la main"


class EchecFournisseur(Exception):
    """Le fournisseur n'a pas répondu, ou a refusé la clé. Le message est lisible, et ne contient jamais la clé."""


class Illisible(Exception):
    """Le fournisseur a répondu, mais la réponse n'est pas exploitable."""


# --- Les fichiers ---------------------------------------------------------------------------------

def lire_secrets():
    return lire_json(SECRETS, {})


def ecrire_secrets(donnees):
    """Sous le verrou : le fichier n'est lisible que par le serveur (600), dans un dossier en 700."""
    DOSSIER_SECRETS.mkdir(mode=0o700, exist_ok=True)
    os.chmod(DOSSIER_SECRETS, 0o700)
    temporaire = SECRETS.with_suffix(".tmp")
    descripteur = os.open(temporaire, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descripteur, "w", encoding="utf-8") as fichier:
        json.dump(donnees, fichier, ensure_ascii=False, indent=1, sort_keys=True)
    os.chmod(temporaire, 0o600)
    os.replace(temporaire, SECRETS)


def lire_reglages():
    donnees = lire_json(REGLAGES_LLM, {})
    donnees.setdefault("actif", "")
    donnees.setdefault("compteur", {})
    donnees.setdefault("prevenu", {})
    return donnees


def teste(secrets, fournisseur):
    """La clé de ce fournisseur a marché à son dernier test, et n'a pas été refusée depuis."""
    s = secrets.get(fournisseur)
    return bool(s and s.get("teste") and s["teste"] > s.get("refuse", ""))


def actif(reglages=None, secrets=None):
    """Le fournisseur qui lit les tickets, ou "" : l'option n'apparaît pas dans Dépenses."""
    reglages = reglages or lire_reglages()
    secrets = secrets if secrets is not None else lire_secrets()
    return reglages["actif"] if reglages["actif"] in FOURNISSEURS and teste(secrets, reglages["actif"]) else ""


def nom_complet(fournisseur):
    f = FOURNISSEURS[fournisseur]
    return f"{f['nom']} ({f['societe']})"


def modele(config, fournisseur):
    choisis = config.get("llm_modeles") if isinstance(config.get("llm_modeles"), dict) else {}
    return choisis.get(fournisseur) or MODELES_DEFAUT[fournisseur]


# --- L'appel au fournisseur -----------------------------------------------------------------------

def consigne(categories):
    """Ce qu'on demande au LLM : un JSON fixé, avec une catégorie de Réglages compta (Non géré compris) par ligne."""
    liste = "\n".join(f"  - {c['id']} : {c['nom']}" for c in categories)
    return (
        "Tu lis la photo d'un ticket de caisse pour préremplir une dépense partagée entre amis.\n"
        "Réponds uniquement avec un objet JSON, sans aucun texte autour, de cette forme exacte :\n"
        '{"magasin": "Nom du magasin", "date": "AAAA-MM-JJ", "total": 12.5, '
        '"lignes": [{"libelle": "Pâtes", "montant": 2.5, "categorie": "alimentaire"}]}\n'
        "Règles :\n"
        "- montant et total en euros, des nombres avec un point décimal ; les remises sont déduites de leur ligne ;\n"
        "- total : le montant total payé, écrit sur le ticket ;\n"
        "- date : la date du ticket, ou \"\" si elle est illisible ;\n"
        "- categorie : exactement un de ces identifiants (non-gere pour un achat personnel, ou si rien ne convient) :\n"
        f"{liste}\n")


def schema(ids):
    return {"type": "object", "additionalProperties": False, "required": ["magasin", "date", "total", "lignes"],
            "properties": {
                "magasin": {"type": "string"}, "date": {"type": "string"}, "total": {"type": "number"},
                "lignes": {"type": "array", "items": {
                    "type": "object", "additionalProperties": False, "required": ["libelle", "montant", "categorie"],
                    "properties": {"libelle": {"type": "string"}, "montant": {"type": "number"},
                                   "categorie": {"type": "string", "enum": ids}}}}}}


def requete(fournisseur, cle, nom_modele, image, type_image, texte, ids):
    """(entêtes, corps) de la requête HTTP pour ce fournisseur."""
    donnees = base64.b64encode(image).decode()
    if fournisseur == "claude":
        entetes = {"x-api-key": cle, "anthropic-version": "2023-06-01"}
        corps = {"model": nom_modele, "max_tokens": 4000,
                 "output_config": {"format": {"type": "json_schema", "schema": schema(ids)}},
                 "messages": [{"role": "user", "content": [
                     {"type": "image", "source": {"type": "base64", "media_type": type_image, "data": donnees}},
                     {"type": "text", "text": texte}]}]}
    else:
        url = f"data:{type_image};base64,{donnees}"
        entetes = {"Authorization": f"Bearer {cle}"}
        corps = {"model": nom_modele, "response_format": {"type": "json_object"},
                 "messages": [{"role": "user", "content": [
                     {"type": "text", "text": texte},
                     {"type": "image_url", "image_url": url if fournisseur == "mistral" else {"url": url}}]}]}
    return dict(entetes, **{"Content-Type": "application/json"}), json.dumps(corps).encode()


def appeler(fournisseur, cle, nom_modele, image, type_image, categories):
    """Envoie la photo, renvoie le texte de la réponse. Lève EchecFournisseur (clé, crédit, réseau) ou Illisible."""
    ids = [c["id"] for c in categories]
    entetes, corps = requete(fournisseur, cle, nom_modele, image, type_image, consigne(categories), ids)
    demande = urllib.request.Request(FOURNISSEURS[fournisseur]["url"], data=corps, headers=entetes, method="POST")
    try:
        with urllib.request.urlopen(demande, timeout=DELAI) as reponse:
            donnees = json.loads(reponse.read())
    except urllib.error.HTTPError as erreur:
        try:
            detail = erreur.read(2000).decode("utf-8", "replace").lower()
        except OSError:
            detail = ""
        raise EchecFournisseur(raison_http(erreur.code, detail)) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise EchecFournisseur("fournisseur injoignable (réseau, ou trop lent)") from None
    except ValueError:
        raise Illisible() from None
    try:
        if fournisseur == "claude":
            if donnees.get("stop_reason") == "refusal":
                raise Illisible()
            return "".join(b.get("text", "") for b in donnees["content"] if b.get("type") == "text")
        return donnees["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError, AttributeError):
        raise Illisible() from None


def raison_http(code, detail):
    """Une raison lisible d'après la réponse du fournisseur (jamais recopiée telle quelle : elle pourrait citer la clé)."""
    if code in (401, 403):
        return "clé refusée par le fournisseur (invalide ou révoquée)"
    if code == 402 or any(m in detail for m in ("credit", "billing", "insufficient", "quota", "balance")):
        return "plus de crédit chez le fournisseur, ou limite de dépense atteinte"
    if code == 404:
        return "modèle introuvable chez le fournisseur : vérifie llm_modeles dans config.json"
    if code == 429:
        return "trop de demandes : le fournisseur limite, réessaie dans un moment"
    if code >= 500:
        return "le fournisseur est en panne pour le moment"
    return f"le fournisseur refuse la demande (erreur {code}) : vérifie le modèle dans config.json"


def interpreter(texte, ids):
    """La réponse du LLM -> {"date", "motif", "montant", "lignes": [{"categorie", "montant"}], "ecart"} (centimes),
    les lignes regroupées par catégorie. Lève Illisible si elle n'est pas exploitable."""
    texte = re.sub(r"^```(json)?|```$", "", texte.strip()).strip()
    debut, fin = texte.find("{"), texte.rfind("}")
    try:
        donnees = json.loads(texte[debut:fin + 1])
        total = round(float(donnees["total"]) * 100)
        lignes = donnees["lignes"]
        if not isinstance(lignes, list) or not lignes or total <= 0:
            raise Illisible()
        parts = {}
        for l in lignes:
            if l["categorie"] not in ids:
                raise Illisible()
            parts[l["categorie"]] = parts.get(l["categorie"], 0) + round(float(l["montant"]) * 100)
    except (ValueError, KeyError, TypeError):
        raise Illisible() from None
    if any(m < 0 for m in parts.values()) or total > 10_000_000:
        raise Illisible()
    jour = donnees.get("date") if isinstance(donnees.get("date"), str) else ""
    try:
        date.fromisoformat(jour)
    except ValueError:
        jour = ""
    motif = donnees.get("magasin") if isinstance(donnees.get("magasin"), str) else ""
    return {"date": jour, "motif": " ".join(motif.split())[:120], "montant": total,
            "lignes": [{"categorie": c, "montant": m} for c, m in parts.items() if m > 0],
            "ecart": total - sum(parts.values())}


def categories_proposees():
    return [c for c in reglages_compta.lire_categories()["categories"] if not c["supprimee"]] + [reglages_compta.NON_GERE]


# --- Clés : réussite, échec, bascule (sous le verrou) ---------------------------------------------

def reussite(fournisseur):
    secrets = lire_secrets()
    secrets[fournisseur]["teste"] = maintenant()
    ecrire_secrets(secrets)
    reglages = lire_reglages()
    reglages["prevenu"].pop(fournisseur, None)
    if not actif(reglages, secrets):
        reglages["actif"] = fournisseur
    ecrire_json(REGLAGES_LLM, reglages)


def echec(config, fournisseur, raison):
    """La clé ne marche plus : bascule sur un autre fournisseur testé, sinon l'option disparaît ; le staff est prévenu la
    première fois (jusqu'au prochain test réussi)."""
    secrets = lire_secrets()
    if fournisseur not in secrets:
        return
    secrets[fournisseur]["refuse"] = maintenant()
    ecrire_secrets(secrets)
    reglages = lire_reglages()
    suite = ""
    if reglages["actif"] == fournisseur:
        autres = [f for f in FOURNISSEURS if f != fournisseur and teste(secrets, f)]
        reglages["actif"] = autres[0] if autres else ""
        suite = f" : la lecture des tickets passe sur {FOURNISSEURS[autres[0]]['nom']}" if autres else " : la lecture des tickets est coupée"
    if not reglages["prevenu"].get(fournisseur):
        reglages["prevenu"][fournisseur] = True
        notifier(config, "depenses", "Réglages LLM", f"La clé {FOURNISSEURS[fournisseur]['nom']} ne marche plus ({raison}){suite}.",
                 "#reglages-llm", destinataires=set(cd.staffs_actifs(cd.lire_comptes(config))))
    ecrire_json(REGLAGES_LLM, reglages)


def fournisseur_valide(d):
    f = d.corps.get("fournisseur")
    if f not in FOURNISSEURS:
        raise Refus("fournisseur inconnu")
    return f


def essai(config, fournisseur, cle):
    """Lit le faux ticket. Renvoie True si la lecture d'image marche (12,50 € retrouvés), False si la clé marche mais
    pas la lecture. Lève EchecFournisseur si la clé ne marche pas."""
    categories = categories_proposees()
    try:
        texte = appeler(fournisseur, cle, modele(config, fournisseur), ESSAI.read_bytes(), "image/png", categories)
        return interpreter(texte, [c["id"] for c in categories])["montant"] == 1250
    except Illisible:
        return False


def noter(d, action, detail):
    import staff   # import ici : staff importe gite_salle, qui importe compta, qui importe depenses
    staff.noter(d, action, detail=detail)


@route("/api/llm/cle", sans_verrou=True)
def poser_cle(d):
    """Poser (ou remplacer) une clé : elle est testée tout de suite, et n'est enregistrée que si le test passe."""
    d.exiger_staff()
    f = fournisseur_valide(d)
    cle = d.corps.get("cle")
    if not isinstance(cle, str) or not re.fullmatch(r"\S{10,300}", cle.strip()):
        raise Refus("colle la clé entière, sans espace")
    cle = cle.strip()
    try:
        lecture = essai(d.config, f, cle)
    except EchecFournisseur as erreur:
        raise Refus(f"clé pas enregistrée : {erreur}") from None
    with verrou():
        secrets = lire_secrets()
        secrets[f] = {"cle": cle, "teste": "", "refuse": ""}
        ecrire_secrets(secrets)
        reussite(f)
        noter(d, "llm-cle", FOURNISSEURS[f]["nom"])
    return {"llm_test": {"fournisseur": f, "lecture": lecture}}


@route("/api/llm/tester", sans_verrou=True)
def tester(d):
    """Un appel au fournisseur avec le faux ticket : la clé marche-t-elle, et la lecture d'image ?"""
    d.exiger_staff()
    f = fournisseur_valide(d)
    cle = lire_secrets().get(f, {}).get("cle")
    if not cle:
        raise Refus("pas de clé pour ce fournisseur")
    try:
        lecture = essai(d.config, f, cle)
    except EchecFournisseur as erreur:
        with verrou():
            echec(d.config, f, str(erreur))
            noter(d, "llm-test", f"{FOURNISSEURS[f]['nom']} : échec")
        return {"llm_test": {"fournisseur": f, "erreur": str(erreur)}}
    with verrou():
        reussite(f)
        noter(d, "llm-test", f"{FOURNISSEURS[f]['nom']} : réussi")
    return {"llm_test": {"fournisseur": f, "lecture": lecture}}


@route("/api/llm/actif")
def choisir_actif(d):
    d.exiger_staff()
    f = fournisseur_valide(d)
    if not teste(lire_secrets(), f):
        raise Refus("ce fournisseur n'a pas de clé testée")
    reglages = lire_reglages()
    reglages["actif"] = f
    ecrire_json(REGLAGES_LLM, reglages)
    noter(d, "llm-actif", FOURNISSEURS[f]["nom"])


@route("/api/llm/retirer")
def retirer(d):
    d.exiger_staff()
    f = fournisseur_valide(d)
    secrets = lire_secrets()
    if f not in secrets:
        return
    del secrets[f]
    ecrire_secrets(secrets)
    reglages = lire_reglages()
    reglages["prevenu"].pop(f, None)
    if reglages["actif"] == f:
        autres = [x for x in FOURNISSEURS if teste(secrets, x)]
        reglages["actif"] = autres[0] if autres else ""
    ecrire_json(REGLAGES_LLM, reglages)
    noter(d, "llm-retirer", FOURNISSEURS[f]["nom"])


# --- Lire un ticket (Dépenses) --------------------------------------------------------------------

def image_du_ticket(ticket):
    """(octets, type) : l'original, ou son aperçu léger s'il est trop gros pour le fournisseur."""
    chemin = medias.chemin(ticket)
    apercu = medias.chemin(ticket.split(".")[0] + "-a.jpg")
    if chemin.stat().st_size > TAILLE_MAX_IMAGE and apercu:
        chemin = apercu
    return chemin.read_bytes(), medias.TYPES_IMAGES[chemin.suffix]


@route("/api/depenses/lire", sans_verrou=True)
def lire_ticket(d):
    """Préremplir une dépense avec la photo de son ticket (`ticket`). Sans `id`, un brouillon est créé avec la photo.
    Renvoie {"depense", "lecture"} ou {"depense", "lecture_erreur"}."""
    reglages_compta.exiger_depenses_visibles(d)
    with verrou():
        secrets, reglages = lire_secrets(), lire_reglages()
        f = actif(reglages, secrets)
        if not f:
            raise Refus(INDISPONIBLE)
        cle = secrets[f]["cle"]
        ticket = depenses.ticket_valide(d.corps.get("ticket"))
        if not ticket:
            raise Refus("ajoute d'abord la photo du ticket")
        import compta   # import ici : compta importe depenses, qui est importé par ce module
        if compta.Compta(d.config).cloture():
            raise Refus("les comptes sont clôturés : plus de nouvelle dépense")
        donnees = depenses.lire()
        ident = d.corps.get("id")
        if ident:
            dep = depenses.trouver(donnees, ident)
            depenses.exiger_modifiable(d, dep)
            if dep["lu_llm"]:
                raise Refus("ce ticket a déjà été lu")
            if dep["ticket"] and dep["ticket"] != ticket:
                medias.supprimer(dep["ticket"])
            dep["ticket"] = ticket
        else:
            dep = {"id": nouvel_id(), "auteur": d.nom, "saisie": maintenant(), "date": aujourdhui(), "motif": "", "montant": 0,
                   "mode": "communaute", "concernes": [], "lignes": [], "ticket": ticket, "etat": "brouillon", "parts": {},
                   "refus": "", "valide_le": "", "historique": [], "lu_llm": ""}
            donnees["depenses"].append(dep)
        ecrire_json(DEPENSES, donnees)
        categories = categories_proposees()
    image, type_image = image_du_ticket(ticket)
    try:
        texte = appeler(f, cle, modele(d.config, f), image, type_image, categories)
    except EchecFournisseur as erreur:
        with verrou():
            echec(d.config, f, str(erreur))
        return {"depense": dep["id"], "lecture_erreur": INDISPONIBLE}
    except Illisible:
        texte = ""
    with verrou():   # la lecture compte, même illisible
        donnees = depenses.lire()
        dep = depenses.trouver(donnees, dep["id"])
        dep["lu_llm"] = maintenant()
        ecrire_json(DEPENSES, donnees)
        reglages = lire_reglages()
        mois = f"{aujourdhui()[:7]}/{f}"
        reglages["compteur"][mois] = reglages["compteur"].get(mois, 0) + 1
        ecrire_json(REGLAGES_LLM, reglages)
    try:
        return {"depense": dep["id"], "lecture": interpreter(texte, [c["id"] for c in categories])}
    except Illisible:
        return {"depense": dep["id"], "lecture_erreur": ECHEC_LECTURE}


# --- Ce que la page reçoit -------------------------------------------------------------------------

def vue(config, est_staff):
    """Pour tous : le fournisseur qui lit les tickets (ou None). Pour le staff : l'état de chaque clé (4 derniers
    caractères seulement), le fournisseur actif et le compteur du mois."""
    secrets, reglages = lire_secrets(), lire_reglages()
    f = actif(reglages, secrets)
    resultat = {"llm": {"fournisseur": nom_complet(f)} if f else None}
    if est_staff:
        mois = aujourdhui()[:7]
        resultat["reglages_llm"] = {
            "actif": f,
            "fournisseurs": {x: {"nom": FOURNISSEURS[x]["nom"], "societe": FOURNISSEURS[x]["societe"], "modele": modele(config, x),
                                 "cle": "…" + secrets[x]["cle"][-4:] if x in secrets else "",
                                 "teste": secrets.get(x, {}).get("teste", ""), "refuse": secrets.get(x, {}).get("refuse", ""),
                                 "pret": teste(secrets, x)} for x in FOURNISSEURS},
            "compteur": {x: reglages["compteur"].get(f"{mois}/{x}", 0) for x in FOURNISSEURS},
        }
    return resultat
