// Fond 3D : corps humain anatomique (BodyParts3D) en verre néon, parcouru au défilement.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const stage = document.getElementById('stage');
const hudT = document.getElementById('hudT'), hudB = document.getElementById('hudB');
const lbl = document.getElementById('lbl'), lName = lbl.querySelector('b'), lSub = lbl.querySelector('span'), lLine = document.getElementById('lblLine');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080d, 1);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05080d, 0.18);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 50);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.75, 0.45, 0.22);
composer.addPass(bloom);

// Grille de sol holographique
const grid = new THREE.GridHelper(6, 60, 0x3dffb0, 0x0d3326);
grid.material.transparent = true; grid.material.opacity = .25;
scene.add(grid);

// Matériau « verre néon » : transparent au centre, bords lumineux (effet de Fresnel)
const neon = (color, { base = .05, power = 2.2, flow = 0 } = {}) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uPow: { value: power },
    uOn: { value: .3 }, uTime: { value: 0 }, uFlow: { value: flow } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uBase, uPow, uOn, uTime, uFlow; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), uPow);
      float pulse = uFlow > 0. ? .55 + .9 * pow(.5 + .5 * sin(vP.y * 28. - uTime * 3.5), 6.) : 1.;
      float a = (uBase + f) * uOn * pulse;
      gl_FragColor = vec4(uColor * a, 1.); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});

const STYLE = {
  skin: ['#4cc9ff', { base: .01, power: 3 }], skeleton: ['#dfeaff', { base: .012, power: 2.2 }],
  muscles: ['#ff4f6d', { base: .01, power: 2.4 }], brain: ['#ff7ad9', { base: .004, power: 3 }],
  eyes: ['#7df9ff', { base: .08 }], heart: ['#ff2e55', { base: .03, power: 1.8 }], lungs: ['#7fa8ff', { base: .01, power: 2.4 }],
  liver: ['#ff8c3a', { base: .02, power: 2.4 }], stomach: ['#ffd166', { base: .03, power: 2.2 }], kidneys: ['#c77dff', { base: .04, power: 2 }],
  intestines: ['#ff8fab', { base: .015, power: 2.4 }], arteries: ['#ff3355', { base: .1, power: 1.6, flow: 1 }],
  veins: ['#3d7bff', { base: .1, power: 1.6, flow: 1 }], nerves: ['#f5ff6b', { base: .15, power: 1.4, flow: 1 }]
};

const S = [
  { name: 'Corps humain', sub: 'Tout le corps travaille pour vous', fit: 1 },
  { id: 'brain', name: 'Cerveau', sub: 'Stratégie, logique et idées', d: .55, a: .5 },
  { id: 'eyes', name: 'Yeux', sub: 'Un design qui capte le regard', d: .4, a: 0 },
  { id: 'nerves', name: 'Système nerveux', sub: 'Chaque clic transmis instantanément', d: 1.5, a: -.4 },
  { id: 'heart', name: 'Cœur', sub: 'La passion du travail bien fait', d: .45, a: .35 },
  { id: 'lungs', name: 'Poumons', sub: 'Des sites légers qui respirent', d: .75, a: -.3 },
  { id: 'liver', name: 'Foie', sub: 'Sécurité : je filtre le nuisible', d: .55, a: -.6 },
  { id: 'stomach', name: 'Estomac', sub: 'Je digère vos idées', d: .5, a: .6 },
  { id: 'kidneys', name: 'Reins', sub: 'Optimisation et SEO', d: .55, a: 2.8 },
  { id: 'intestines', name: 'Intestins', sub: 'Vos données traitées en profondeur', d: .6, a: .2 },
  { id: 'arteries', name: 'Artères & veines', sub: 'Le flux continu de votre trafic', d: 1.9, a: .5 },
  { id: 'skeleton', name: 'Squelette', sub: 'Un code structuré et solide', d: 1.9, a: -.7 },
  { id: 'muscles', name: 'Muscles', sub: 'La puissance de vos ambitions', d: 1.4, a: .9, dy: -.35 },
  { id: '*', name: 'Prêt', sub: 'Tout le corps est prêt. Et vous ?', fit: 1 }
];

const parts = {}, body = new THREE.Group();
scene.add(body);
let ready = false, neurons;

new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('body.glb', gltf => {
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const name = o.name.replace(/_\d+$/, ''), st = STYLE[name] || ['#ffffff', {}];
    o.geometry.computeVertexNormals();
    o.material = neon(st[0], st[1]);
    o.renderOrder = name === 'skin' ? 2 : 1;
    o.userData.s = o.scale.clone();
    parts[name] = o;
  });
  body.add(gltf.scene); body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body), size = box.getSize(new THREE.Vector3());
  S.forEach(s => {
    const b = s.id && parts[s.id] && s.id !== '*' ? new THREE.Box3().setFromObject(parts[s.id]) : box;
    s.c = b.getCenter(new THREE.Vector3()); if (s.dy) s.c.y += s.dy;
    if (s.fit) { s.d = size.y * 1.35; s.a = 0; s.c.y = size.y * .5; }
    s.anchor = s.c.clone();
  });
  neurons = makeNeurons(parts.brain);
  ready = true;
  hudT.textContent = 'SCAN · ' + S[0].name.toUpperCase();
}, e => { if (e.total) hudT.textContent = 'CHARGEMENT ' + Math.round(e.loaded / e.total * 100) + '%'; });

