"""Voix off de la vidéo : une phrase par fichier (textes et débuts lus dans VOICE de video.js), silences coupés,
durées écrites dans voice.json (sous-titres), puis tonus (égaliseur, compression, de-esser, loudnorm) et pose aux heures de VOICE.
  python3 voice.py tts <dossier>                 voix de synthèse edge-tts fr-FR-HenriNeural (+4 %), phrases coupées dans <dossier>/NN.wav, et voice.json
  python3 voice.py place <dossier> voice.wav     traite et pose les phrases <dossier>/NN.wav (synthèse ou converties vers un autre timbre) sur 60 s
Le proxy de l'environnement casse la vérification TLS d'edge-tts : on lui donne le bon magasin de certificats (CA_BUNDLE).
"""
import json, os, re, subprocess, sys, asyncio

HERE = os.path.dirname(os.path.abspath(__file__))
FX = ('highpass=f=80,equalizer=f=200:t=q:w=1:g=-1.5,equalizer=f=3800:t=q:w=1.2:g=4,highshelf=f=9000:g=1,'
      'acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=4,deesser=i=0.35:f=0.55,alimiter=limit=0.95')

def voice_table():
    src = open(os.path.join(HERE, 'video.js'), encoding='utf-8').read()
    T0, SLOT = [float(x) for x in re.search(r'const SLOT = ([\d.]+), T0 = ([\d.]+)', src).groups()][::-1]
    body = re.search(r'export const VOICE = \[(.*?)\n\];', src, re.S).group(1)
    out = []
    for start, q, txt in re.findall(r"\[([^,]+), (['\"])(.*?)\2\]", body):
        m = re.fullmatch(r'Ti\((\d+)\) - ([\d.]+)', start.strip())
        out.append((T0 + SLOT * int(m[1]) - float(m[2]) if m else float(start), txt))
    return out

def run(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

def tts(folder):
    import certifi
    ca = os.environ.get('CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
    if os.path.exists(ca):
        certifi.where = lambda: ca   # avant import edge_tts ; la vérification TLS reste active
    import edge_tts
    os.makedirs(folder, exist_ok=True)
    V, durs = voice_table(), []
    for i, (_, txt) in enumerate(V):
        mp3 = f'{folder}/{i:02d}.mp3'
        asyncio.run(edge_tts.Communicate(txt, 'fr-FR-HenriNeural', rate='+4%').save(mp3))
        trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,' \
               'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse'
        run('-i', mp3, '-af', trim, '-ar', '48000', '-ac', '1', f'{folder}/{i:02d}.wav'); os.remove(mp3)
        durs.append(round(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{folder}/{i:02d}.wav'])), 2))
    json.dump(durs, open(os.path.join(HERE, 'voice.json'), 'w'))
    print(durs)

def place(folder, out):
    V, ins, fl = voice_table(), [], []
    for i, (a, _) in enumerate(V):
        ins += ['-i', f'{folder}/{i:02d}.wav']
        d = int(round(a * 1000))
        fl.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=mono,{FX},adelay={d}|{d}[v{i}]')
    fl.append(''.join(f'[v{i}]' for i in range(len(V))) + f'amix=inputs={len(V)}:normalize=0,apad,atrim=0:60,loudnorm=I=-16:TP=-1.5:LRA=7[o]')
    run(*ins, '-filter_complex', ';'.join(fl), '-map', '[o]', '-ar', '48000', out)

if __name__ == '__main__':
    {'tts': tts, 'place': place}[sys.argv[1]](*sys.argv[2:])
