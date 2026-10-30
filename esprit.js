// Fond animé « L'Éveil » : un jeune épéiste et l'esprit géant qui le protège, gravés à l'encre (rouge, noir, os).
// Chaque section du site = un tableau ; le défilement fait fondre l'encre d'un tableau à l'autre.
// La souris laisse une traînée d'encre rouge, décale les plans (parallaxe) et révèle l'esprit caché sous la scène.
// Maintenir le clic hors des liens : l'esprit se manifeste en entier.

const RED = '#d4121e', RED2 = '#8a0812', INK = '#0d0a0a', BONE = '#f1ebe0', VOID = '#140304';
const OVER = 1.12;  // marge des calques pour la parallaxe

const stage = document.getElementById('stage');
const hudT = document.getElementById('hudT'), hudB = document.getElementById('hudB');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fond vidéo : si #stage porte data-fond (lien TikTok ou fichier vidéo), la vidéo remplace les tableaux ;
// la traînée d'encre rouge reste par-dessus.
const fond = (stage.dataset.fond || '').trim();
let video = fond && mountVideo(fond);
function mountVideo(url) {
  let el;
  const id = (url.match(/tiktok\.com\/.*\/video\/(\d+)/) || [])[1];
  if (id) {
    // lecteur officiel TikTok : sans son, en boucle, sans boutons
    el = document.createElement('iframe');
    el.src = `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&muted=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`;
    el.allow = 'autoplay; encrypted-media'; el.title = 'Vidéo de fond'; el.tabIndex = -1;
    // lecteur bloqué (bloqueur de pub, navigateur intégré, réseau) : retour au fond animé
    // (le lecteur TikTok envoie des messages à la page quand il est prêt ; sans message en 10 s, il est bloqué)
    // Le lecteur ignore parfois muted=1 : on lui demande nous-mêmes de couper le son puis de lire
    // (sinon le navigateur bloque la lecture automatique et la vidéo reste figée)
    const say = type => el.contentWindow?.postMessage({ 'x-tiktok-player': true, type, value: null }, '*');
    const start = () => { say('mute'); say('play'); };
    let ok = false; addEventListener('message', e => {
      if (!/tiktok\.com$/.test(new URL(e.origin).hostname)) return;
      if (!ok && !video) showVideo(el);  // le lecteur a fini par répondre : on remet la vidéo
      ok = true; let d = e.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch {}
      if (d?.type === 'onPlayerReady') start();
      if (d?.type === 'onStateChange' && (d.value === 0 || d.value === 2)) start();  // en pause ou finie : on relance
    });
    // au cas où : on relance aussi au premier geste du visiteur
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(t => addEventListener(t, start, { once: true, passive: true }));
    setTimeout(() => { if (!ok) dropVideo(); }, 15000);
  } else if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    el = document.createElement('video');
    Object.assign(el, { src: url, autoplay: true, muted: true, loop: true, playsInline: true });
  } else { console.warn('data-fond : lien non reconnu (il faut le lien complet tiktok.com/@…/video/… ou un .mp4)', url); return null; }
  el.className = 'fond'; stage.prepend(el);
  // crédit de l'auteur de la vidéo
  const who = (url.match(/tiktok\.com\/(@[\w.]+)/) || [])[1];
  if (who) {
    const a = document.createElement('a'); a.className = 'credit-fond'; a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = `Fond : vidéo de ${who} sur TikTok ↗`; document.body.append(a);
  }
  document.querySelector('.hud')?.remove(); document.body.classList.add('fond-video');
  return el;
}
// lecteur muet trop longtemps : fond animé en attendant (la vidéo reste chargée en dessous)
function dropVideo() {
  if (!video) return; video.style.visibility = 'hidden'; video = null;
  document.body.classList.remove('fond-video');
  (window.requestIdleCallback || setTimeout)(warm);
}
function showVideo(el) {
  el.style.visibility = ''; video = el; document.body.classList.add('fond-video');
  main.x.setTransform(1, 0, 0, 1, 0, 0); main.x.clearRect(0, 0, main.c.width, main.c.height);
}

