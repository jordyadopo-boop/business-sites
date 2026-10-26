"""Musique originale du TikTok « Ton business est invisible sur Google » (34 s) : pulsation afro-pop à 104 BPM,
basse, accords, souffles aux changements de scène et impacts. Synthèse additive en numpy (même approche que music.py d'AMD Design).
Usage : python3 music.py sortie.wav
"""
import sys
import wave
import numpy as np

SR, DUR = 48000, 34.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
out = np.zeros((N, 2))
BEAT = 60 / 104
CUTS = [4.3, 11.9, 19.8, 24.4]          # changements de scène (video.js)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def put(i0, sig, gl=1.0, gr=1.0):
    i0 = int(i0)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    out[i0:i0 + len(sig), 0] += sig * gl
    out[i0:i0 + len(sig), 1] += sig * gr


def env(length, a, r):
    x = np.arange(int(length * SR)) / SR
    return np.minimum(np.clip(x / a, 0, 1), np.clip((length - x) / r, 0, 1))


# ---------- Accords (Am – F – C – G), deux temps... chaque accord dure 4 temps ----------
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
bar = 4 * BEAT
for k in range(int(DUR / bar) + 1):
    ch, s = chords[k % 4], k * bar
    e = env(bar + .2, .05, .4)
    x = np.arange(len(e)) / SR
    pad = sum(np.sin(2 * np.pi * note(m + 12) * x) + .3 * np.sin(2 * np.pi * note(m + 24) * x) for m in ch) * e
    put(s * SR, pad * .018, .9, 1.1)
    # basse syncopée
    for off in (0, 1.5, 2.5, 3):
        L = .28
        xb = np.arange(int(L * SR)) / SR
        b = np.sin(2 * np.pi * note(ch[0] - 24) * xb) * np.exp(-xb * 6)
        put((s + off * BEAT) * SR, np.tanh(b * 2) * .11)

# ---------- Batterie : kick, clap, charleston, shaker (plus calme pendant l'accroche) ----------
nb = int(DUR / BEAT)
for i in range(nb):
    b0 = i * BEAT
    calm = b0 < CUTS[0]
    L = int(.4 * SR); x = np.arange(L) / SR
    kick = np.sin(2 * np.pi * (45 + 90 * np.exp(-x * 35)) * x) * np.exp(-x * 8)
    put(b0 * SR, kick * (.12 if calm else .22))
    if i % 2 == 1 and not calm:
        Lc = int(.18 * SR); n = rng.normal(0, 1, Lc) * np.exp(-np.arange(Lc) / SR * 25)
        put(b0 * SR, np.diff(n, prepend=0) * .05, .9, 1.1)
    for h in (0, .5) if not calm else (.5,):
        Lh = int(.05 * SR); n = rng.normal(0, 1, Lh) * np.exp(-np.arange(Lh) / SR * 80)
        put((b0 + h * BEAT) * SR, np.diff(n, prepend=0) * .022, .7 if h else 1.2, 1.2 if h else .7)
    if i % 4 == 3 and not calm:   # petit roulement de shaker en fin de mesure
        for q in (.25, .75):
            Lh = int(.04 * SR); n = rng.normal(0, 1, Lh) * np.exp(-np.arange(Lh) / SR * 60)
            put((b0 + q * BEAT) * SR, np.diff(n, prepend=0) * .015)


# ---------- Souffles aux coupes, impacts ----------
def whoosh(c, length=.7, gain=.08):
    L = int(length * SR); x = np.arange(L) / L
    n = rng.normal(0, 1, L)
    cs = np.cumsum(n); k = (30 - 26 * np.sin(np.pi * x)).astype(int)
    lp = np.array([(cs[i] - cs[max(0, i - k[i])]) / k[i] for i in range(L)])
    s = (n - lp * .6) * np.sin(np.pi * x) ** 2 * gain
    i0 = int((c - length * .6) * SR)
    put(i0, s * (1 - x), 1, 0); put(i0, s * x, 0, 1)


def boom(c, gain=.3):
    L = int(1.8 * SR); x = np.arange(L) / SR
    put(c * SR, np.sin(2 * np.pi * (36 + 30 * np.exp(-x * 7)) * x) * np.exp(-x * 2) * gain)


for c in CUTS:
    whoosh(c)
boom(.05, .25); boom(10.25, .3); boom(24.4, .2)

# ---------- Réverbération légère, fondus, normalisation ----------
L = int(1.2 * SR)
ir = rng.normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR * 4.5)[:, None]
ir /= np.abs(ir).sum(0)
nfft = 1 << int(np.ceil(np.log2(N + L)))
wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], 1)
mix = out * .85 + wet * 8
mix *= (np.clip((DUR - t) / 1.2, 0, 1) * np.clip(t / .03, 0, 1))[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * .89
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok')
