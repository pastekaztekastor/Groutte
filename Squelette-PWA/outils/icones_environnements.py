"""Icônes des environnements hors production (static/icones/test/ et local/), tirées de celles de la production.

    python3 outils/icones_environnements.py

À relancer après chaque changement de static/icones/icone.svg ou icone-maskable.svg. Le dessin reste le même ; le
fond prend la couleur du bandeau de l'environnement (static/js/bandeau-test.js) et « TEST » ou « LOCAL » est écrit
dessous, pour ne pas confondre les applis installées côte à côte. Le badge (silhouette monochrome) est copié tel quel.
Il faut rsvg-convert (paquet librsvg).
"""
import shutil
import subprocess
from pathlib import Path

ICONES = Path(__file__).resolve().parent.parent / "static" / "icones"
PRUNE = "#5c1f2e"   # le fond des icônes de production (à changer avec tes icônes)
ENVIRONNEMENTS = {
    "test": ("TEST", "#b02a10"),
    "local": ("LOCAL", "#255a94"),
}
POLICE = 'font-family="DejaVu Sans, Verdana, sans-serif" font-weight="700" fill="#fdfdfc" text-anchor="middle"'


def deriver(svg, couleur, mention, maskable):
    """Le SVG de production, recoloré, le dessin remonté et réduit pour laisser la place à la mention."""
    svg = svg.replace(PRUNE, couleur)
    fond_fin = svg.index("/>", svg.index("<rect")) + 2   # le premier élément est le fond
    ouverture, fond, dessin = svg[:svg.index("<rect")], svg[svg.index("<rect"):fond_fin], svg[fond_fin:svg.rindex("</svg>")]
    if maskable:
        # Tout doit tenir dans le cercle de sécurité (80 % au centre) : la mention, plus petite, sans bande.
        dessin = f'<g transform="translate(0 -34)">{dessin}</g>'
        mention = f'<text x="256" y="428" font-size="50" letter-spacing="3" {POLICE}>{mention}</text>'
    else:
        dessin = f'<g transform="translate(256 214) scale(.84) translate(-256 -256)">{dessin}</g>'
        arrondi = fond.replace(f'fill="{couleur}"', "")   # la forme du fond, pour couper la bande aux coins
        mention = (f'<defs><clipPath id="arrondi">{arrondi}</clipPath></defs>'
                   f'<rect y="396" width="512" height="116" fill="#000" fill-opacity=".3" clip-path="url(#arrondi)"/>'
                   f'<text x="256" y="476" font-size="74" letter-spacing="6" {POLICE}>{mention}</text>')
    return f"{ouverture}{fond}{dessin}{mention}</svg>"


def png(svg, taille, sortie):
    subprocess.run(["rsvg-convert", "-w", str(taille), "-h", str(taille), str(svg), "-o", str(sortie)], check=True)


def main():
    icone = (ICONES / "icone.svg").read_text(encoding="utf-8")
    maskable = (ICONES / "icone-maskable.svg").read_text(encoding="utf-8")
    for env, (mention, couleur) in ENVIRONNEMENTS.items():
        dossier = ICONES / env
        dossier.mkdir(exist_ok=True)
        (dossier / "icone.svg").write_text(deriver(icone, couleur, mention, False), encoding="utf-8")
        (dossier / "icone-maskable.svg").write_text(deriver(maskable, couleur, mention, True), encoding="utf-8")
        png(dossier / "icone.svg", 192, dossier / "icone-192.png")
        png(dossier / "icone.svg", 512, dossier / "icone-512.png")
        png(dossier / "icone-maskable.svg", 512, dossier / "icone-maskable-512.png")
        png(dossier / "icone-maskable.svg", 180, dossier / "apple-touch-icon.png")
        shutil.copy(ICONES / "badge-96.png", dossier / "badge-96.png")
        print(f"static/icones/{env}/ : fait")


if __name__ == "__main__":
    main()
