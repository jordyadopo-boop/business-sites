import trimesh, numpy as np, os, sys, fast_simplification as fs
from collections import defaultdict
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def table(path):
    d = defaultdict(set)
    for line in open(path, encoding='utf-8').read().splitlines()[1:]:
        c = line.split('\t')
        if len(c) >= 3: d[c[1].strip()].add(c[2].strip())
    return d
P, I = table('partof_element_parts.txt'), table('isa_element_parts.txt')
DIRS = ['partof_BP3D_4.0_obj_99', 'isa_BP3D_4.0_obj_99']

GROUPS = {  # name: ([(table, concept)], target faces)
    'skeleton':   ([(P, 'skeletal system')], 110000),
    'muscles':    ([(I, 'muscle organ')], 110000),
    'brain':      ([(P, 'brain')], 30000),
    'eyes':       ([(P, 'left eyeball'), (P, 'right eyeball'), (I, 'left eyeball'), (I, 'right eyeball'), (P, 'left eye'), (P, 'right eye')], 3000),
    'heart':      ([(P, 'heart')], 14000),
    'lungs':      ([(P, 'left lung'), (P, 'right lung')], 26000),
    'liver':      ([(P, 'liver')], 8000),
    'stomach':    ([(P, 'stomach')], 4000),
    'kidneys':    ([(P, 'left kidney'), (P, 'right kidney')], 4000),
    'intestines': ([(P, 'small intestine'), (P, 'large intestine'), (P, 'urinary bladder')], 16000),
    'arteries':   ([(P, 'systemic arterial system')], 24000),
    'veins':      ([(P, 'systemic venous system')], 16000),
    'nerves':     ([(P, 'spinal cord'), (I, 'nerve')], 10000),
}

def load(fid):
    for d in DIRS:
        p = f'{d}/{fid}.obj'
        if os.path.exists(p): return trimesh.load(p, force='mesh', process=False)

def simplify(m, target):
    if len(m.faces) <= target: return m
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
    return trimesh.Trimesh(v, f)

meshes, used = {}, set()
for name, (srcs, target) in GROUPS.items():
    ids = set().union(*[t.get(c, set()) for t, c in srcs]) - used
    used |= ids
    parts = [m for m in (load(i) for i in sorted(ids)) if m is not None and len(m.faces)]
    raw = sum(len(p.faces) for p in parts)
    if not parts: print(name, 'EMPTY'); continue
    if name == 'muscles':  # corps athlétique : chaque muscle gonflé le long de ses normales
        for p in parts:
            p.merge_vertices(); p.vertices = p.vertices + p.vertex_normals * 5
    parts = [simplify(p, max(60, int(len(p.faces) * target / raw * 1.05))) for p in parts]
    m = trimesh.util.concatenate(parts)
    m = simplify(m, target)
    meshes[name] = m
    print(f'{name:11s} {len(parts):4d} files {raw:8d} -> {len(m.faces):7d} faces', flush=True)

# Z-up (mm) -> Y-up (m), centré au sol
allv = np.vstack([m.vertices for m in meshes.values()])
cx, cy, zmin = (allv[:, 0].min() + allv[:, 0].max()) / 2, (allv[:, 1].min() + allv[:, 1].max()) / 2, allv[:, 2].min()
for name, m in meshes.items():
    x, y, z = (m.vertices - [cx, cy, zmin]).T / 1000
    meshes[name] = trimesh.Trimesh(np.c_[x, z, -y], m.faces, process=False)

g = lambda r, c, w: np.exp(-((r - c) / w) ** 2)
sm = lambda t: (lambda u: u * u * (3 - 2 * u))(np.clip(t, 0, 1))
# Épaules plus larges : les bras s'écartent un peu du tronc (le tronc ne bouge pas)
for m in meshes.values():
    v = m.vertices.copy(); y, ax = v[:, 1], np.abs(v[:, 0])
    inner = np.where(y > 1.2, .13, np.where(y < 1.1, .175, .13 + (1.2 - y) / .1 * .045))
    w = sm((ax - inner) / .05) * sm((1.50 - y) / .08) * sm((y - .66) / .04)
    v[:, 0] += np.sign(v[:, 0]) * .035 * w
    m.vertices = v