const main = mk(), trail = mk(), frameA = mk(), frameB = mk(), tmp = mk();
const mask = document.createElement('canvas'), mx = mask.getContext('2d');
stage.append(main.c, trail.c);
trail.c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;filter:url(#goo)';
main.c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';

function mk() { const c = document.createElement('canvas'); return { c, x: c.getContext('2d') }; }
function rng(s) { return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t);

/* ---------- Outils de gravure ---------- */

// Hachures parallèles dans un chemin
function hatch(c, path, ang, gap, lw, col, alpha = 1) {
  c.save(); c.clip(path); c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = lw;
  const W = c.canvas.width, H = c.canvas.height, D = Math.hypot(W, H);
  c.translate(W / 2, H / 2); c.rotate(ang); c.beginPath();
  for (let y = -D; y < D; y += gap) { c.moveTo(-D, y); c.lineTo(D, y); }
  c.stroke(); c.restore();
}
// Traits verticaux qui « coulent » (ombres façon gravure)
function drips(c, R, x0, x1, y0, y1, n, col, lw, fromTop = true, alpha = 1) {
  c.save(); c.strokeStyle = col; c.globalAlpha = alpha; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), L = (y1 - y0) * (.15 + R() * R() * .85);
    c.lineWidth = lw * (.4 + R()); c.beginPath();
    if (fromTop) { c.moveTo(x, y0); c.lineTo(x + (R() - .5) * 3, y0 + L); } else { c.moveTo(x, y1); c.lineTo(x + (R() - .5) * 3, y1 - L); }
    c.stroke();
  }
  c.restore();
}
// Fond rouge veiné comme du bois gravé
function grain(c, R, W, H, col = RED) {
  c.fillStyle = col; c.fillRect(0, 0, W, H);
  c.strokeStyle = INK; c.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    let x = R() * W; c.lineWidth = .6 + R() * 2.4; c.globalAlpha = .35 + R() * .5; c.beginPath(); c.moveTo(x, -10);
    for (let y = 0; y <= H + 40; y += 40) { x += (R() - .5) * 26; c.lineTo(x, y); }
    c.stroke();
  }
  c.globalAlpha = 1;
}
// Trait épais qui s'affine le long d'une courbe de Bézier
function taper(c, p, w0, w1, col) {
  const N = 28, L = [], Rr = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6];
    const y = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7];
    const dx = 3 * u * u * (p[2] - p[0]) + 6 * u * t * (p[4] - p[2]) + 3 * t * t * (p[6] - p[4]);
    const dy = 3 * u * u * (p[3] - p[1]) + 6 * u * t * (p[5] - p[3]) + 3 * t * t * (p[7] - p[5]);
    const d = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
    L.push([x - dy / d * w, y + dx / d * w]); Rr.push([x + dy / d * w, y - dx / d * w]);
  }
  c.beginPath(); L.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  Rr.reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.fillStyle = col; c.fill();
}

/* ---------- Personnages (originaux) ---------- */

// L'épéiste. (x, y) = pieds, h = taille, a = rotation, wind = vent dans le repère du perso, pose : low | up
function swordsman(c, R, x, y, h, { a = 0, wind = [1, 0], pose = 'low', back = false } = {}) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(h, h); c.lineJoin = c.lineCap = 'round';
  const [wx, wy] = wind;
  // cheveux au vent
  for (let i = 0; i < 9; i++) {
    const sx = -.04 + R() * .08, sy = -.97 + R() * .06, L = .18 + R() * .16;
    taper(c, [sx, sy, sx + wx * L * .3, sy + wy * L * .3 - .03, sx + wx * L * .7, sy + wy * L * .7 + (R() - .5) * .08, sx + wx * L, sy + wy * L + (R() - .3) * .1], .03, .002, INK);
  }
  // jambes et bottes
  c.fillStyle = INK;
  c.beginPath(); c.moveTo(-.07, -.42); c.lineTo(-.09, 0); c.lineTo(-.03, 0); c.lineTo(-.005, -.4); c.fill();
  c.beginPath(); c.moveTo(.01, -.4); c.lineTo(.06, 0); c.lineTo(.12, 0); c.lineTo(.07, -.42); c.fill();
  // manteau blanc, pans déchirés qui flottent
  const coat = new Path2D(), t = [wx * .18, wy * .18];
  coat.moveTo(-.12, -.8); coat.lineTo(.12, -.8);
  coat.quadraticCurveTo(.15, -.5, .2 + t[0] * .3, -.16 + t[1] * .3);
  for (let i = 0; i < 4; i++) {
    const k = 1 - i / 4, bx = .2 - i * .1, by = -.16;
    coat.lineTo(bx + t[0] * k * 1.6, by + t[1] * k * 1.6 + .02);
    coat.lineTo(bx - .05 + t[0] * k * .6, by - .04 + t[1] * k * .6);
  }
  coat.lineTo(-.18 + t[0] * .2, -.18 + t[1] * .2);
  coat.quadraticCurveTo(-.15, -.5, -.12, -.8); coat.closePath();
  c.fillStyle = BONE; c.fill(coat);
  c.save(); c.clip(coat);
  c.strokeStyle = INK; c.lineWidth = .006;
  for (let i = 0; i < 26; i++) { const xx = .02 + R() * .2; c.beginPath(); c.moveTo(xx, -.8 + R() * .2); c.lineTo(xx + .01, -.1); c.stroke(); }
  c.fillStyle = INK; c.fillRect(-.12, -.52, .26, .025);  // ceinture
  c.restore();
  c.strokeStyle = INK; c.lineWidth = .012; c.stroke(coat);
  // col, cou, tête
  c.fillStyle = INK; c.beginPath(); c.ellipse(0, -.9, .055, .066, 0, 0, 7); c.fill();
  c.fillRect(-.025, -.85, .05, .06);
  c.fillStyle = BONE; c.beginPath(); c.moveTo(-.07, -.81); c.lineTo(0, -.76); c.lineTo(.07, -.81); c.lineTo(.05, -.84); c.lineTo(-.05, -.84); c.fill();
  c.stroke();
  if (!back) { c.fillStyle = BONE; c.globalAlpha = .9; c.fillRect(.008, -.905, .03, .006); c.globalAlpha = 1; }  // reflet du regard
  // bras + sabre
  const [hx, hy, ba] = pose === 'up' ? [.14, -1.04, -1.05] : [.17, -.5, .62];
  taper(c, [.1, -.78, .14, -.7, hx - .02, hy + .06, hx, hy], .055, .04, BONE);
  c.lineWidth = .008; c.stroke();
  const bx = Math.cos(ba), by = Math.sin(ba), BL = .62;
  c.lineCap = 'butt'; c.strokeStyle = INK; c.lineWidth = .028;
  c.beginPath(); c.moveTo(hx - bx * .12, hy - by * .12); c.lineTo(hx, hy); c.stroke();  // poignée
  c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + bx * BL * .6 - by * .02, hy + by * BL * .6 + bx * .02, hx + bx * BL, hy + by * BL);
  c.lineWidth = .02; c.stroke(); c.strokeStyle = BONE; c.lineWidth = .011; c.stroke();  // lame
  c.fillStyle = INK; c.beginPath(); c.ellipse(hx + bx * .01, hy + by * .01, .03, .012, ba + Math.PI / 2, 0, 7); c.fill();  // garde
  // bras gauche
  taper(c, [-.1, -.78, -.15, -.65, -.15, -.55, -.13, -.47], .05, .035, BONE); c.lineWidth = .008; c.stroke();
  c.restore();
}

