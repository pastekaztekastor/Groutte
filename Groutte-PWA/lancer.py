"""Lance l'appli en local : python3 lancer.py (PORT=9124 python3 lancer.py pour un autre port).

Le socle est le sous-module socle/ du projet ; dans socle/exemple/, c'est le dossier du dessus.
"""
import os
import runpy
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
SOCLE = RACINE / "socle" if (RACINE / "socle" / "serveur").is_dir() else RACINE.parent
os.environ["APPLI_RACINE"] = str(RACINE)
sys.path.insert(0, str(SOCLE / "serveur"))
runpy.run_path(str(SOCLE / "serveur" / "app.py"), run_name="__main__")
