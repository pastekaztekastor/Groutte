"""Ajoute les liens de navigation aux fiches de cdc/, dans l'ordre du tableau « Les pages » de cdc/README.md.

En haut : Précédent et Menu. En bas : Menu et Suivant.
Relançable sans risque : les anciens liens (entre <!-- nav --> et <!-- /nav -->) sont remplacés.

    python3 outils/nav_cdc.py
"""
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CDC = RACINE / "cdc"
README = CDC / "README.md"
MENU = "[Menu](../README.md#les-pages)"
BLOC = re.compile(r"<!-- nav -->.*?<!-- /nav -->\n*", re.S)


def pages_du_sommaire():
    """Les (titre, chemin) du tableau, dans l'ordre."""
    section = README.read_text(encoding="utf-8").split("## Les pages", 1)[1].split("\n## ", 1)[0]
    return re.findall(r"^\|[^|]*\|\s*\[([^\]]+)\]\(([a-z-]+/[^)]+\.md)\)", section, re.M)


def lien(texte, titre, chemin):
    dossier, fichier = Path(chemin).parts[-2:]
    return f"[{texte} : {titre}](../{dossier}/{fichier})"


def bloc(*morceaux):
    return "<!-- nav -->\n" + " · ".join(m for m in morceaux if m) + "\n<!-- /nav -->"


def main():
    pages = pages_du_sommaire()
    for i, (titre, chemin) in enumerate(pages):
        fichier = CDC / chemin
        if not fichier.exists():
            print("manquante :", chemin)
            continue
        suivant = lien("Suivant", *pages[i + 1]) if i + 1 < len(pages) else None
        precedent = lien("Précédent", *pages[i - 1]) if i > 0 else None
        corps = BLOC.sub("", fichier.read_text(encoding="utf-8")).strip()
        fichier.write_text(f"{bloc(precedent, MENU)}\n\n{corps}\n\n{bloc(MENU, suivant)}\n", encoding="utf-8")
    print(len(pages), "fiches")


main()