// L'esprit géant. (x, y) = sommet de la capuche, s = échelle, col = couleur du corps
function spirit(c, R, x, y, s, { col = BONE, arms = 1 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  // couronne de cornes
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * .26, L = .35 + R() * .3 - Math.abs(i - 4) * .04;
    taper(c, [Math.cos(a) * .2, .2 + Math.sin(a) * .2, Math.cos(a) * (.2 + L * .5), .2 + Math.sin(a) * (.2 + L * .5), Math.cos(a + .1) * (.2 + L * .8), .2 + Math.sin(a + .1) * (.2 + L * .8), Math.cos(a + .18) * (.2 + L), .2 + Math.sin(a + .18) * (.2 + L)], .06, .003, col);
  }
  // corps en voile de traits qui coulent
  const body = new Path2D();
  body.moveTo(0, 0); body.bezierCurveTo(.55, 0, .78, .5, 1.05, 1.6); body.lineTo(-1.05, 1.6); body.bezierCurveTo(-.78, .5, -.55, 0, 0, 0);
  c.save(); c.clip(body); c.strokeStyle = col;
  for (let i = 0; i < 520; i++) {
    const xx = -1.05 + R() * 2.1, L = .2 + R() * R() * 1.5; c.globalAlpha = .25 + R() * .75; c.lineWidth = .002 + R() * .008;
    c.beginPath(); c.moveTo(xx, -.05); c.lineTo(xx + (R() - .5) * .03, L); c.stroke();
  }
  c.restore(); c.globalAlpha = 1;
  // creux du visage + masque
  c.fillStyle = VOID; c.beginPath(); c.ellipse(0, .36, .3, .27, 0, 0, 7); c.fill();
  const m = new Path2D(); m.ellipse(0, .38, .19, .235, 0, 0, 7);
  c.fillStyle = col; c.fill(m);
  hatch(c, m, .9, .018, .004, INK, .55);
  c.strokeStyle = INK; c.lineWidth = .008;
  c.beginPath(); c.moveTo(-.02, .15); c.lineTo(.03, .26); c.lineTo(-.01, .33); c.lineTo(.04, .44); c.stroke();  // fêlure
  c.beginPath(); c.moveTo(-.13, .5); c.quadraticCurveTo(0, .58, .13, .5); c.lineWidth = .012; c.stroke();  // sourire
  for (let i = -5; i <= 5; i++) { const xx = i * .024, yy = .5 + .08 * (1 - (i / 5.4) ** 2) * .5; c.beginPath(); c.moveTo(xx, yy - .025); c.lineTo(xx, yy + .025); c.lineWidth = .005; c.stroke(); }
  c.fillStyle = INK; [-1, 1].forEach(k => { c.beginPath(); c.ellipse(k * .08, .34, .055, .028, k * .25, 0, 7); c.fill(); });
  // bras immenses
  if (arms) [-1, 1].forEach(k => {
    taper(c, [k * .7, .75, k * 1.25, .7, k * 1.1, 1.25, k * .45, 1.3], .2, .1, col);
    for (let f = 0; f < 4; f++) {
      const fy = 1.22 + f * .035, fx = k * .46;
      taper(c, [fx, fy, fx - k * .1, fy - .05 + f * .02, fx - k * .2, fy + .02 + f * .03, fx - k * (.26 + f * .02), fy - .06 + f * .05], .04, .004, col);
    }
    c.save(); c.strokeStyle = INK; c.globalAlpha = .5; c.lineWidth = .006;
    for (let i = 0; i < 14; i++) { const t = i / 14; c.beginPath(); c.moveTo(k * (.75 + .45 * Math.sin(t * 3)), .74 + t * .5); c.lineTo(k * (.8 + .45 * Math.sin(t * 3)), .8 + t * .5); c.stroke(); }
    c.restore();
  });
  c.restore();
  return { eyes: [[x - .08 * s, y + .34 * s], [x + .08 * s, y + .34 * s]], r: .05 * s };
}