# Jambes : volumineuses, verticales et parallèles (cuisses séparées), pieds pointés droit devant
g = lambda r, c, w: np.exp(-((r - c) / w) ** 2)
sm = lambda t: (lambda u: u * u * (3 - 2 * u))(np.clip(t, 0, 1))
mv = meshes['muscles'].vertices; mv = mv[np.abs(mv[:, 0]) < .18]   # sans les mains
bins = np.arange(0, .94, .02)
cen = {sx: np.array([mv[(np.abs(mv[:, 1] - y) < .02) & (np.sign(mv[:, 0]) == sx)][:, [0, 2]].mean(0) for y in bins]) for sx in (-1, 1)}
from scipy.ndimage import uniform_filter1d
cen = {sx: uniform_filter1d(c, 7, axis=0, mode='nearest') for sx, c in cen.items()}  # axe lissé : pas de bosses
ank = {sx: mv[(np.abs(mv[:, 1] - .10) < .015) & (np.sign(mv[:, 0]) == sx)][:, [0, 2]].mean(0) for sx in (-1, 1)}
for m in meshes.values():
    v = m.vertices.copy(); y = v[:, 1]
    w = sm((.92 - y) / .12) * sm((.20 - np.abs(v[:, 0])) / .03)        # poids « jambe »
    k = 1 + w * (.24 * g(y, .70, .13) + .03 * g(y, .50, .04) + .17 * g(y, .36, .07) - .10 * g(y, .12, .04))  # cuisses pleines, mollets marqués, chevilles fines
    for sx in (-1, 1):
        s = (np.sign(v[:, 0]) == sx) & (w > 0)
        cx, cz = np.interp(y[s], bins, cen[sx][:, 0]), np.interp(y[s], bins, cen[sx][:, 1])
        v[s, 0] = cx + (v[s, 0] - cx) * k[s]; v[s, 2] = cz + (v[s, 2] - cz) * k[s]
        a = np.radians(25) * sx * sm((.13 - y[s]) / .06) * w[s]          # pied tourné vers l'avant
        dx, dz = v[s, 0] - ank[sx][0], v[s, 2] - ank[sx][1]
        v[s, 0] = ank[sx][0] + dx * np.cos(a) - dz * np.sin(a); v[s, 2] = ank[sx][1] + dx * np.sin(a) + dz * np.cos(a)
        v[s, 0] += sx * (.11 - sx * cx) * sm((.86 - y[s]) / .12) * w[s]   # axe de la jambe vertical à 11 cm du centre
    m.vertices = v

