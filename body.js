// Fond 3D : corps humain anatomique (BodyParts3D) en verre néon, parcouru au défilement.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const stage = document.getElementById('stage'), AV = location.hash === '#avatar';  // #avatar : vue fixe du cerveau (photo de profil)
const hudT = document.getElementById('hudT'), hudB = document.getElementById('hudB');
const lbl = document.getElementById('lbl'), lStep = lbl.querySelector('small'), lName = lbl.querySelector('b'), lRole = lbl.querySelector('em'), lSub = lbl.querySelector('span'), lLine = document.getElementById('lblLine');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 1);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.18);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 50);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.35, 0.3);
composer.addPass(bloom);

// Grille de sol holographique
const grid = new THREE.GridHelper(6, 60, 0x9a9a9a, 0x262626);
grid.material.transparent = true; grid.material.opacity = .18;
scene.add(grid);

// Matériau « verre néon » : transparent au centre, bords lumineux (effet de Fresnel)
const neon = (color, { base = .05, power = 2.2, flow = 0, skin = 0, head = .3 } = {}) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uPow: { value: power },
    uOn: { value: .3 }, uTime: { value: 0 }, uFlow: { value: flow }, uSkin: { value: skin }, uScan: { value: 0 }, uSrc: { value: new THREE.Vector3() }, uHead: { value: head }, uNeck: { value: 9 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uBase, uPow, uOn, uTime, uFlow, uSkin, uScan, uHead, uNeck; uniform vec3 uSrc; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), uPow);
      // sang / influx : des vagues partent du cœur (artères), y reviennent (veines), partent du cerveau (nerfs)
      float pulse = uFlow != 0. ? .3 + 2.2 * pow(.5 + .5 * sin(length(vP - uSrc) * 42. - uTime * 5. * uFlow), 10.) : 1.;
      float a = (uBase + f) * uOn * pulse;
      // peau : balayage holographique qui descend le long du corps + fines lignes de scan
      if (uSkin > 0.) a += uOn * (exp(-pow((vP.y - uScan) * 16., 2.)) * (.25 + f) * 1.4 + .03 * step(.6, fract(vP.y * 160. - uTime)) * f);
      // tête : beaucoup de couches se superposent, on les atténue pour éviter un visage saturé
      a *= mix(1., uHead, smoothstep(uNeck, uNeck + .06, vP.y));
      gl_FragColor = vec4(uColor * a * .42, 1.); }`,  // blanc : ~3× plus lumineux qu'une couleur pure
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});

const STYLE = {  // tout en blanc : seules l'intensité et le contour différencient les couches
  skin: ['#ffffff', { base: .01, power: 2.8, skin: 1, head: .45 }], skeleton: ['#ffffff', { base: .005, power: 2.6, head: .25 }],
  muscles: ['#ffffff', { base: .003, power: 3, head: .15 }], brain: ['#ffffff', { base: .006, power: 2.4, head: 1 }],
  eyes: ['#ffffff', { base: .01, power: 2.4, head: 1 }], heart: ['#ffffff', { base: .025, power: 2 }], lungs: ['#ffffff', { base: .008, power: 2.6 }],
  liver: ['#ffffff', { base: .015, power: 2.4 }], stomach: ['#ffffff', { base: .02, power: 2.2 }], kidneys: ['#ffffff', { base: .03, power: 2 }],
  intestines: ['#ffffff', { base: .012, power: 2.4 }], arteries: ['#ffffff', { base: .08, power: 1.6, flow: 1, head: .2 }],
  veins: ['#d0d0d0', { base: .07, power: 1.6, flow: -1, head: .2 }], nerves: ['#ffffff', { base: .1, power: 1.4, flow: 1, head: .2 }]
};

// Chaque organe = une étape de la conception d'un site
const FLOW = { arteries: .5, veins: .45, nerves: .35 };  // la circulation reste toujours visible
const LIT = { brain: .6, muscles: .45, skeleton: .7 };  // surbrillance de l'étape (les grandes couches saturent vite)
const SOLID = ['brain', 'heart', 'liver', 'stomach', 'kidneys', 'intestines'];

const S = [
  { name: 'Corps humain', role: 'Un site, c\'est un corps vivant', sub: 'Chaque organe a son rôle. Descendez : je vous montre comment je construis le vôtre.', fit: 1 },
  { id: 'brain', name: 'Cerveau', role: 'La réflexion · stratégie', sub: 'Tout commence ici : vos objectifs, vos clients, le plan du site.', d: .55, a: .5 },
  { id: 'nerves', name: 'Nerfs & neurones', role: 'Les connexions', sub: 'Pages, liens, formulaires, WhatsApp : tout est relié et répond à la seconde.', d: 1.5, a: -.4 },
  { id: 'eyes', name: 'Yeux', role: 'Le design', sub: 'Ce que vos visiteurs voient en premier : un site beau qui inspire confiance.', d: .4, a: 0 },
  { id: 'skeleton', name: 'Squelette', role: 'La structure · le code', sub: 'Une architecture propre et solide qui tient sur ordinateur et mobile.', d: 1.9, a: -.7 },
  { id: 'heart', name: 'Cœur', role: 'Le moteur · serveur', sub: 'Il fait battre le site 24h/24 : hébergement, back-end, mises en ligne.', d: .45, a: .35 },
  { id: 'arteries', name: 'Artères & veines', role: 'Le flux de données', sub: 'Les informations circulent sans interruption entre vos visiteurs et vous.', d: 1.9, a: .5 },
  { id: 'lungs', name: 'Poumons', role: 'La performance', sub: 'Un site léger qui respire : il s\'ouvre en un instant, même en 3G.', d: .75, a: -.3 },
  { id: 'muscles', name: 'Muscles', role: 'Les fonctionnalités', sub: 'Devis, commandes, animations, espace client : le site agit pour vous.', d: 1.4, a: .9, dy: -.35 },
  { id: 'stomach', name: 'Estomac', role: 'Le contenu', sub: 'Je digère vos textes, photos et idées pour en faire un message clair.', d: .5, a: .6 },
  { id: 'intestines', name: 'Intestins', role: 'La base de données', sub: 'Commandes, contacts, élèves : vos données rangées et traitées en profondeur.', d: .6, a: .2 },
  { id: 'liver', name: 'Foie', role: 'La sécurité', sub: 'Il filtre le nuisible : HTTPS, protection des formulaires, sauvegardes.', d: .55, a: -.6 },
  { id: 'kidneys', name: 'Reins', role: 'Le référencement · SEO', sub: 'Ils purifient et optimisent pour que Google vous trouve.', d: .55, a: 2.8 },
  { id: '*', name: 'Site vivant', role: 'Tout le corps travaille', sub: 'Chaque organe est prêt. Le vôtre est le prochain ?', fit: 1 }
];

const parts = {}, body = new THREE.Group();
scene.add(body);
let ready = false, neurons, scanRange = [0, 2];

new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('body.glb', gltf => {
  gltf.scene.traverse(o => {
    if (!o.isMesh || o.userData.z) return;
    const name = o.name.replace(/_\d+$/, ''), st = STYLE[name] || ['#ffffff', {}];
    o.geometry.computeVertexNormals();
    o.material = neon(st[0], st[1]);
    o.renderOrder = name === 'skin' ? 2 : 1;
    if (SOLID.includes(name)) {  // pré-passe de profondeur : seule la surface extérieure de l'organe s'illumine
      o.material.side = THREE.FrontSide;
      const z = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
      z.renderOrder = 0; z.userData.z = true; o.add(z);
    }
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
  const hc = new THREE.Box3().setFromObject(parts.heart).getCenter(new THREE.Vector3()), bc = new THREE.Box3().setFromObject(parts.brain).getCenter(new THREE.Vector3());
  parts.arteries.material.uniforms.uSrc.value.copy(hc); parts.veins.material.uniforms.uSrc.value.copy(hc); parts.nerves.material.uniforms.uSrc.value.copy(bc);
  scanRange = [box.min.y, box.max.y];
  const neck = new THREE.Box3().setFromObject(parts.brain).min.y - .07;  // base du crâne
  Object.values(parts).forEach(m => m.material.uniforms.uNeck.value = neck);
  neurons = makeNeurons(parts.brain);
  ready = true;
  hudT.textContent = 'SCAN · ' + S[0].name.toUpperCase();
}, e => { if (e.total) hudT.textContent = 'CHARGEMENT ' + Math.round(e.loaded / e.total * 100) + '%'; });

// Texte qui s'écrit lettre par lettre
let typing;
function type(t) { clearInterval(typing); let n = 0; lSub.textContent = ''; typing = setInterval(() => { lSub.textContent = t.slice(0, ++n); if (n >= t.length) clearInterval(typing); }, 18); }

// Neurones : points sur le cortex reliés entre eux, qui s'allument en chaîne
function makeNeurons(brain) {
  const pos = brain.geometry.attributes.position, N = 220, pts = [], links = [];
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, Math.random() * pos.count | 0).applyMatrix4(brain.matrixWorld));
  const ctr = new THREE.Box3().setFromObject(brain).getCenter(new THREE.Vector3());
  pts.forEach(p => p.sub(ctr).multiplyScalar(1.04).add(ctr));
  const nb = pts.map(() => []);
  const seen = new Set();  // chaque neurone relié à ses 3 plus proches voisins
  pts.forEach((a, i) => pts.map((b, j) => [a.distanceTo(b), j]).sort((x, y) => x[0] - y[0]).slice(1, 4).forEach(([, j]) => {
    const key = Math.min(i, j) + ',' + Math.max(i, j); if (seen.has(key)) return; seen.add(key);
    links.push(i, j); nb[i].push(j); nb[j].push(i);
  }));
  const pg = new THREE.BufferGeometry().setFromPoints(pts), pc = new Float32Array(N * 3);
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const lg = new THREE.BufferGeometry(), lp = new Float32Array(links.length * 3), lc = new Float32Array(links.length * 3);
  links.forEach((k, i) => pts[k].toArray(lp, i * 3));
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const mat = { vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false };
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  const dot = new THREE.CanvasTexture(cv);  // points ronds et lumineux
  const P = new THREE.Points(pg, new THREE.PointsMaterial({ size: .022, map: dot, ...mat })), L = new THREE.LineSegments(lg, new THREE.LineBasicMaterial(mat));
  const SP = 400, sg = new THREE.BufferGeometry(), sp = new Float32Array(SP * 3).fill(99), sc = new Float32Array(SP * 3);
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const Sk = new THREE.Points(sg, new THREE.PointsMaterial({ size: .02, map: dot, ...mat }));
  P.renderOrder = L.renderOrder = Sk.renderOrder = 3; body.add(P, L, Sk);
  return { N, nb, links, pc, lc, pg, lg, pts, sg, sp, sc, sparks: [], t: new Float32Array(N).fill(-1e9) };
}
function fire(i, now, depth) {
  if (now - neurons.t[i] < 600) return; neurons.t[i] = now;
  if (depth > 0) neurons.nb[i].forEach(j => {
    const dur = 90 + Math.random() * 140;
    if (neurons.sparks.length < 400) neurons.sparks.push({ a: i, b: j, t0: now, dur });
    setTimeout(() => fire(j, performance.now(), depth - 1), dur);
  });
}

const cur = { c: new THREE.Vector3(0, .9, 0), d: 3, a: 0 }, mouse = { x: 0, y: 0 };
// Pivoter (glisser) et zoomer (pincer, Ctrl + molette, boutons +/−) ; le texte et les liens restent utilisables
const user = { yaw: 0, pitch: 0, zoom: 1 }, ptrs = new Map(), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SKIP = 'a,button,input,textarea,select,label,p,h1,h2,h3,h4,li,span,b,em,strong,small,img,svg,.card';
let pinch = 0, zoom0 = 1;
const gap = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
addEventListener('pointerdown', e => {
  if (e.target.closest(SKIP) || (e.pointerType === 'mouse' && e.button)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { pinch = gap(); zoom0 = user.zoom; }
});
addEventListener('pointermove', e => {
  mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 1) {
    user.yaw -= (e.clientX - p.x) * .008;
    if (e.pointerType === 'mouse') user.pitch = clamp(user.pitch + (e.clientY - p.y) * .004, -.8, .8);
  }
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) user.zoom = clamp(zoom0 * pinch / gap(), .35, 2.5);
});
['pointerup', 'pointercancel'].forEach(t => addEventListener(t, e => ptrs.delete(e.pointerId)));
addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); user.zoom = clamp(user.zoom * Math.exp(e.deltaY * .01), .35, 2.5); }, { passive: false });
document.getElementById('cam')?.addEventListener('click', e => {
  const c = e.target.closest('button')?.dataset.c;
  if (c === 'in') user.zoom = clamp(user.zoom / 1.3, .35, 2.5);
  if (c === 'out') user.zoom = clamp(user.zoom * 1.3, .35, 2.5);
  if (c === 'reset') Object.assign(user, { yaw: 0, pitch: 0, zoom: 1 });
});
const view = { yaw: 0, pitch: 0, zoom: 1 };  // valeurs lissées
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
const ease = t => { t = Math.min(1, Math.max(0, (t - .25) / .5)); return t * t * (3 - 2 * t); };
const ids = Object.keys(STYLE).filter(k => k !== 'skin'), tmp = new THREE.Vector3();
let last = -1, lastFire = 0;
const mobile = matchMedia('(max-width:760px)');  // sur mobile, l'étiquette flottante est masquée : le bandeau donne aussi le rôle

renderer.setAnimationLoop(now => {
  if (ready) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = AV ? 1 : (max > 0 ? scrollY / max : 0) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f)), t = ease(f - i), A = S[i], B = S[i + 1];
    const tc = A.c.clone().lerp(B.c, t), td = A.d + (B.d - A.d) * t, ta = A.a + (B.a - A.a) * t;
    const kk = AV ? 1 : .06; cur.c.lerp(tc, kk); cur.d += ((AV ? .85 : td) - cur.d) * kk; cur.a += (ta - cur.a) * kk;
    for (const k in view) view[k] += (user[k] - view[k]) * .15;
    const drag = ptrs.size > 0 || user.yaw !== 0 || user.pitch !== 0;  // la souris ne fait plus bouger la vue une fois le corps pivoté
    const ang = cur.a + view.yaw + (AV ? 0 : Math.sin(now / 6000) * .25 + (drag ? 0 : mouse.x * .5));
    const dd = cur.d * view.zoom, el = .12 + view.pitch - (drag ? 0 : mouse.y * .3);
    camera.position.set(cur.c.x + Math.sin(ang) * dd, cur.c.y + dd * el, cur.c.z + Math.cos(ang) * dd);
    camera.lookAt(AV ? tmp.copy(cur.c).setY(cur.c.y + .055) : cur.c);

    const k = Math.round(f), st = S[k];
    const lit = st.id === '*' ? null : st.id || ids[Math.floor(now / 1000) % ids.length];
    for (const [name, m] of Object.entries(parts)) {
      const u = m.material.uniforms, on = name === 'skin' ? 1 : (!lit ? .8 : name === lit ? (LIT[name] || 1.3) : FLOW[name] || .1);
      u.uOn.value += (on - u.uOn.value) * .08; u.uTime.value = now / 1000;
      const pop = name === st.id && !/skin|skeleton|muscles|arteries|nerves/.test(name) ? 1.15 : 1;
      m.userData.p = (m.userData.p || 1) + (pop - (m.userData.p || 1)) * .06;
      const beat = name === 'heart' ? 1 + Math.max(0, Math.sin(now / 1000 * 7.5)) ** 8 * .06 : 1;
      m.scale.copy(m.userData.s).multiplyScalar(m.userData.p * beat);
    }

    // neurones
    if (now - lastFire > (st.id === 'brain' || st.id === 'nerves' ? 30 : 110)) { lastFire = now; fire(Math.random() * neurons.N | 0, now, 4); }
    for (let n = 0; n < neurons.N; n++) { const g = Math.max(0, 1 - (now - neurons.t[n]) / 600); neurons.pc.set([1.3 * g + .15, 1.3 * g + .15, 1.3 * g + .15], n * 3); }
    neurons.links.forEach((n, j) => { const g = Math.max(0, 1 - (now - neurons.t[n]) / 600) * 1.1 + .07; neurons.lc.set([g * .8, g * .8, g * .8], j * 3); });
    neurons.pg.attributes.color.needsUpdate = neurons.lg.attributes.color.needsUpdate = true;
    neurons.sparks = neurons.sparks.filter(k => now - k.t0 < k.dur);
    neurons.sp.fill(99);
    neurons.sparks.forEach((k, j) => {
      tmp.lerpVectors(neurons.pts[k.a], neurons.pts[k.b], (now - k.t0) / k.dur).toArray(neurons.sp, j * 3);
      neurons.sc.set([1, 1, 1], j * 3);
    });
    neurons.sg.attributes.position.needsUpdate = neurons.sg.attributes.color.needsUpdate = true;
    // balayage de la peau, de la tête aux pieds
    parts.skin.material.uniforms.uScan.value = scanRange[1] - ((now / 4000) % 1.2) * (scanRange[1] - scanRange[0]);

    // étiquette : flèche vers l'organe + nom
    if (k !== last) { last = k; lStep.textContent = 'ÉTAPE ' + String(k).padStart(2, '0'); lName.textContent = st.name; lRole.textContent = '→ ' + st.role; type(st.sub); hudT.textContent = (mobile.matches ? st.name.toUpperCase() + ' → ' + st.role : 'SCAN · ' + st.name.toUpperCase()); }
    tmp.copy(st.anchor).project(camera);
    const x = (tmp.x * .5 + .5) * innerWidth, y = (-tmp.y * .5 + .5) * innerHeight, show = Math.abs(f - k) < .3;
    const right = x < innerWidth * .55 || x - 90 - lbl.offsetWidth < 8, lx = right ? Math.min(x + 90, innerWidth - lbl.offsetWidth - 8) : x - 90, ly = Math.max(90, y - 70);
    lbl.style.opacity = show ? 1 : 0; lLine.style.opacity = show ? 1 : 0;
    lbl.style.transform = `translate(${right ? lx : lx - lbl.offsetWidth}px, ${ly - 22}px)`;
    lLine.setAttribute('d', `M${x},${y} L${right ? x + 60 : x - 60},${ly} L${lx},${ly}`);
    lLine.nextElementSibling.setAttribute('cx', x); lLine.nextElementSibling.setAttribute('cy', y);
    hudB.style.width = (f / (S.length - 1) * 100) + '%';
  }
  composer.render();
});