// Œil gravé : contour, iris, cils. Le regard (lx, ly ∈ [-1,1]) est dessiné à chaque image
function eyeShape(c, x, y, w) {
  const h = w * .36, p = new Path2D();
  p.moveTo(x - w / 2, y); p.bezierCurveTo(x - w / 4, y - h * 1.1, x + w / 4, y - h * 1.2, x + w / 2, y - h * .1);
  p.bezierCurveTo(x + w / 4, y + h * .8, x - w / 4, y + h * .75, x - w / 2, y); return p;
}
function eyeStatic(c, R, x, y, w) {
  const p = eyeShape(c, x, y, w), h = w * .36;
  c.fillStyle = BONE; c.fill(p);
  // paupière, cils, sourcil
  c.strokeStyle = INK; c.lineCap = 'round';
  c.lineWidth = w * .045; c.beginPath(); c.moveTo(x - w / 2, y); c.bezierCurveTo(x - w / 4, y - h * 1.1, x + w / 4, y - h * 1.2, x + w / 2, y - h * .1); c.stroke();
  c.lineWidth = w * .012; c.stroke(p);
  for (let i = 0; i < 14; i++) { const t = i / 13, ex = x - w / 2 + t * w, ey = y - h * Math.sin(t * Math.PI) * 1.05; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + w * (.02 + t * .05), ey - h * (.25 + R() * .2)); c.stroke(); }
  const brow = new Path2D(); brow.moveTo(x - w * .6, y - h * 1.6); brow.quadraticCurveTo(x, y - h * 2.6, x + w * .65, y - h * 1.9); brow.lineTo(x + w * .6, y - h * 1.6); brow.quadraticCurveTo(x, y - h * 2.2, x - w * .6, y - h * 1.6);
  c.fillStyle = INK; c.fill(brow);
  for (let i = 0; i < 40; i++) { const ex = x - w * .7 + R() * w * 1.4; c.lineWidth = w * .006; c.beginPath(); c.moveTo(ex, y - h * 1.5); c.lineTo(ex + 2, y - h * (.9 + R() * .3)); c.globalAlpha = .4; c.stroke(); }
  c.globalAlpha = 1;
}
function eyeLive(c, x, y, w, lx, ly, irisCol = '#7a5a2a') {
  const p = eyeShape(c, x, y, w), r = w * .2;
  c.save(); c.clip(p);
  const ix = x + lx * w * .2, iy = y + ly * w * .08 - w * .03;
  c.fillStyle = irisCol; c.beginPath(); c.arc(ix, iy, r, 0, 7); c.fill();
  c.strokeStyle = INK; c.lineWidth = w * .006; c.globalAlpha = .7;
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; c.beginPath(); c.moveTo(ix + Math.cos(a) * r * .4, iy + Math.sin(a) * r * .4); c.lineTo(ix + Math.cos(a) * r, iy + Math.sin(a) * r); c.stroke(); }
  c.globalAlpha = 1; c.lineWidth = w * .015; c.beginPath(); c.arc(ix, iy, r, 0, 7); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.arc(ix, iy, r * .42, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(ix - r * .3, iy - r * .35, r * .17, 0, 7); c.fill();
  c.restore();
}

/* ---------- Les tableaux (un par section) ---------- */
// Chaque tableau dessine 4 calques : bg, mid, fg (la scène) et sp (le monde de l'esprit, révélé par la souris).
// live() dessine ce qui bouge à chaque image (yeux qui suivent la souris…), en coordonnées écran.

