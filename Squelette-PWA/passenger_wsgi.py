# Point d'entrée pour O2Switch (cPanel > Setup Python App).
import os
import sys

# Passenger ne met pas forcément le dossier de l'application dans le chemin d'import.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import application  # noqa: E402,F401
