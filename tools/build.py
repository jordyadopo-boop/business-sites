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

# Jambes : plus volumineuses, puis légèrement écartées de l'entrejambe aux pieds (posture de mannequin)
g = lambda r, c, w: np.exp(-((r - c) / w) ** 2)
mv = meshes['muscles'].vertices; bins = np.arange(0, .92, .02)
cen = {sx: np.array([mv[(np.abs(mv[:, 1] - y) < .02) & (np.sign(mv[:, 0]) == sx)][:, [0, 2]].mean(0) for y in bins]) for sx in (-1, 1)}
for m in meshes.values():
    v = m.vertices.copy(); leg = v[:, 1] < .92
    t = np.clip((.92 - v[:, 1]) / .12, 0, 1); t = t * t * (3 - 2 * t)
    k = 1 + t * (.08 + .12 * g(v[:, 1], .66, .14) + .07 * g(v[:, 1], .36, .09))   # cuisses et mollets
    for sx in (-1, 1):
        sel = leg & (np.sign(v[:, 0]) == sx)
        cx, cz = np.interp(v[sel, 1], bins, cen[sx][:, 0]), np.interp(v[sel, 1], bins, cen[sx][:, 1])
        v[sel, 0] = cx + (v[sel, 0] - cx) * k[sel]; v[sel, 2] = cz + (v[sel, 2] - cz) * k[sel]
    v[:, 0] += np.sign(v[:, 0]) * (.032 * np.clip((.86 - v[:, 1]) / .12, 0, 1) + .045 * np.clip((.86 - v[:, 1]) / .86, 0, 1))
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
    grid |= capsule((sx * .035, 1.53, -.035), (sx * .15, 1.45, -.025), .038)   # trapèze
    grid |= ell((sx * .165, 1.395, -.005), (.06, .07, .062))                   # tête du deltoïde
    grid |= capsule((sx * .17, 1.40, -.005), (sx * .175, 1.29, 0), .048)       # corps du deltoïde
grid[(np.abs(X) < .016) & (Y < .79)] = 0  # fente entre les cuisses
grid = ndimage.binary_fill_holes(ndimage.binary_dilation(grid, iterations=1)).astype(np.float32)
grid = ndimage.gaussian_filter(np.pad(grid, 10), 2.5)
v, f, _, _ = measure.marching_cubes(grid, .45)
v = (v - 10) * pitch + vox.translation
skin = max(trimesh.Trimesh(v, f[:, ::-1]).split(only_watertight=False), key=lambda c: len(c.faces))
trimesh.smoothing.filter_taubin(skin, iterations=30)
meshes['skin'] = simplify(skin, 55000)
print('skin', len(meshes['skin'].faces), flush=True)

scene = trimesh.Scene()
for name, m in meshes.items():
    scene.add_geometry(trimesh.Trimesh(m.vertices.astype(np.float32), m.faces, process=False), node_name=name, geom_name=name)
scene.export('body.glb', include_normals=False)
print('body.glb', os.path.getsize('body.glb') // 1024, 'KB')