const SCENES = [
  { name: 'I · La lune', draw(L, W, H, R) {
      const m = Math.min(W, H), cx = W * .64, cy = H * .42, r = m * .3;
      L.bg.fillStyle = BONE; L.bg.fillRect(0, 0, W, H);
      drips(L.bg, R, 0, W, 0, H * .35, 260, INK, 1.2, true, .5);
      const moon = new Path2D(); moon.arc(cx, cy, r, 0, 7);
      L.bg.fillStyle = RED; L.bg.fill(moon);
      L.bg.save(); L.bg.clip(moon); hatch(L.bg, new Path2D(`M0 ${cy + r * .2}H${W}V${H}H0Z`), -.5, 5, 1.4, RED2, .9); L.bg.restore();
      // anneau du temple + colonnade
      const c = L.mid; c.lineWidth = m * .035; c.strokeStyle = BONE; c.beginPath(); c.arc(cx, cy, r * 1.12, 0, 7); c.stroke();
      c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.arc(cx, cy, r * 1.12 + m * .0175, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, r * 1.12 - m * .0175, 0, 7); c.stroke();
      for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; c.beginPath(); c.moveTo(cx + Math.cos(a) * (r * 1.12 - m * .017), cy + Math.sin(a) * (r * 1.12 - m * .017)); c.lineTo(cx + Math.cos(a) * (r * 1.12 + m * .017), cy + Math.sin(a) * (r * 1.12 + m * .017)); c.lineWidth = 1; c.stroke(); }
      const top = H * .7, cw = W / 11;
      c.fillStyle = BONE; c.fillRect(0, top - H * .03, W, H * .03); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-5, top - H * .03, W + 10, H * .03);
      for (let i = 0; i < 12; i++) {
        const x = i * cw - cw * .2, col = new Path2D(); col.rect(x, top, cw * .55, H - top);
        c.fillStyle = BONE; c.fill(col); hatch(c, new Path2D(`M${x + cw * .3} ${top}h${cw * .25}V${H}h-${cw * .25}Z`), Math.PI / 2, 3, 1, INK, .8);
        c.lineWidth = 1.5; c.stroke(col);
        drips(c, R, x + cw * .55, x + cw, top, H, 30, INK, 1.4, true, .9);
      }
      drips(c, R, 0, W, H * .88, H, 300, INK, 2, false);
      swordsman(L.fg, R, cx, top - H * .03, H * .34, { wind: [1, -.15] });
      // monde de l'esprit
      const s = L.sp; s.fillStyle = VOID; s.fillRect(0, 0, W, H);
      drips(s, R, 0, W, 0, H, 380, RED2, 2, true, .8);
      s.fillStyle = RED; s.beginPath(); s.arc(cx, cy, r, 0, 7); s.fill();
      this.sp = spirit(s, R, cx, cy - r * 1.05, m * .62);
    } },
  { name: 'II · Le pacte', draw(L, W, H, R) {
      grain(L.bg, R, W, H);
      const c = L.mid, y0 = H * .28, y1 = H * .62, ew = Math.min(W * .2, H * .3);
      c.fillStyle = BONE; c.fillRect(0, y0, W, y1 - y0);
      drips(c, R, 0, W, y0, y1, 500, INK, 1, true, .45);
      c.fillStyle = INK; c.fillRect(0, y0 - 4, W, 8); c.fillRect(0, y1 - 4, W, 8);
      this.eyes = [[W * .5 - ew * .85, (y0 + y1) / 2 + ew * .06], [W * .5 + ew * .85, (y0 + y1) / 2 + ew * .06]];
      this.ew = ew;
      // mèches qui tombent devant le regard
      for (let i = 0; i < 70; i++) { const x = W * .2 + R() * W * .6; taper(c, [x, y0, x + 6, y0 + 30, x - 8, y0 + 60 + R() * 60, x + (R() - .5) * 20, y0 + 40 + R() * (y1 - y0) * .4], 6 + R() * 6, .5, INK); }
      // le sabre en travers
      const f = L.fg; f.save(); f.translate(W * .1, H * .86); f.rotate(-.1);
      f.fillStyle = INK; f.fillRect(-W * .2, -10, W * .22, 20); f.beginPath(); f.ellipse(W * .02, 0, 12, 34, 0, 0, 7); f.fill();
      f.beginPath(); f.moveTo(W * .03, -9); f.quadraticCurveTo(W * .5, -26, W * 1.1, -40); f.lineTo(W * 1.1, -26); f.quadraticCurveTo(W * .5, -8, W * .03, 9); f.closePath(); f.fillStyle = BONE; f.fill(); f.lineWidth = 3; f.stroke();
      f.restore();
      const s = L.sp; s.fillStyle = VOID; s.fillRect(0, 0, W, H); drips(s, R, 0, W, 0, H, 300, RED2, 2.5, false, .8);
      this.sp = spirit(s, R, W * .5, (y0 + y1) / 2 - H * .95 * .34, H * .95, { arms: 0 });
    },
    live(c, W, H, st, o) { this.eyes.forEach(([x, y]) => eyeLive(c, x + o[0], y + o[1], this.ew, st.lx, st.ly)); } },
  { name: 'III · Le couloir', draw(L, W, H, R) {
      const b = L.bg, vx = W * .5, vy = H * .48;
      b.fillStyle = RED; b.fillRect(0, 0, W, H);
      drips(b, R, 0, W, 0, H * .7, 700, INK, 1.6, true, .85);
      b.fillStyle = BONE; b.fillRect(vx - W * .045, vy - H * .16, W * .09, H * .2);  // porte lumineuse
      b.beginPath(); b.arc(vx, vy - H * .16, W * .045, Math.PI, 0); b.fill();
      // sol en perspective
      b.fillStyle = RED2; b.beginPath(); b.moveTo(0, H); b.lineTo(vx - W * .05, vy + H * .04); b.lineTo(vx + W * .05, vy + H * .04); b.lineTo(W, H); b.fill();
      b.strokeStyle = INK; b.lineWidth = 1; for (let i = -14; i <= 14; i++) { b.beginPath(); b.moveTo(vx + i * W * .004, vy + H * .04); b.lineTo(vx + i * W * .09, H); b.stroke(); }
      // colonnades qui fuient vers la porte
      const c = L.mid;
      [-1, 1].forEach(k => { for (let i = 7; i >= 0; i--) {
        const z = 1 / (1 + i * .55), x = vx + k * W * (.08 + .5 * z), w = W * .07 * z, top = vy - H * .7 * z, bot = vy + H * .55 * z;
        c.fillStyle = INK; c.fillRect(x - w / 2, top, w, bot - top);
        c.fillStyle = RED; c.fillRect(x - w / 2 + w * (k > 0 ? .1 : .55), top, w * .35, bot - top);
        drips(c, R, x - w / 2, x + w / 2, top, bot, 18, INK, 1.5 * z + .5, true, .9);
        c.fillStyle = INK; c.fillRect(x - w * .7, top - 8 * z, w * 1.4, 14 * z); c.fillRect(x - w * .7, bot - 6 * z, w * 1.4, 14 * z);
      } });
      swordsman(L.fg, R, vx, H * .9, H * .42, { back: true, wind: [.6, -.1] });
      const s = L.sp; s.fillStyle = VOID; s.fillRect(0, 0, W, H); drips(s, R, 0, W, 0, H, 420, RED2, 2, true, .9);
      this.sp = spirit(s, R, vx, vy - H * .42, H * .75);
    } },
  { name: 'IV · La chute', draw(L, W, H, R) {
      const b = L.bg, cx = W * .5, cy = H * .5, m = Math.max(W, H);
      b.fillStyle = BONE; b.fillRect(0, 0, W, H);
      // tourbillon d'encre
      for (let i = 0; i < 260; i++) {
        const a0 = R() * 6.283, r0 = m * (.12 + R() * .6), span = .4 + R() * 1.4, w = 2 + R() * 22 * (r0 / m);
        b.strokeStyle = INK; b.globalAlpha = .55 + R() * .45; b.lineWidth = w; b.lineCap = 'round'; b.beginPath();
        for (let t = 0; t <= 1; t += .05) { const a = a0 + span * t, rr = r0 * (1 - t * .25); t ? b.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8) : b.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8); }
        b.stroke();
      }
      b.globalAlpha = 1;
      const g = b.createRadialGradient(cx, cy, 0, cx, cy, m * .22); g.addColorStop(0, BONE); g.addColorStop(1, 'rgba(241,235,224,0)');
      b.fillStyle = g; b.fillRect(0, 0, W, H);
      // éclats rouges
      const c = L.mid; for (let i = 0; i < 40; i++) { const a = R() * 6.283, rr = m * (.1 + R() * .35); taper(c, [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a + .1) * rr * 1.1, cy + Math.sin(a + .1) * rr * 1.1, cx + Math.cos(a + .2) * rr * 1.2, cy + Math.sin(a + .2) * rr * 1.2, cx + Math.cos(a + .3) * rr * 1.3, cy + Math.sin(a + .3) * rr * 1.3], 4 + R() * 10, 0, RED); }
      const ang = 2.6;
      swordsman(L.fg, R, cx - H * .12, cy - H * .2, H * .4, { a: ang, pose: 'up', wind: [Math.cos(-ang - 1.57) * -1, Math.sin(-ang - 1.57) * -1] });
      const s = L.sp; s.fillStyle = RED; s.fillRect(0, 0, W, H); drips(s, R, 0, W, 0, H, 500, RED2, 2.5, false, .9);
      this.sp = spirit(s, R, cx, H * .1, H * .78, { col: INK });
    } },
  { name: "V · L'éveil", draw(L, W, H, R) {
      grain(L.bg, R, W, H);
      const c = L.mid;
      // colonnes brisées en travers, éclats qui volent
      [[.08, .2, .45], [.62, .05, -.35], [.85, .55, .25]].forEach(([x, y, a]) => {
        c.save(); c.translate(W * x, H * y); c.rotate(a); const w = W * .09, h = H * .9;
        const p = new Path2D(); p.moveTo(0, 0); p.lineTo(w, -h * .02); p.lineTo(w * 1.02, h * .8); for (let i = 0; i < 6; i++) p.lineTo(w - i * w / 5, h * .8 + (i % 2 ? 18 : -10)); p.closePath();
        c.fillStyle = BONE; c.fill(p); hatch(c, p, Math.PI / 2, 4, 1.2, INK, .7);
        c.fillStyle = BONE; c.fillRect(w * .2, 0, w * .3, h * .79); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke(p);
        c.fillStyle = INK; c.fillRect(-w * .15, -16, w * 1.3, 18);
        c.restore();
      });
      for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H, z = 6 + R() * 22; c.fillStyle = BONE; c.beginPath(); c.moveTo(x, y); c.lineTo(x + z, y + z * .3); c.lineTo(x + z * .4, y + z); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(); }
      c.fillStyle = BONE; c.fillRect(W * .38, H * .78, W * .24, H * .04); c.fillRect(W * .41, H * .82, W * .18, H * .2);
      hatch(c, new Path2D(`M${W * .5} ${H * .82}h${W * .09}v${H * .2}h-${W * .09}Z`), Math.PI / 2, 3, 1, INK, .8);
      c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(W * .38, H * .78, W * .24, H * .04);
      swordsman(L.fg, R, W * .5, H * .78, H * .4, { pose: 'up', wind: [1, -.25] });
      const s = L.sp; s.fillStyle = VOID; s.fillRect(0, 0, W, H); drips(s, R, 0, W, 0, H, 420, RED, 2, true, .7);
      this.sp = spirit(s, R, W * .5, H * .05, H * .82);
    } },
];

