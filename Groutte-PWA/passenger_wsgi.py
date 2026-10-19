# Point d'entrée pour O2Switch (cPanel > Setup Python App). Le serveur est dans socle/serveur/ (voir app.py).
import os
import sys

RACINE = os.path.dirname(os.path.abspath(__file__))
SOCLE = os.path.join(RACINE, "socle")
if not os.path.isdir(os.path.join(SOCLE, "serveur")):   # dans socle/exemple/ : le socle est au-dessus
    SOCLE = os.path.dirname(RACINE)
os.environ["APPLI_RACINE"] = RACINE
# Passenger ne met pas forcément le dossier de l'application dans le chemin d'import : on y met le serveur du socle.
sys.path.insert(0, os.path.join(SOCLE, "serveur"))

from app import application  # noqa: E402,F401
