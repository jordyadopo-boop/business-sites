// Fond 3D : un cerveau en verre blanc (BodyParts3D), parcouru au défilement.
// Chaque zone du cerveau = une étape de la conception d'un site ; à la fin, on plonge dans les neurones.
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
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .0005, 10);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .6, .5, .25);
composer.addPass(bloom);

const HALF = new THREE.Vector3(.0694, .083, .09);  // demi-dimensions du cerveau (m), centré à l'origine ; +z = avant, +x = hémisphère gauche
const U = { uTime: { value: 0 }, uFog: { value: 0 } };  // partagés par tous les matériaux

// Verre blanc : bords lumineux (Fresnel) + zone active en surbrillance
const glass = new THREE.ShaderMaterial({
  uniforms: { ...U, uOn: { value: .3 }, uReg: { value: 0 }, uRC: { value: new THREE.Vector3() }, uRS: { value: new THREE.Vector3(1, 1, 1) }, uSym: { value: 0 }, uHalf: { value: HALF } },
  vertexShader: `varying vec3 vN, vV, vP;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime, uOn, uReg, uSym; uniform vec3 uRC, uRS, uHalf; varying vec3 vN, vV, vP;
    void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), 2.4);
      vec3 n = vP / uHalf; if (uSym > .5) n.x = abs(n.x);
      float m = 1. - smoothstep(.55, 1., length((n - uRC) / uRS));          // zone active
      float wave = .85 + .15 * sin(vP.y * 90. - uTime * 1.5 + vP.z * 40.);  // activité qui parcourt le cortex
      float a = (.012 + f) * uOn * wave + m * uReg * (.06 + f * 1.6) * (.8 + .2 * sin(uTime * 4.));
      gl_FragColor = vec4(vec3(a * .5), 1.); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});

const R = (c, s, sym = 0) => ({ c: new THREE.Vector3(...c), s: new THREE.Vector3(...s), sym });
const S = [
  { name: 'Cerveau', role: 'Un site, c\'est un cerveau', sub: 'Chaque zone a son rôle. Descendez : je vous montre comment je construis le vôtre.', c: [0, 0, 0], d: .62, a: .5, e: .15 },
  { name: 'Lobe temporal', role: 'Écouter, comprendre → On échange', sub: 'Il traite ce que l\'on entend. Je commence par vous écouter : votre activité, vos clients, vos objectifs.', r: R([.86, -.2, .05], [.32, .4, .62], 1), d: .3, a: 1.45, e: .05 },
  { name: 'Lobe frontal', role: 'Décider, planifier → La stratégie', sub: 'Le centre des décisions. J\'y construis le plan du site : pages, messages, parcours du visiteur.', r: R([0, .3, .64], [1.25, .8, .45]), d: .32, a: .35, e: .25 },
  { name: 'Aire de Broca', role: 'Le langage → Vos contenus', sub: 'Elle met les idées en mots. J\'écris des textes clairs qui donnent envie de vous contacter.', r: R([.8, -.05, .42], [.32, .3, .3]), d: .22, a: 1.05, e: 0 },
  { name: 'Cortex moteur', role: 'Le mouvement → Les fonctionnalités', sub: 'Il commande chaque geste. Devis, commandes, formulaires, WhatsApp : votre site agit pour vous.', r: R([0, .78, .1], [1.25, .38, .17]), d: .3, a: 1.4, e: .75 },
  { name: 'Lobe pariétal', role: 'S\'orienter → La navigation', sub: 'Il nous situe dans l\'espace. Vos visiteurs trouvent tout de suite ce qu\'ils cherchent, sur mobile comme sur ordinateur.', r: R([0, .62, -.38], [1.25, .45, .4]), d: .32, a: 2.2, e: .6 },
  { name: 'Lobe occipital', role: 'La vision → Le design', sub: 'Il traite tout ce que l\'on voit. Le design de votre site inspire confiance au premier regard.', r: R([0, .15, -.9], [1.05, .5, .28]), d: .3, a: 2.85, e: .15 },
  { name: 'Cervelet', role: 'La coordination → La fluidité', sub: 'Il rend chaque mouvement fluide. Votre site s\'ouvre vite et réagit sans à-coups, même en 3G.', r: R([0, -.55, -.68], [.95, .36, .36]), d: .28, a: 3.55, e: -.25 },
  { name: 'Tronc cérébral', role: 'Les fonctions vitales → Hébergement & sécurité', sub: 'Il fait respirer et battre le cœur jour et nuit, sans qu\'on y pense. Votre site reste en ligne et protégé 24h/24.', r: R([0, -.78, -.28], [.3, .45, .32]), d: .24, a: 4.3, e: -.15, xray: 1 },
  { name: 'Hippocampe', role: 'La mémoire → La base de données', sub: 'Il range les souvenirs. Vos contacts, commandes et élèves sont enregistrés et retrouvés en un instant.', r: R([.36, -.25, -.08], [.26, .24, .45], 1), d: .22, a: 4.95, e: .1, xray: 1 },
  { name: 'Corps calleux', role: 'Relier les deux hémisphères → Les connexions', sub: 'Il relie les deux moitiés du cerveau. Je relie votre site à WhatsApp, Google, vos réseaux et vos outils.', r: R([0, .3, -.08], [.16, .22, .66]), d: .24, a: 5.6, e: .55, xray: 1 },
  { name: 'Neurones', role: 'Des milliards de connexions → Vos clients', sub: 'Chaque neurone en réveille d\'autres. Bien référencé, votre site crée sans cesse de nouvelles connexions avec vos clients.', dive: 1, c: [.3, .32, .3], d: .016, a: 6.05, e: .05 },
  { name: 'Site vivant', role: 'Tout le cerveau travaille', sub: 'Chaque zone est prête. Le vôtre est le prochain ?', c: [0, 0, 0], d: .55, a: 6.9, e: .2 }
];
S.forEach(s => { s.c = (s.r ? s.r.c : new THREE.Vector3(...s.c)).clone().multiply(HALF); s.anchor = s.c.clone(); });

const brainG = new THREE.Group(); scene.add(brainG);
let ready = false, brain, prepass, net, cells, deep, dust;

new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('brain.glb', gltf => {
  gltf.scene.traverse(o => { if (o.isMesh && !brain) brain = o; });
  brain.geometry.computeVertexNormals();
  brain.material = glass; brain.renderOrder = 1;
  // pré-passe de profondeur : seule la surface extérieure s'illumine (désactivée pour voir les zones profondes)
  prepass = new THREE.Mesh(brain.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  prepass.renderOrder = 0; brain.add(prepass);
  brainG.add(gltf.scene); brainG.updateMatrixWorld(true);
  net = makeNet(brain);
  cells = makeCells([{ n: 80, inBrain: brain.geometry.attributes.position }]);  // neurones dispersés dans tout le cerveau
  deep = makeCells([{ c: S[11].c, r: .028, n: 46 }]);                         // amas où l'on plonge à la fin
  dust = makeDust(S[11].c, .04, 900);
  ready = true;
  hudT.textContent = 'SCAN · ' + S[0].name.toUpperCase();
}, e => { if (e.total) hudT.textContent = 'CHARGEMENT ' + Math.round(e.loaded / e.total * 100) + '%'; });

const dot = (() => {  // point rond et lumineux
  const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
})();
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

// Réseau à la surface du cortex : points reliés qui s'allument en chaîne
function makeNet(brain) {
  const pos = brain.geometry.attributes.position, N = 260, pts = [], links = [], nb = [];
  for (let i = 0; i < N; i++) { pts.push(new THREE.Vector3().fromBufferAttribute(pos, Math.random() * pos.count | 0).applyMatrix4(brain.matrixWorld).multiplyScalar(1.02)); nb.push([]); }
  const seen = new Set();  // chaque point relié à ses 3 plus proches voisins
  pts.forEach((a, i) => pts.map((b, j) => [a.distanceTo(b), j]).sort((x, y) => x[0] - y[0]).slice(1, 4).forEach(([, j]) => {
    const k = Math.min(i, j) + ',' + Math.max(i, j); if (seen.has(k)) return; seen.add(k);
    links.push(i, j); nb[i].push(j); nb[j].push(i);
  }));
  const pg = new THREE.BufferGeometry().setFromPoints(pts), pc = new Float32Array(N * 3);
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const lg = new THREE.BufferGeometry(), lp = new Float32Array(links.length * 3), lc = new Float32Array(links.length * 3);
  links.forEach((k, i) => pts[k].toArray(lp, i * 3));
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const mat = { vertexColors: true, ...ADD, depthTest: false };
  const P = new THREE.Points(pg, new THREE.PointsMaterial({ size: .003, map: dot, ...mat })), L = new THREE.LineSegments(lg, new THREE.LineBasicMaterial(mat));
  const SP = 400, sg = new THREE.BufferGeometry(), sp = new Float32Array(SP * 3).fill(99), sc = new Float32Array(SP * 3).fill(1);
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const Sk = new THREE.Points(sg, new THREE.PointsMaterial({ size: .003, map: dot, ...mat }));
  P.renderOrder = L.renderOrder = Sk.renderOrder = 3; brainG.add(P, L, Sk);
  return { N, nb, links, pc, lc, pg, lg, pts, sg, sp, sparks: [], t: new Float32Array(N).fill(-1e9), P, L, Sk, on: 1 };
}
function fire(i, now, depth) {
  if (now - net.t[i] < 600) return; net.t[i] = now;
  if (depth > 0) net.nb[i].forEach(j => {
    const dur = 90 + Math.random() * 140;
    if (net.sparks.length < 400) net.sparks.push({ a: i, b: j, t0: now, dur });
    setTimeout(() => fire(j, performance.now(), depth - 1), dur);
  });
}

// Neurones : corps cellulaire + dendrites ramifiées + axone ; l'influx part du noyau et court le long des branches (calculé sur le GPU)
function makeCells(groups) {
  const P = [], A = [], soma = [], seeds = [], rnd = (a, b) => a + Math.random() * (b - a);
  const dir = () => new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
  let id = 0;
  const grow = (p, d, len, depth, s, seed) => {
    const steps = 5, q = p.clone();
    for (let i = 0; i < steps; i++) {
      d.add(dir().multiplyScalar(.45)).normalize();
      const nq = q.clone().addScaledVector(d, len / steps);
      P.push(q.x, q.y, q.z, nq.x, nq.y, nq.z); A.push(s, seed, s + len / steps, seed);
      s += len / steps; q.copy(nq);
    }
    if (depth > 0) for (let k = 0; k < 2; k++) grow(q, d.clone().add(dir().multiplyScalar(.8)).normalize(), len * rnd(.55, .75), depth - 1, s, seed);
  };
  for (const gp of groups) for (let n = 0; n < gp.n; n++) {
    const p = gp.inBrain ? new THREE.Vector3().fromBufferAttribute(gp.inBrain, Math.random() * gp.inBrain.count | 0).applyMatrix4(brain.matrixWorld).multiplyScalar(rnd(.25, .85))  // dans la vraie forme du cerveau
      : gp.c.clone().addScaledVector(dir(), Math.cbrt(Math.random()) * gp.r);
    const seed = Math.random(), L = rnd(.004, .007);
    for (let k = 0, K = 5 + (Math.random() * 3 | 0); k < K; k++) grow(p, dir(), L * rnd(.7, 1.2), 3, 0, seed);
    grow(p, dir(), L * 2.6, 2, 0, seed);  // axone
    soma.push(p.x, p.y, p.z); seeds.push(seed); id++;
  }
  // influx : chaque neurone s'active à son rythme ; un front lumineux part du noyau vers les extrémités
  const DRIFT = 'vec3(sin(uTime * .21 + vSeed * 40.), sin(uTime * .17 + vSeed * 71.), sin(uTime * .19 + vSeed * 93.)) * .0012';  // le neurone dérive lentement
  const FIRE = `float per = 2.2 + fract(seed * 7.31) * 3.5; float t = mod(uTime + seed * 13.7, per);`;
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setAttribute('aS', new THREE.Float32BufferAttribute(A, 2));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    uniforms: { ...U, uOn: { value: 0 } }, ...ADD,
    vertexShader: `uniform float uTime; attribute vec2 aS; varying float vS, vSeed, vD;
      void main(){ vS = aS.x; vSeed = aS.y; vec4 w = modelMatrix * vec4(position, 1.);
        w.xyz += ${DRIFT} + sin(uTime * .9 + position.yzx * 900. + vSeed * 30.) * vS * .06;  // dendrites qui ondulent
        vD = distance(w.xyz, cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime, uOn, uFog; varying float vS, vSeed, vD;
      void main(){ float seed = vSeed; ${FIRE}
        float imp = exp(-pow((vS - t * .03) / .0016, 2.)) * exp(-t * .6);
        float a = (.16 + .5 * exp(-vS / .004) + imp * 4.) * uOn * exp(-uFog * vD);
        gl_FragColor = vec4(vec3(.78, .86, 1.) * a, 1.); }`
  }));
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(soma, 3)); sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const somas = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { ...U, uOn: { value: 0 }, uMap: { value: dot }, uScale: { value: 1 } }, ...ADD,
    vertexShader: `uniform float uTime, uScale; attribute float aSeed; varying float vA, vD;
      void main(){ float seed = aSeed, vSeed = aSeed; ${FIRE} vA = .6 + 3. * exp(-t * 4.);
        vec4 mv = viewMatrix * vec4((modelMatrix * vec4(position, 1.)).xyz + ${DRIFT}, 1.); vD = -mv.z; gl_PointSize = min(.0011 * uScale / vD * (1. + exp(-t * 4.)), 26.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uOn, uFog; varying float vA, vD;
      void main(){ gl_FragColor = vec4(vec3(.85, .9, 1.) * texture2D(uMap, gl_PointCoord).a * vA * uOn * exp(-uFog * vD), 1.); }`
  }));
  lines.material.depthTest = somas.material.depthTest = false;  // visibles à travers le cortex, et de l'intérieur
  lines.renderOrder = somas.renderOrder = 4; lines.frustumCulled = somas.frustumCulled = false;
  brainG.add(lines, somas);
  return { lines, somas };
}
// brume lumineuse et poussière autour des neurones (comme dans un tissu vivant)
function makeDust(c, r, n) {
  const p = [];
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(Math.cbrt(Math.random()) * r).add(c); p.push(v.x, v.y, v.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const fine = new THREE.Points(g, new THREE.PointsMaterial({ size: .00025, map: dot, color: 0x9fb4d8, ...ADD, opacity: 0 }));
  const hp = []; for (let i = 0; i < 14; i++) hp.push(...new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(r * 1.4).add(c).toArray());
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  const haze = new THREE.Points(hg, new THREE.PointsMaterial({ size: .006, map: dot, color: 0x2c3a52, ...ADD, opacity: 0 }));
  fine.material.depthTest = haze.material.depthTest = false;
  fine.renderOrder = haze.renderOrder = 2; brainG.add(fine, haze);
  return { fine, haze };
}

// Texte qui s'écrit lettre par lettre
let typing;
function type(t) { clearInterval(typing); let n = 0; lSub.textContent = ''; typing = setInterval(() => { lSub.textContent = t.slice(0, ++n); if (n >= t.length) clearInterval(typing); }, 18); }

const cur = { c: new THREE.Vector3(), d: 1, a: 0, e: 0 }, mouse = { x: 0, y: 0 };
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
const tmp = new THREE.Vector3(), mobile = matchMedia('(max-width:760px)');  // sur mobile, l'étiquette flottante est masquée : le bandeau donne aussi le rôle
let last = -1, lastFire = 0, reg = null, regOn = 0;

renderer.setAnimationLoop(now => {
  if (ready) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = AV ? 0 : (max > 0 ? scrollY / max : 0) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f)), t = ease(f - i), A = S[i], B = S[i + 1];
    const tc = A.c.clone().lerp(B.c, t), lerp = k => A[k] + (B[k] - A[k]) * t;
    // le zoom suit une échelle logarithmique : la plongée dans les neurones reste douce
    const td = AV ? .42 : Math.exp(Math.log(A.d) + (Math.log(B.d) - Math.log(A.d)) * t);
    const kk = AV ? 1 : .06; cur.c.lerp(tc, kk); cur.d = Math.exp(Math.log(cur.d) + (Math.log(td) - Math.log(cur.d)) * kk); cur.a += (lerp('a') - cur.a) * kk; cur.e += (lerp('e') - cur.e) * kk;
    for (const k in view) view[k] += (user[k] - view[k]) * .15;
    const drag = ptrs.size > 0 || user.yaw !== 0 || user.pitch !== 0;  // la souris ne fait plus bouger la vue une fois le cerveau pivoté
    const dive = 1 - THREE.MathUtils.smoothstep(cur.d, .03, .12);        // 0 dehors → 1 au milieu des neurones
    const ang = cur.a + view.yaw + (AV ? 0 : Math.sin(now / 6000) * .2 + (drag ? 0 : mouse.x * .4) + dive * now / 9000);
    const el = clamp(cur.e + view.pitch - (drag ? 0 : mouse.y * .25), -1.3, 1.3), dd = cur.d * view.zoom * (1 + dive * .25 * Math.sin(now / 4000));  // on flotte entre les neurones
    camera.position.set(cur.c.x + Math.sin(ang) * Math.cos(el) * dd, cur.c.y + Math.sin(el) * dd, cur.c.z + Math.cos(ang) * Math.cos(el) * dd);
    camera.lookAt(cur.c);

    const k = Math.round(f), st = S[k];
    U.uTime.value = now / 1000; U.uFog.value = dive * 55;
    // zone active : la surbrillance s'éteint puis se rallume sur la nouvelle zone
    if (st.r !== reg) { regOn -= .06; if (regOn <= 0) { reg = st.r; regOn = 0; if (reg) { glass.uniforms.uRC.value.copy(reg.c); glass.uniforms.uRS.value.copy(reg.s); glass.uniforms.uSym.value = reg.sym; } } }
    else if (reg) regOn = Math.min(1, regOn + .04);
    glass.uniforms.uReg.value = regOn * (st.xray ? .3 : 1);
    const gu = glass.uniforms.uOn; gu.value += ((st.xray ? .16 : st.r ? .55 : .9) * (1 - dive) - gu.value) * .08;
    prepass.visible = !st.xray && dive < .5;
    const sc = innerHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (const [c, on] of [[cells, .22 + dive * .5], [deep, dive * 2.6]]) { c.lines.material.uniforms.uOn.value = on; c.somas.material.uniforms.uOn.value = on; c.somas.material.uniforms.uScale.value = sc; }
    dust.fine.material.opacity = dive * .9; dust.haze.material.opacity = dive * .5;
    net.P.material.opacity = net.L.material.opacity = net.Sk.material.opacity = 1 - dive;

    // réseau du cortex
    if (now - lastFire > 60) { lastFire = now; fire(Math.random() * net.N | 0, now, 4); }
    for (let n = 0; n < net.N; n++) { const g = Math.max(0, 1 - (now - net.t[n]) / 600); net.pc.fill(1.2 * g + .12, n * 3, n * 3 + 3); }
    net.links.forEach((n, j) => { const g = Math.max(0, 1 - (now - net.t[n]) / 600) * .9 + .05; net.lc.fill(g, j * 3, j * 3 + 3); });
    net.pg.attributes.color.needsUpdate = net.lg.attributes.color.needsUpdate = true;
    net.sparks = net.sparks.filter(s => now - s.t0 < s.dur);
    net.sp.fill(99);
    net.sparks.forEach((s, j) => tmp.lerpVectors(net.pts[s.a], net.pts[s.b], (now - s.t0) / s.dur).toArray(net.sp, j * 3));
    net.sg.attributes.position.needsUpdate = true;

    // étiquette : flèche vers la zone + nom
    if (k !== last) { last = k; lStep.textContent = 'ÉTAPE ' + String(k).padStart(2, '0'); lName.textContent = st.name; lRole.textContent = '→ ' + st.role; type(st.sub); hudT.textContent = (mobile.matches ? st.name.toUpperCase() + ' → ' + st.role : 'SCAN · ' + st.name.toUpperCase()); }
    tmp.copy(st.anchor).project(camera);
    const x = (tmp.x * .5 + .5) * innerWidth, y = (-tmp.y * .5 + .5) * innerHeight, show = Math.abs(f - k) < .3 && tmp.z < 1;
    const right = x < innerWidth * .55 || x - 90 - lbl.offsetWidth < 8, lx = right ? Math.min(x + 90, innerWidth - lbl.offsetWidth - 8) : x - 90, ly = Math.max(90, y - 70);
    lbl.style.opacity = show ? 1 : 0; lLine.style.opacity = show ? 1 : 0;
    lbl.style.transform = `translate(${right ? lx : lx - lbl.offsetWidth}px, ${ly - 22}px)`;
    lLine.setAttribute('d', `M${x},${y} L${right ? x + 60 : x - 60},${ly} L${lx},${ly}`);
    lLine.nextElementSibling.setAttribute('cx', x); lLine.nextElementSibling.setAttribute('cy', y);
    hudB.style.width = (f / (S.length - 1) * 100) + '%';
  }
  composer.render();
});