/* ---------- Mise en page, cache des tableaux ---------- */

let W, H, dpr, CW, CH;
const cache = new Map();
function size() {
  dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
  CW = Math.ceil(W * OVER); CH = Math.ceil(H * OVER);
  for (const k of [main, frameA, frameB, tmp]) { k.c.width = W * dpr; k.c.height = H * dpr; }
  trail.c.width = W; trail.c.height = H;
  mask.width = Math.ceil(W / 4); mask.height = Math.ceil(H / 4);
  cache.clear();
}
function layers(i) {
  if (cache.has(i)) return cache.get(i);
  const L = {}, S = Object.create(SCENES[i]);
  for (const k of ['bg', 'mid', 'fg', 'sp']) { const c = document.createElement('canvas'); c.width = CW * dpr; c.height = CH * dpr; L[k] = c.getContext('2d'); L[k].scale(dpr, dpr); }
  S.draw(L, CW, CH, rng(1000 + i * 77));
  const e = { L, S }; cache.set(i, e);
  // au plus 3 tableaux en mémoire (sinon le navigateur perd des canvas, surtout sur mobile)
  while (cache.size > 3) cache.delete([...cache.keys()].reduce((f, k) => Math.abs(k - i) > Math.abs(f - i) ? k : f));
  return e;
}