# Peau : enveloppe lissée autour des muscles, du squelette et des organes
from skimage import measure
from scipy import ndimage
pitch = .005
vox = trimesh.util.concatenate([meshes[k] for k in ('muscles', 'skeleton', 'lungs', 'heart', 'liver', 'stomach', 'intestines', 'kidneys', 'brain')]).voxelized(pitch).fill()
grid = ndimage.binary_closing(np.pad(vox.matrix, 8), iterations=3)[8:-8, 8:-8, 8:-8]
# épaules arrondies : trapèzes en pente douce + deltoïdes ronds
X, Y, Z = np.meshgrid(*[vox.translation[i] + np.arange(grid.shape[i]) * pitch for i in range(3)], indexing='ij')
def capsule(a, b, r):
    a, b = np.array(a), np.array(b); ab = b - a
    P = np.stack([X - a[0], Y - a[1], Z - a[2]], -1)
    t = np.clip((P @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(P - t[..., None] * ab, axis=-1) < r
def ell(c, r): return ((X - c[0]) / r[0]) ** 2 + ((Y - c[1]) / r[1]) ** 2 + ((Z - c[2]) / r[2]) ** 2 < 1
for sx in (-1, 1):
    grid |= capsule((sx * .035, 1.535, -.035), (sx * .18, 1.475, -.025), .04)   # trapèze
    grid |= ell((sx * .195, 1.41, -.005), (.065, .075, .065))                   # tête du deltoïde
    grid |= capsule((sx * .20, 1.41, -.005), (sx * .21, 1.29, 0), .05)       # corps du deltoïde
grid[(np.abs(X) < .016) & (Y < .79)] = 0  # fente entre les cuisses
grid = ndimage.binary_fill_holes(ndimage.binary_dilation(grid, iterations=1)).astype(np.float32)
grid = ndimage.gaussian_filter(np.pad(grid, 10), 3.6)
v, f, _, _ = measure.marching_cubes(grid, .40)
v = (v - 10) * pitch + vox.translation
skin = max(trimesh.Trimesh(v, f[:, ::-1]).split(only_watertight=False), key=lambda c: len(c.faces))
trimesh.smoothing.filter_taubin(skin, iterations=60)
# galbe de la peau des jambes : cuisses pleines, genoux et chevilles affinés, mollets marqués
sv = skin.vertices; lv = sv[(np.abs(sv[:, 0]) < .18) & (sv[:, 1] < .94)]
for sx in (-1, 1):
    c = np.array([lv[(np.abs(lv[:, 1] - y) < .02) & (np.sign(lv[:, 0]) == sx)][:, [0, 2]].mean(0) for y in bins])
    c = uniform_filter1d(c, 7, axis=0, mode='nearest')
    y = sv[:, 1]; s = (np.sign(sv[:, 0]) == sx) & (np.abs(sv[:, 0]) < .2) & (y < .9)
    w = sm((.86 - y[s]) / .1) * sm((.20 - np.abs(sv[s, 0])) / .03)
    kk = 1 + w * (.04 * g(y[s], .68, .1) - .10 * g(y[s], .50, .05) + .04 * g(y[s], .36, .06) - .14 * g(y[s], .12, .07))
    cx, cz = np.interp(y[s], bins, c[:, 0]), np.interp(y[s], bins, c[:, 1])
    sv[s, 0] = cx + (sv[s, 0] - cx) * kk; sv[s, 2] = cz + (sv[s, 2] - cz) * np.minimum(1, kk + .08)
skin.vertices = sv
# taille affinée (tronc seulement)
sv = skin.vertices; tw = sm((.17 - np.abs(sv[:, 0])) / .02)
sv[:, 0] *= 1 - .07 * g(sv[:, 1], 1.06, .09) * tw
skin.vertices = sv
# hanche → cuisse : contour extérieur continu et bombé (plus de rebord)
sv = skin.vertices; ys = np.arange(.60, 1.09, .02)
for sx in (-1, 1):
    c = np.interp(ys, bins, uniform_filter1d(np.array([sv[(np.abs(sv[:, 1] - y) < .02) & (np.sign(sv[:, 0]) == sx) & (np.abs(sv[:, 0]) < .2)][:, 0].mean() for y in bins]), 7, mode='nearest'))
    om = np.array([np.abs(sv[(np.abs(sv[:, 1] - y) < .012) & (np.sign(sv[:, 0]) == sx) & (np.abs(sv[:, 0]) < (.16 if y > .98 else .2))][:, 0]).max() for y in ys])
    H = []  # enveloppe convexe supérieure du contour
    for p in zip(ys, om):
        while len(H) > 1 and (H[-1][0] - H[-2][0]) * (p[1] - H[-2][1]) - (H[-1][1] - H[-2][1]) * (p[0] - H[-2][0]) >= 0: H.pop()
        H.append(p)
    T = np.interp(ys, *zip(*H)) + .006 * g(ys, .84, .1)
    y = sv[:, 1]; s = (np.sign(sv[:, 0]) == sx) & (y > .6) & (y < 1.08) & (np.abs(sv[:, 0]) < .2)
    ci, oi, ti = (np.interp(y[s], ys, a) for a in (sx * c, om, T))
    out = np.abs(sv[s, 0]) > ci
    w = sm((y[s] - .60) / .05) * sm((1.08 - y[s]) / .05) * out
    f = 1 + w * ((ti - ci) / np.maximum(oi - ci, 1e-3) - 1)
    sv[s, 0] = sx * (ci + (np.abs(sv[s, 0]) - ci) * f)
skin.vertices = sv
# lissage local : jonction hanche-cuisse et chevilles (plus d'arête ni de cassure)
nb = skin.vertex_neighbors; sv = skin.vertices.copy()
lw = np.maximum(g(sv[:, 1], .86, .07), .7 * g(sv[:, 1], .16, .08)) * sm((.21 - np.abs(sv[:, 0])) / .02)
idx = np.nonzero(lw > .02)[0]
for _ in range(80):
    avg = np.array([sv[nb[i]].mean(0) for i in idx])
    sv[idx] += (avg - sv[idx]) * (.5 * lw[idx, None])
skin.vertices = sv
meshes['skin'] = simplify(skin, 55000)
print('skin', len(meshes['skin'].faces), flush=True)

scene = trimesh.Scene()
for name, m in meshes.items():
    scene.add_geometry(trimesh.Trimesh(m.vertices.astype(np.float32), m.faces, process=False), node_name=name, geom_name=name)
scene.export('body.glb', include_normals=False)
print('body.glb', os.path.getsize('body.glb') // 1024, 'KB')
