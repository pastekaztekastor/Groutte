# Point d'entrée pour O2Switch (cPanel > Setup Python App). Le code est dans serveur/ (voir serveur/app.py).
import os
import sys

# Passenger ne met pas forcément le dossier de l'application dans le chemin d'import : on y met serveur/.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "serveur"))

from app import application  # noqa: E402,F401