/* ---------- Souris : parallaxe, traînée d'encre, révélation ---------- */

const st = { x: -1, y: -1, lx: 0, ly: 0, px: 0, py: 0, hold: 0, holding: false, last: 0 };
let drops = [], idle = 0;
function paint(x, y, r, a = 1) {
  const g = mx.createRadialGradient(x / 4, y / 4, 0, x / 4, y / 4, r / 4);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .8})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  mx.fillStyle = g; mx.beginPath(); mx.arc(x / 4, y / 4, r / 4, 0, 7); mx.fill();
}
function move(x, y) {
  if (st.x >= 0 && !calm) {
    const d = Math.hypot(x - st.x, y - st.y), n = Math.min(12, Math.ceil(d / 14));
    for (let i = 1; i <= n; i++) {
      const px = st.x + (x - st.x) * i / n, py = st.y + (y - st.y) * i / n;
      paint(px + (Math.random() - .5) * 30, py + (Math.random() - .5) * 30, 80 + Math.min(d, 120), .5);
      drops.push({ x: px, y: py, r: 5 + Math.min(d, 60) * .22 + Math.random() * 5, vx: (x - st.x) * .02, vy: (y - st.y) * .02 });
    }
  }
  st.x = x; st.y = y; st.last = performance.now();
}
addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', e => {
  if (e.target.closest('a,button,input,textarea,select,label,.card')) return;
  st.holding = true; move(e.clientX, e.clientY);
});
['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, () => { st.holding = false; }));
addEventListener('scroll', () => { if (st.holding && matchMedia('(pointer:coarse)').matches) st.holding = false; }, { passive: true });

/* ---------- Défilement : quel tableau, où en est la fonte d'encre ---------- */

const sections = ['.hero', '#services', '#portfolio', '#methode', '#contact'].map(q => document.querySelector(q));
function where() {
  const y = scrollY + H / 2, a = sections.map(s => s ? s.offsetTop + s.offsetHeight / 2 : 0);
  if (y <= a[0]) return [0, 0];
  for (let i = 0; i < a.length - 1; i++) if (y < a[i + 1]) return [i, (y - a[i]) / (a[i + 1] - a[i])];
  return [a.length - 1, 0];
}

/* ---------- Composition ---------- */

function compose(out, i, t, reveal) {
  const { L, S } = layers(i), c = out.x;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, out.c.width, out.c.height);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const shake = st.hold > .6 ? (Math.random() - .5) * 10 * (st.hold - .6) : 0;
  const off = d => [-(CW - W) / 2 - st.px * (CW - W) / 2 * d + shake * d, -(CH - H) / 2 - st.py * (CH - H) / 2 * d - (t - .3) * 24 * d];
  const at = (k, d) => { const [x, y] = off(d); c.drawImage(L[k].canvas, x, y, CW, CH); };
  at('bg', .25); at('mid', .55);
  if (reveal) {
    const q = tmp.x; q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, tmp.c.width, tmp.c.height);
    q.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [x, y] = off(.4); q.drawImage(L.sp.canvas, x, y, CW, CH);
    // yeux de l'esprit : braises qui suivent la souris
    const sp = S.sp; if (sp) sp.eyes.forEach(([ex, ey]) => {
      const gx = ex + x + st.lx * sp.r * .5, gy = ey + y + st.ly * sp.r * .3, g = q.createRadialGradient(gx, gy, 0, gx, gy, sp.r * 1.6);
      g.addColorStop(0, '#fff'); g.addColorStop(.25, RED); g.addColorStop(1, 'rgba(212,18,30,0)');
      q.fillStyle = g; q.beginPath(); q.arc(gx, gy, sp.r * 1.6, 0, 7); q.fill();
    });
    // le masque flou passe par un seuil (filtre #ink) : bords nets et baveux, comme de l'encre
    q.globalCompositeOperation = 'destination-in'; q.setTransform(1, 0, 0, 1, 0, 0);
    q.filter = 'url(#ink)'; q.drawImage(mask, 0, 0, tmp.c.width, tmp.c.height); q.filter = 'none';
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tmp.c, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  at('fg', 1);
  if (S.live) S.live(c, CW, CH, st, off(.55));
}

