/* Bandeau en haut de tous les écrans, hors production. Le serveur dit où l'on est (environnement.py, posé
   sur <html data-environnement>) :
   - rouge « Serveur de test » si l'adresse commence par « test. » (ex. test.monappli.fr) ;
   - bleu « Local » sur la machine ou le réseau de la maison (localhost, 127.x, 192.168.x, 10.x, xxx.local).
   En production, rien : le même fichier part partout sans rien y changer.
   Les couleurs sont celles des icônes de static/icones/test/ et local/ (outils/icones_environnements.py). */
(function () {
  var env = document.documentElement.dataset.environnement;
  var texte, c1, c2;
  if (env === "test") {
    texte = "Serveur de test"; c1 = "#d13415"; c2 = "#b02a10";
  } else if (env === "local") {
    texte = "Local · " + location.hostname; c1 = "#2f6fb5"; c2 = "#255a94";
  } else {
    return;
  }

  var HAUTEUR = "calc(30px + env(safe-area-inset-top))";

  var style = document.createElement("style");
  style.textContent =
    "#bandeau-test { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; height: " + HAUTEUR + ";" +
    "  box-sizing: border-box; padding-top: env(safe-area-inset-top); display: flex; align-items: center; justify-content: center;" +
    "  background: repeating-linear-gradient(-45deg, " + c1 + " 0 14px, " + c2 + " 14px 28px); color: #fff;" +
    "  font: 700 15px/1 system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; pointer-events: none; }" +
    /* Tout descend sous le bandeau, y compris les écrans posés par-dessus la page. */
    "body { padding-top: " + HAUTEUR + "; }" +
    ".barre-nav { top: " + HAUTEUR + "; }" +
    ".connexion, .panneau-lateral, .voile-panneau, .voile, .visionneuse { top: " + HAUTEUR + "; }";
  document.head.appendChild(style);

  var bandeau = document.createElement("div");
  bandeau.id = "bandeau-test";
  bandeau.setAttribute("role", "note");
  bandeau.textContent = texte;
  document.body.appendChild(bandeau);
})();
