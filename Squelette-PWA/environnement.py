"""Sur quel serveur tourne l'appli : production, test ou local, d'après l'adresse demandée.

Le même code part partout sans rien y changer : seule l'adresse décide.
- « test » si l'adresse commence par « test. » (ex. test.monappli.fr) ;
- « local » sur la machine ou le réseau de la maison (localhost, 127.x, 192.168.x, 10.x, xxx.local) ;
- ailleurs, la production (None).

Hors production, tout ce qui se voit hors de la page dit où l'on est, pour ne pas confondre deux applis installées
côte à côte : le nom et l'icône de l'appli (manifeste, onglet, écran d'accueil), le titre, le bandeau en haut des
écrans (static/js/bandeau-test.js) et les notifications (static/sw.js). Les icônes sont dans static/icones/<id>/
(outils/icones_environnements.py les refait depuis celles de la production).
"""

ENVIRONNEMENTS = {
    "test": {"id": "test", "nom": "Test"},
    "local": {"id": "local", "nom": "Local"},
}


def environnement(environ):
    """L'environnement de cette requête ({"id", "nom"}), ou None en production."""
    hote = (environ.get("HTTP_HOST") or environ.get("SERVER_NAME") or "").strip().lower()
    if hote.startswith("["):  # IPv6 : [::1]:8000
        return ENVIRONNEMENTS["local"]
    hote = hote.split(":")[0]
    if hote.startswith("test."):
        return ENVIRONNEMENTS["test"]
    if (hote == "localhost"
            or hote.startswith(("127.", "10.", "192.168."))
            or hote.endswith((".local", ".localhost"))):
        return ENVIRONNEMENTS["local"]
    return None
