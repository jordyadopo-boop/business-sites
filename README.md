# Jordy Adopo · Développeur web

Site portfolio et vente de services de création de sites internet.

- Fond animé (`esprit.js`, canvas 2D, sans dépendance) : « L'Éveil », un jeune épéiste et l'esprit géant qui le protège, gravés à l'encre rouge, noire et os (personnages originaux). Un tableau par section (la lune, le pacte, le couloir, la chute, l'éveil) ; au défilement, l'encre coule d'un tableau à l'autre. La souris laisse une traînée d'encre rouge, décale les plans (parallaxe), fait suivre les regards et révèle l'esprit caché sous la scène. Maintenir le clic (hors liens et cartes) : l'esprit se manifeste en entier. Sur mobile, un « fantôme » révèle la scène tout seul
- Fond vidéo (prioritaire sur le fond animé) : attribut `data-fond` de `<div id="stage">` dans `index.html`. Colle le lien complet d'une vidéo TikTok (`https://www.tiktok.com/@compte/video/123…`, pas le lien court `vt.tiktok.com`) : elle passe par le lecteur officiel de TikTok, sans son, en boucle, sans boutons, avec un crédit vers l'auteur en bas à gauche. Un lien vers un fichier `.mp4`/`.webm` marche aussi. `data-fond=""` = retour au fond animé. La traînée d'encre rouge reste par-dessus la vidéo
- Portfolio : Le Glaceur, AMD Design, Odyssée Games, LIY10.LEARNING
- Contact WhatsApp : +225 07 09 95 10 92

Fichiers : `index.html` (site), `esprit.js` (fond animé). Ancien fond, toujours visible dans `preview.html` : `brain.js` (cerveau 3D), `brain.glb` (cerveau 3D compressé, généré par `tools/brain.py`), `preview.html` (aperçu du cerveau seul, non indexé). `tools/build.py` génère l'ancien corps entier.

En ligne : https://jordyadopo-boop.github.io/business-sites/ (Settings → Pages → branche `main`, dossier `/`).

## Crédits
Modèle anatomique 3D : [BodyParts3D](https://lifesciencedb.jp/bp3d/) © The Database Center for Life Science, licence CC BY-SA 2.1 Japon.
