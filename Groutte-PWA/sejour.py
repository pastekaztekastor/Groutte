"""Le séjour et le modèle de présence (../README.md, « Le modèle de présence ») : dates, créneaux, nuits et repas.

- config.json > sejour : {"debut": "2026-12-28", "fin": "2027-01-03"}, le premier et le dernier jour.
- Un créneau est un couple (date, créneau), le créneau étant matin, midi, soir ou nuit, dans cet ordre dans une journée.
  Le dernier jour n'a pas de nuit : on repart.
- Une nuit est désignée par la date du soir : la nuit du 28/12 va du 28 au 29.
- Une présence est {"arrivee": {"date", "creneau"}, "depart": {"date", "creneau"}} : l'arrivée est le premier créneau
  compté, le départ le dernier, et tous ceux d'entre les deux comptent.

Ce module ne lit aucun fichier de données : tout le monde peut l'importer.
"""
from datetime import date, datetime, timedelta

CRENEAUX = ("matin", "midi", "soir", "nuit")
REPAS = ("matin", "midi", "soir")
SEJOUR_DEFAUT = {"debut": "2026-12-28", "fin": "2027-01-03"}
HEURES_DEFAUT = {"matin": "08:00", "midi": "12:00", "soir": "19:00"}


def _jour(texte):
    try:
        return date.fromisoformat(texte)
    except (TypeError, ValueError):
        return None


def bornes(config):
    """(premier jour, dernier jour) du séjour, en texte ISO."""
    s = config.get("sejour") if isinstance(config.get("sejour"), dict) else {}
    debut, fin = _jour(s.get("debut")), _jour(s.get("fin"))
    if not debut or not fin or fin < debut:
        debut, fin = date.fromisoformat(SEJOUR_DEFAUT["debut"]), date.fromisoformat(SEJOUR_DEFAUT["fin"])
    return debut.isoformat(), fin.isoformat()


def jours(config):
    debut, fin = (date.fromisoformat(j) for j in bornes(config))
    return [(debut + timedelta(days=i)).isoformat() for i in range((fin - debut).days + 1)]


def nuits(config):
    """Les nuits du séjour (date du soir) : tous les jours sauf le dernier."""
    return jours(config)[:-1]


def creneaux_sejour(config):
    """Tous les créneaux du séjour, dans l'ordre : [(date, créneau)]."""
    tous = jours(config)
    return [(j, c) for j in tous for c in CRENEAUX if not (j == tous[-1] and c == "nuit")]


def rang(point):
    """Clé de tri d'un point {"date", "creneau"} ou d'un couple (date, créneau)."""
    jour, creneau = (point["date"], point["creneau"]) if isinstance(point, dict) else point
    return jour, CRENEAUX.index(creneau)


def creneaux_de(config, presence):
    """Les créneaux comptés pour une présence, bornés au séjour (si ses dates ont changé depuis)."""
    if not presence:
        return []
    debut, fin = rang(presence["arrivee"]), rang(presence["depart"])
    return [c for c in creneaux_sejour(config) if debut <= rang(c) <= fin]


def nuits_de(config, presence):
    return [j for j, c in creneaux_de(config, presence) if c == "nuit"]


def repas_de(config, presence):
    """Les repas où la personne peut manger (créneaux matin, midi et soir de sa présence)."""
    return [(j, c) for j, c in creneaux_de(config, presence) if c in REPAS]


def hors_sejour(config, presence):
    """La présence déborde des dates du séjour (elles ont changé dans config.json après la saisie)."""
    if not presence:
        return False
    tous = creneaux_sejour(config)
    return rang(presence["arrivee"]) < rang(tous[0]) or rang(presence["depart"]) > rang(tous[-1])


def point_valide(config, point):
    """Un point {"date", "creneau"} reçu de la page, ou None."""
    if not isinstance(point, dict) or point.get("creneau") not in CRENEAUX or not _jour(point.get("date")):
        return None
    return {"date": point["date"], "creneau": point["creneau"]}


def heure_debut(config, jour, creneau):
    """Le moment où un repas commence (config.json > heures_repas) : on ne le modifie plus ensuite."""
    heures = config.get("heures_repas") if isinstance(config.get("heures_repas"), dict) else {}
    heure = heures.get(creneau) or HEURES_DEFAUT[creneau]
    try:
        return datetime.fromisoformat(f"{jour}T{heure}")
    except ValueError:
        return datetime.fromisoformat(f"{jour}T{HEURES_DEFAUT[creneau]}")


def commence(config, jour, creneau):
    return datetime.now() >= heure_debut(config, jour, creneau)


def date_courte(jour):
    """« 28/12 » d'après « 2026-12-28 »."""
    return f"{jour[8:10]}/{jour[5:7]}"