// Neurones : points sur le cortex reliés entre eux, qui s'allument en chaîne
function makeNeurons(brain) {
  const pos = brain.geometry.attributes.position, N = 220, pts = [], links = [];
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, Math.random() * pos.count | 0).applyMatrix4(brain.matrixWorld));
  const nb = pts.map(() => []);
  pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && a.distanceTo(b) < .03) { links.push(i, j); nb[i].push(j); nb[j].push(i); } }));
  const pg = new THREE.BufferGeometry().setFromPoints(pts), pc = new Float32Array(N * 3);
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const lg = new THREE.BufferGeometry(), lp = new Float32Array(links.length * 3), lc = new Float32Array(links.length * 3);
  links.forEach((k, i) => pts[k].toArray(lp, i * 3));
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const mat = { vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const P = new THREE.Points(pg, new THREE.PointsMaterial({ size: .012, ...mat })), L = new THREE.LineSegments(lg, new THREE.LineBasicMaterial(mat));
  body.add(P, L);
  return { N, nb, links, pc, lc, pg, lg, t: new Float32Array(N).fill(-1e9) };
}
function fire(i, now, depth) {
  if (now - neurons.t[i] < 600) return; neurons.t[i] = now;
  if (depth > 0) neurons.nb[i].forEach(j => setTimeout(() => fire(j, performance.now(), depth - 1), 90 + Math.random() * 140));
}

const cur = { c: new THREE.Vector3(0, .9, 0), d: 3, a: 0 }, mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
const ease = t => { t = Math.min(1, Math.max(0, (t - .25) / .5)); return t * t * (3 - 2 * t); };
const ids = Object.keys(STYLE).filter(k => k !== 'skin'), tmp = new THREE.Vector3();
let last = -1, lastFire = 0;

renderer.setAnimationLoop(now => {
  if (ready) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = (max > 0 ? scrollY / max : 0) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f)), t = ease(f - i), A = S[i], B = S[i + 1];
    const tc = A.c.clone().lerp(B.c, t), td = A.d + (B.d - A.d) * t, ta = A.a + (B.a - A.a) * t;
    cur.c.lerp(tc, .06); cur.d += (td - cur.d) * .06; cur.a += (ta - cur.a) * .06;
    const ang = cur.a + Math.sin(now / 6000) * .25 + mouse.x * .5;
    camera.position.set(cur.c.x + Math.sin(ang) * cur.d, cur.c.y + cur.d * (.12 - mouse.y * .3), cur.c.z + Math.cos(ang) * cur.d);
    camera.lookAt(cur.c);

    const k = Math.round(f), st = S[k];
    const lit = st.id === '*' ? null : st.id || ids[Math.floor(now / 1000) % ids.length];
    for (const [name, m] of Object.entries(parts)) {
      const u = m.material.uniforms, on = name === 'skin' ? 1 : (!lit ? .45 : name === lit ? 1.5 : .12);
      u.uOn.value += (on - u.uOn.value) * .08; u.uTime.value = now / 1000;
    }
    if (parts.heart) { const s = 1 + Math.max(0, Math.sin(now / 1000 * 7.5)) ** 8 * .06; parts.heart.scale.copy(parts.heart.userData.s).multiplyScalar(s); }

    // neurones
    if (now - lastFire > 140) { lastFire = now; fire(Math.random() * neurons.N | 0, now, 4); }
    for (let n = 0; n < neurons.N; n++) { const g = Math.max(0, 1 - (now - neurons.t[n]) / 600); neurons.pc.set([1 * g + .25, .5 * g + .1, .9 * g + .25], n * 3); }
    neurons.links.forEach((n, j) => { const g = Math.max(0, 1 - (now - neurons.t[n]) / 600) * .9 + .06; neurons.lc.set([g, g * .45, g * .85], j * 3); });
    neurons.pg.attributes.color.needsUpdate = neurons.lg.attributes.color.needsUpdate = true;

    // étiquette : flèche vers l'organe + nom
    if (k !== last) { last = k; lName.textContent = st.name; lSub.textContent = st.sub; hudT.textContent = 'SCAN · ' + st.name.toUpperCase(); }
    tmp.copy(st.anchor).project(camera);
    const x = (tmp.x * .5 + .5) * innerWidth, y = (-tmp.y * .5 + .5) * innerHeight, show = st.id && st.id !== '*' && Math.abs(f - k) < .3;
    const right = x < innerWidth * .6, lx = right ? x + 90 : x - 90, ly = y - 70;
    lbl.style.opacity = show ? 1 : 0; lLine.style.opacity = show ? 1 : 0;
    lbl.style.transform = `translate(${right ? lx : lx - lbl.offsetWidth}px, ${ly - 22}px)`;
    lLine.setAttribute('d', `M${x},${y} L${right ? x + 60 : x - 60},${ly} L${lx},${ly}`);
    lLine.nextElementSibling.setAttribute('cx', x); lLine.nextElementSibling.setAttribute('cy', y);
    hudB.style.width = (f / (S.length - 1) * 100) + '%';
  }
  composer.render();
});
