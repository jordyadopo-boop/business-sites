# Jordy Adopo · Développeur web

Site portfolio et vente de services de création de sites internet.

- Fond animé (`esprit.js`, canvas 2D, sans dépendance) : « L'Éveil », un jeune épéiste et l'esprit géant qui le protège, gravés à l'encre rouge, noire et os (personnages originaux). Un tableau par section (la lune, le pacte, le couloir, la chute, l'éveil) ; au défilement, l'encre coule d'un tableau à l'autre. La souris laisse une traînée d'encre rouge, décale les plans (parallaxe), fait suivre les regards et révèle l'esprit caché sous la scène. Maintenir le clic (hors liens et cartes) : l'esprit se manifeste en entier. Sur mobile, un « fantôme » révèle la scène tout seul
- Fond vidéo (prioritaire sur le fond animé) : se règle dans `admin.html`, partie « Fond du site » : coller un lien TikTok (court `vt.tiktok.com/…` ou complet) ou un fichier `.mp4`, puis « Mettre en fond ». C'est enregistré dans `fond.json` (`"url": ""` = fond animé). La vidéo passe par le lecteur officiel de TikTok, sans son, en boucle, avec un crédit en bas à gauche ; si l'image se fige, la page la relance. Si TikTok est bloqué chez le visiteur, le fond animé s'affiche. La traînée d'encre rouge reste par-dessus
- Portfolio : Le Glaceur, AMD Design, Odyssée Games, LIY10.LEARNING
- Contact WhatsApp : +225 07 09 95 10 92

Fichiers : `index.html` (site), `esprit.js` (fond animé). Ancien fond, toujours visible dans `preview.html` : `brain.js` (cerveau 3D), `brain.glb` (cerveau 3D compressé, généré par `tools/brain.py`), `preview.html` (aperçu du cerveau seul, non indexé). `tools/build.py` génère l'ancien corps entier.

En ligne : https://jordyadopo-boop.github.io/business-sites/ (Settings → Pages → branche `main`, dossier `/`).

## Crédits
Modèle anatomique 3D : [BodyParts3D](https://lifesciencedb.jp/bp3d/) © The Database Center for Life Science, licence CC BY-SA 2.1 Japon.
