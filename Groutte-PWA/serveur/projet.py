"""Le point d'entrée de Groutte : app.py (socle) importe ce fichier, qui importe les modules de Groutte.

Chaque module se branche lui-même en décorant ses fonctions (@route, @compteur, @renommage...) ; ce qui touche au
socle (état, cartes, annonces, protections, vérifications) est réuni dans branchements.py. Un module qui n'est pas
importé ici n'existe pas pour le serveur.
"""
import branchements  # noqa: F401  (état, cartes, filtres d'annonce, protections, vérifications, GET /api/forum)
import creances  # noqa: F401  (routes /api/creances/...)
import depenses  # noqa: F401  (routes /api/depenses/...)
import fiche  # noqa: F401  (route /api/paiement, champs de /api/profil)
import forum  # noqa: F401  (routes /api/forum/...)
import gite_salle  # noqa: F401  (routes /api/gite/...)
import lits  # noqa: F401  (routes /api/lits/...)
import llm  # noqa: F401  (routes /api/llm/..., /api/depenses/lire)
import menu  # noqa: F401  (routes /api/menu/...)
import mes_comptes  # noqa: F401  (routes /api/comptes/...)
import presence  # noqa: F401  (routes /api/presence...)
import reglages_compta  # noqa: F401  (routes /api/compta/...)
import repas  # noqa: F401  (route /api/repas)
import suivi  # noqa: F401  (routes /api/suivi/...)
import tournois  # noqa: F401  (route /api/tournois/inscription)