const N = 160, seed = rng(9), drift = Array.from({ length: N }, () => seed());
for (let k = 0; k < 3; k++) for (let i = 1; i < N - 1; i++) drift[i] = (drift[i - 1] + drift[i] + drift[i + 1]) / 3;
function melt(k) {
  const c = main.x, w = main.c.width, h = main.c.height, sw = w / N;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(frameA.c, 0, 0);
  c.fillStyle = INK;
  for (let i = 0; i < N; i++) {
    const r = clamp(k * 1.6 - drift[i] * .6), y = r * h, x = Math.floor(i * sw), ww = Math.ceil(sw) + 1;
    if (y > 0) c.drawImage(frameB.c, x, 0, ww, y, x, 0, ww, y);
    if (r > 0 && r < 1) c.fillRect(x, y - 2, ww, 4 + 14 * drift[(i * 7) % N] * dpr);
  }
}

function inkTrail() {
  const c = trail.x; c.clearRect(0, 0, W, H); c.fillStyle = RED;
  drops = drops.filter(d => d.r > .8);
  for (const d of drops) { d.x += d.vx; d.y += d.vy; d.vy += .06; d.vx *= .96; d.r *= .975; c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.fill(); }
  if (drops.length > 600) drops.splice(0, drops.length - 600);
}

let lastName = '';
function frame(now) {
  // souris lissée ; sans souris depuis 4 s (mobile), un « fantôme » se promène doucement
  if (now - st.last > 4000) {
    idle += .006; const gx = W * (.5 + .32 * Math.sin(idle * 1.3)), gy = H * (.5 + .25 * Math.sin(idle * 2.1 + 1));
    if (!calm) paint(gx, gy, 90, .12);
    st.lx += ((gx / W * 2 - 1) - st.lx) * .03; st.ly += ((gy / H * 2 - 1) - st.ly) * .03;
  } else { st.lx += ((st.x / W * 2 - 1) - st.lx) * .08; st.ly += ((st.y / H * 2 - 1) - st.ly) * .08; }
  st.px += (st.lx - st.px) * .06; st.py += (st.ly - st.py) * .06;
  // maintenir : l'esprit se manifeste
  st.hold = clamp(st.hold + (st.holding ? .012 : -.02));
  mx.globalCompositeOperation = 'destination-out'; mx.fillStyle = `rgba(0,0,0,${st.holding ? .01 : .03})`; mx.fillRect(0, 0, mask.width, mask.height);
  mx.globalCompositeOperation = 'source-over';
  if (st.hold > 0) paint(st.x < 0 ? W / 2 : st.x, st.y < 0 ? H / 2 : st.y, ease(st.hold) * Math.hypot(W, H) * 1.1, .35);

  inkTrail();
  if (video) { requestAnimationFrame(frame); return; }
  const [i, t] = where(), k = calm ? (t > .8 ? 1 : 0) : ease(clamp((t - .55) / .45));
  if (k > 0 && i < SCENES.length - 1) { compose(frameA, i, t, 1); compose(frameB, i + 1, 0, 1); melt(k); }
  else compose(main, i, t, 1);

  const cur = SCENES[k > .5 ? i + 1 : i];
  if (hudT && cur.name !== lastName) { lastName = cur.name; hudT.textContent = cur.name.toUpperCase(); }
  if (hudB) hudB.style.width = ((i + t) / (SCENES.length - 1) * 100) + '%';
  requestAnimationFrame(frame);
}

size();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(size, 150); });
// pré-dessine le tableau suivant pendant les temps morts
const warm = () => { const [i] = where(); [i, i + 1].filter(j => j < SCENES.length && !cache.has(j)).forEach(j => layers(j)); };
if (!video) (window.requestIdleCallback || setTimeout)(warm);
addEventListener('scroll', () => { if (!video) (window.requestIdleCallback || setTimeout)(warm); }, { passive: true });
requestAnimationFrame(frame);
