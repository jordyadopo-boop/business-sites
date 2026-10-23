"""Bande-son originale de la vidéo « Je fais ton site internet » (60 s) : nappe d'accords, pulsation pendant les zones,
ambiance aérienne pendant la plongée dans les neurones, souffles aux coupes, impacts au logo et à la fin.
Adapté de tools/video/music.py de la vidéo AMD Design (dépôt jordyadopo-boop/amddesign-archi3d) : même synthèse
additive en numpy et même réverbération par convolution. Usage : python3 music.py sortie.wav
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
out = np.zeros((N, 2))

# Minutage : mêmes valeurs que video.js
T0, SLOT = 14.15, 3
Ti = lambda i: T0 + SLOT * i
CUTS = [7.9, 11.8] + [Ti(i) - 1.35 for i in range(1, 11)] + [45.6, 50.6, 55.2]
NEURO = (45.6, 50.6)

def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)

def env(start, length, attack, release):
    e = np.zeros(N)
    i0, i1 = int(start * SR), min(N, int((start + length) * SR))
    if i1 <= max(0, i0):
        return e
    x = np.arange(i1 - i0) / SR
    if i0 < 0:
        x, i0 = x[-i0:], 0
    a = np.clip(x / attack, 0, 1)
    r = np.clip((length - x) / release, 0, 1)
    e[i0:i1] = np.minimum(a, r) ** 1.5
    return e

def add(sig, gain=1.0, pan=0.0):
    out[:, 0] += sig * gain * (1 - pan) * 0.5 ** 0.5 * 1.4
    out[:, 1] += sig * gain * (1 + pan) * 0.5 ** 0.5 * 1.4

# ---------- Nappe : Dm9 – B♭maj7 – Fmaj7 – C6, 6 s par accord (2 zones) ----------
chords = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [41, 53, 57, 60, 64], [48, 55, 60, 62, 64]]
for k in range(10):
    start = k * 6.0
    ch = chords[k % 4]
    e = env(start - 0.3, 6.9, 1.8, 2.0)
    for m in ch:
        f = note(m + 12)
        for det, pan in ((-0.14, -0.6), (0.14, 0.6)):
            ph = rng.uniform(0, 2 * np.pi)
            s = np.sin(2 * np.pi * (f + det) * t + ph) + 0.35 * np.sin(2 * np.pi * 2 * (f + det) * t + ph) + 0.12 * np.sin(2 * np.pi * 3 * (f + det) * t)
            add(s * e, 0.02, pan)
    add(np.sin(2 * np.pi * note(ch[0]) * t) * e, 0.05)   # basse

# ---------- Pulsation pendant les zones (100 bpm : 5 temps par zone, calée sur T0) ----------
beat = 0.6
b0 = T0 - 0.15                                  # premier temps : début de la première zone (14 s)
for i in range(int((NEURO[0] - b0) / beat) + 1):
    tb = b0 + i * beat
    i0 = int(tb * SR); L = int(0.45 * SR)
    x = np.arange(L) / SR
    ramp = min(1.0, 0.45 + i / 12)                     # entre en douceur
    kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-x * 30)) * x) * np.exp(-x * 9)
    out[i0:i0 + L, :] += (kick * 0.15 * ramp)[:, None]
    if i % 2 == 1:
        Lh = int(0.06 * SR)
        hat = np.diff(rng.normal(0, 1, Lh) * np.exp(-np.arange(Lh) / SR * 70), prepend=0)
        out[i0:i0 + Lh, 0] += hat * 0.02 * ramp; out[i0:i0 + Lh, 1] += hat * 0.025 * ramp
    # arpège discret en croches sur l'accord courant
    for half in (0, 1):
        ta = tb + half * beat / 2
        ch = chords[int(ta // 6) % 4]
        f = note(ch[(i * 2 + half) % 5] + 24)
        La = int(0.35 * SR); xa = np.arange(La) / SR; ia = int(ta * SR)
        pl = np.sin(2 * np.pi * f * xa) * np.exp(-xa * 11) * 0.018 * ramp
        pan = 0.4 if (i + half) % 2 else -0.4
        out[ia:ia + La, 0] += pl * (1 - pan); out[ia:ia + La, 1] += pl * (1 + pan)

# ---------- Plongée dans les neurones : nappe aérienne, carillons, sans pulsation ----------
e = env(NEURO[0] - 0.4, NEURO[1] - NEURO[0] + 1.6, 1.2, 1.4)
for m in [69, 74, 76, 81, 86]:
    f = note(m)
    for det, pan in ((-0.25, -0.8), (0.25, 0.8)):
        trem = 1 + 0.25 * np.sin(2 * np.pi * rng.uniform(0.2, 0.5) * t + rng.uniform(0, 6))
        add(np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6)) * e * trem, 0.014, pan)
for j in range(16):
    tc = NEURO[0] + 0.15 + j * 0.31 + rng.uniform(-0.05, 0.05)
    f = note([81, 86, 88, 93, 98][rng.integers(5)])
    Lc = int(1.2 * SR); xc = np.arange(Lc) / SR; ic = int(tc * SR)
    s = (np.sin(2 * np.pi * f * xc) + 0.3 * np.sin(2 * np.pi * 2.76 * f * xc)) * np.exp(-xc * 4) * 0.012
    pan = rng.uniform(-0.9, 0.9)
    out[ic:ic + Lc, 0] += s * (1 - pan); out[ic:ic + Lc, 1] += s * (1 + pan)

# ---------- Le site : pulsation légère qui revient ----------
for i in range(int((55.2 - 50.6) / beat)):
    i0 = int((50.6 + i * beat) * SR); Lh = int(0.05 * SR)
    hat = np.diff(rng.normal(0, 1, Lh) * np.exp(-np.arange(Lh) / SR * 80), prepend=0)
    out[i0:i0 + Lh, 0] += hat * 0.018; out[i0:i0 + Lh, 1] += hat * 0.02

# ---------- Souffles aux coupes ----------
def whoosh(c, length=0.9, gain=0.09):
    i0 = int((c - length * 0.6) * SR); L = int(length * SR)
    if i0 < 0 or i0 + L > N:
        return
    x = np.arange(L) / L
    noise = rng.normal(0, 1, L)
    k = (40 - 34 * np.sin(np.pi * x)).astype(int)
    cs = np.cumsum(noise)
    lp = np.array([(cs[i] - cs[max(0, i - k[i])]) / k[i] for i in range(L)])
    s = (noise - lp * 0.6) * np.sin(np.pi * x) ** 2 * gain
    out[i0:i0 + L, 0] += s * (1 - x); out[i0:i0 + L, 1] += s * x

for c in CUTS:
    whoosh(c, 1.4 if c == NEURO[0] else 0.9, 0.12 if c == NEURO[0] else 0.09)

# ---------- Impacts graves (logo, fin) et montées ----------
def boom(c, gain=0.35):
    i0 = int(c * SR); L = int(2.5 * SR)
    x = np.arange(min(L, N - i0)) / SR
    s = np.sin(2 * np.pi * (38 + 30 * np.exp(-x * 6)) * x) * np.exp(-x * 1.6)
    out[i0:i0 + len(x), :] += (s * gain)[:, None]

def riser(a, b, gain=0.03):
    r0, r1 = int(a * SR), int(b * SR)
    x = np.arange(r1 - r0) / (r1 - r0)
    s = rng.normal(0, 1, r1 - r0) * x ** 2 * gain
    out[r0:r1, 0] += s; out[r0:r1, 1] += np.roll(s, 40)

boom(0.4); boom(55.2, 0.3)
riser(1.0, 3.0); riser(43.6, 45.6, 0.035)

# ---------- Réverbération (convolution, queue de 2,5 s) ----------
L = int(2.5 * SR)
ir = rng.normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR * 2.8)[:, None]
ir[:, 0] /= np.abs(ir[:, 0]).sum(); ir[:, 1] /= np.abs(ir[:, 1]).sum()
nfft = 1 << int(np.ceil(np.log2(N + L)))
wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], axis=1)
mix = out * 0.75 + wet * 18

fade = np.clip((DUR - t) / 2.5, 0, 1) * np.clip(t / 0.05, 0, 1)
mix *= fade[:, None]
mix /= np.abs(mix).max() + 1e-9
mix *= 0.89
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok')
