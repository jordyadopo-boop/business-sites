# Vidéo de présentation « Je fais ton site internet » (60 s, 30 i/s)

Même méthode que la vidéo AMD Design (dépôt jordyadopo-boop/amddesign-archi3d, dossier tools/video) :
composition déterministe = le cerveau 3D du site (`brain.js` en mode vidéo, `window.__VIDEO = true`) + typographie animée (GSAP) + sous-titres français.
`window.__render(t)` cale chaque image sur le temps `t`. Paysage 1920×1080 ; portrait TikTok 1080×1920 avec `?v` (ou `VERT=1` au rendu).

## Fichiers
- `index.html`, `video.css`, `video.js` : composition (minutage, textes des 10 zones, voix off `VOICE` avec ses heures de début)
- `render.cjs` : rendu image par image (Playwright + Chromium)
- `shots/` : captures du site (séquence « navigateur »)
- `voice.json` : durées des phrases de la voix off, pour caler les sous-titres (écrit par `voice.py tts`)
- `voice.py` : voix off (synthèse edge-tts, coupe des silences, tonus, pose aux heures de VOICE)
- `music.py` : bande-son originale, adaptée de celle d'AMD Design (coupes aux heures de CUTS, pulsation pendant les zones, plongée aérienne)
- `tiktok.html`, `tiktok.cjs` : deux images 1080×1920 pour la page TikTok (`?i=1` présentation, `?i=2` réalisations) et la photo de profil HD (`?i=3`)
- `neurons.js` : fond de neurones animés, partagé par la vidéo et les shorts
- Shorts TikTok : `shorts.json` (contenu des 20 shorts : phrases, cartes, étape du cerveau), `shorts.py` (voix, minutage → `shorts-timing.json`, bande-son),
  `shorts.html` + `shorts.js` (composition, `?s=<id>`, `&cover` pour la couverture), `shorts.cjs` (couvertures)

## Régénérer
```bash
python3 -m http.server 8123 &                       # depuis la racine du dépôt
NODE_PATH=$(npm root -g) node tools/video/render.cjs frames-h 30 0 60
VERT=1 NODE_PATH=$(npm root -g) node tools/video/render.cjs frames-v 30 0 60
# voix off : une phrase par fichier, puis (facultatif) conversion vers la voix de Jordy avec OpenVoice v2 (MIT),
# phrase par phrase, avec son vocal comme référence de timbre (jamais dans le dépôt) ; enfin tonus et pose (adelay)
python3 tools/video/voice.py tts phrases
python3 tools/video/voice.py place phrases voice.wav
python3 tools/video/music.py music.wav
# mixage (musique baissée sous la voix) puis montage :
ffmpeg -i music.wav -i voice.wav -filter_complex "[0:a]volume=0.55[m];[1:a]aformat=channel_layouts=stereo,asplit=2[vk][vo];[m][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md];[md][vo]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=9[a]" -map "[a]" soundtrack.wav
ffmpeg -framerate 30 -i frames-h/%05d.jpg -i soundtrack.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart JFTS-presentation-paysage.mp4
ffmpeg -framerate 30 -i frames-v/%05d.jpg -i soundtrack.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart JFTS-presentation-portrait.mp4
# images TikTok
NODE_PATH=$(npm root -g) node tools/video/tiktok.cjs tiktok
# shorts TikTok (pour chaque id de shorts.json)
python3 tools/video/shorts.py tts travail && python3 tools/video/shorts.py audio travail
PAGE='shorts.html?s=pub' VERT=1 NODE_PATH=$(npm root -g) node tools/video/render.cjs frames-pub 30 0 17.5   # durée : shorts-timing.json
ffmpeg -framerate 30 -i frames-pub/%05d.jpg -i travail/pub/soundtrack.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart JFTS-pub.mp4
NODE_PATH=$(npm root -g) node tools/video/shorts.cjs covers
```
