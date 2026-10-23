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

# Silhouette en V : épaules et thorax élargis, taille affinée
zs = meshes['skeleton'].vertices[:, 2]; z0, H = zs.min(), np.ptp(zs)
cx0 = (meshes['skeleton'].vertices[:, 0].min() + meshes['skeleton'].vertices[:, 0].max()) / 2
g = lambda r, c, w: np.exp(-((r - c) / w) ** 2)
for m in meshes.values():
    r = (m.vertices[:, 2] - z0) / H
    k = 1 + .11 * g(r, .78, .07) - .08 * g(r, .60, .05)
    m.vertices[:, 0] = cx0 + (m.vertices[:, 0] - cx0) * k

# Peau : enveloppe lissée autour des muscles et du squelette
from skimage import measure
from scipy import ndimage
pitch = 5.0
pts = np.vstack([meshes['muscles'].vertices, meshes['skeleton'].vertices])
lo = pts.min(0) - 30
vox = trimesh.util.concatenate([meshes[k] for k in ('muscles', 'skeleton', 'lungs', 'heart', 'liver', 'stomach', 'intestines', 'kidneys', 'brain')]).voxelized(pitch).fill()
grid = vox.matrix.astype(np.float32)
grid = ndimage.binary_closing(np.pad(grid, 6), iterations=4)[6:-6, 6:-6, 6:-6]
grid = ndimage.binary_fill_holes(ndimage.binary_dilation(grid, iterations=1)).astype(np.float32)
grid = ndimage.gaussian_filter(np.pad(grid, 4), 1.3)
v, f, _, _ = measure.marching_cubes(grid, 0.5)
v = (v - 4) * pitch + vox.translation
skin = max(trimesh.Trimesh(v, f[:, ::-1]).split(only_watertight=False), key=lambda c: len(c.faces))
trimesh.smoothing.filter_taubin(skin, iterations=20)
meshes['skin'] = simplify(skin, 55000)
print('skin', len(meshes['skin'].faces), flush=True)

# Z-up (mm) -> Y-up (m), centré au sol
allv = np.vstack([m.vertices for m in meshes.values()])
cx, cy, zmin = (allv[:, 0].min() + allv[:, 0].max()) / 2, (allv[:, 1].min() + allv[:, 1].max()) / 2, allv[:, 2].min()
scene = trimesh.Scene()
for name, m in meshes.items():
    x, y, z = (m.vertices - [cx, cy, zmin]).T / 1000
    mm = trimesh.Trimesh(np.c_[x, z, -y].astype(np.float32), m.faces, process=False)
    scene.add_geometry(mm, node_name=name, geom_name=name)
scene.export('body.glb', include_normals=False)
print('body.glb', os.path.getsize('body.glb') // 1024, 'KB')
