"""Shorts TikTok (portrait 1080×1920) : voix, minutage et bande-son, à partir de shorts.json.
  python3 shorts.py tts <travail> [id…]      voix edge-tts (Henri, +4 %) par phrase, silences coupés ; écrit shorts-timing.json
  python3 shorts.py audio <travail> [id…]    bande-son de chaque short : voix traitée et posée, musique (music.py), mixage -15 LUFS
Ensuite : PAGE='shorts.html?s=<id>' VERT=1 node render.cjs <images> 30 0 <durée>, et montage (voir README.md).
Minutage : chaque phrase démarre 0,45 s après la fin de la précédente (0,6 s avant l'appel final) ; le short dure jusqu'à 1,6 s après la dernière.
"""
import json, os, subprocess, sys
import voice

HERE = os.path.dirname(os.path.abspath(__file__))
SHORTS = json.load(open(os.path.join(HERE, 'shorts.json'), encoding='utf-8'))
TIMING = os.path.join(HERE, 'shorts-timing.json')

def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

def tts(work, *ids):
    import asyncio, certifi
    ca = os.environ.get('CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
    if os.path.exists(ca):
        certifi.where = lambda: ca   # avant import edge_tts ; la vérification TLS reste active
    import edge_tts
    timing = json.load(open(TIMING)) if ids and os.path.exists(TIMING) else {}
    for s in SHORTS:
        if ids and s['id'] not in ids:
            continue                 # les autres shorts gardent leur voix et leur minutage
        d = os.path.join(work, s['id']); os.makedirs(d, exist_ok=True)
        starts, lens, t = [], [], 0.5
        for i, b in enumerate(s['beats']):
            mp3 = f'{d}/{i:02d}.mp3'
            asyncio.run(edge_tts.Communicate(b['say'], 'fr-FR-HenriNeural', rate='+4%').save(mp3))
            voice.run('-i', mp3, '-af', voice.TRIM, '-ar', '48000', '-ac', '1', f'{d}/{i:02d}.wav'); os.remove(mp3)
            L = round(dur(f'{d}/{i:02d}.wav'), 2)
            if i:
                t += 0.6 if b.get('cta') else 0.45
            starts.append(round(t, 2)); lens.append(L); t += L
        timing[s['id']] = {'dur': round(t + 1.6, 1), 'starts': starts, 'lens': lens}
        print(s['id'], timing[s['id']]['dur'])
    json.dump(timing, open(TIMING, 'w'), indent=1)

def audio(work, *ids):
    timing = json.load(open(TIMING))
    for s in SHORTS:
        if ids and s['id'] not in ids:
            continue
        T, d = timing[s['id']], os.path.join(work, s['id'])
        cta = T['starts'][-1]
        voice.place(d, f'{d}/voice.wav', [(a, '') for a in T['starts']], T['dur'])
        subprocess.run([sys.executable, os.path.join(HERE, 'music.py'), f'{d}/music.wav', '--dur', str(T['dur']),
                        '--cuts', ','.join(str(a - 0.25) for a in T['starts'][1:]), '--booms', f'0.3,{cta - 0.25}',
                        '--pulse', f'0.3,{cta - 0.4}', '--air', 'none', '--hats', 'none', '--risers', f'{max(0.5, cta - 1.8)},{cta - 0.25}',
                        '--seed', str(sum(map(ord, s['id'])))], check=True, stdout=subprocess.DEVNULL)
        voice.run('-i', f'{d}/music.wav', '-i', f'{d}/voice.wav', '-filter_complex', voice.MIX, '-map', '[a]', '-ar', '48000', f'{d}/soundtrack.wav')
        print(s['id'], 'ok')

if __name__ == '__main__':
    {'tts': tts, 'audio': audio}[sys.argv[1]](*sys.argv[2:])
