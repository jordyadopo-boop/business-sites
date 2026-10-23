# Génère brain.glb (cerveau seul, détaillé) depuis BodyParts3D (CC BY-SA 2.1 JP).
# Placer dans tools/ : partof_BP3D_4.0_obj_99/ (dézippé) et partof_element_parts.txt, puis :
#   python3 brain.py && npx -y @gltf-transform/cli@4.1.1 meshopt brain_raw.glb ../brain.glb
import trimesh, numpy as np, os, fast_simplification as fs
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ids = sorted({c[2].strip() for c in (l.split('\t') for l in open('partof_element_parts.txt', encoding='utf-8').read().splitlines()[1:]) if len(c) >= 3 and c[1].strip() == 'brain'})
parts = [trimesh.load(f'partof_BP3D_4.0_obj_99/{i}.obj', force='mesh', process=False) for i in ids]
m = trimesh.util.concatenate(parts); m.merge_vertices()
v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - 120000 / len(m.faces))
x, y, z = v.T / 1000                       # Z-up (mm) -> Y-up (m), +z = avant
v = np.c_[x, z, -y]; v -= (v.min(0) + v.max(0)) / 2   # centré
print(len(ids), 'fichiers', len(m.faces), '->', len(f), 'faces ; demi-dimensions', (np.ptp(v, 0) / 2).round(4))
s = trimesh.Scene(); s.add_geometry(trimesh.Trimesh(v.astype(np.float32), f, process=False), node_name='brain', geom_name='brain')
s.export('brain_raw.glb', include_normals=False)
