/**
 * « Mes réalisations » en 4 écrans (portrait 9:16) : les 4 sites jouent en même temps leur parcours enregistré (scroll.cjs :
 * curseur, clics dans le menu, défilement), puis chacun passe en grand à son tour avec sa fiche, retour au mur et appel final.
 * Contenu et voix : entrée « realisations-4-ecrans » de shorts.json (focus = écran mis en avant), minutage : shorts-timing.json.
 */
import { neuronField } from './neurons.js';
const W = 1080, H = 1920, FRAMES = 660;              // parcours de 44 s à 15 i/s par site
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
const SLUG = { 'Le Glaceur': 'leglaceur', 'AMD Design': 'amddesign', 'Odyssée Games': 'odysseegames', 'LIY10.LEARNING': 'liy10learning' };
const CAT = { 'AMD Design': 'Plans & rendus 3D · Architecture' };   // AMD Design : concepteur de plans

const q = new URLSearchParams(location.search), COVER = q.has('cover');
const [all, timing, list] = await Promise.all([fetch('./shorts.json').then((r) => r.json()), fetch('./shorts-timing.json').then((r) => r.json()), fetch('../../projects.json').then((r) => r.json())]);
const S = all.find((s) => s.id === (q.get('s') || 'realisations-4-ecrans')), T = timing[S.id], N = S.beats.length;
const A = T.starts.map((a) => Math.max(0, a - 0.25)), B = A.map((_, i) => (i < N - 1 ? A[i + 1] : T.dur + 1));
window.__DUR = T.dur;

// mur 2×2 (zone utile : 150 px en haut, 400 px en bas et 140 px à droite laissés à TikTok)
const GX = 44, GY = 600, GW = 435, GAP = 26, ROW = 360, BIG = { x: 44, y: 470, w: 896 };
const P = list.slice(0, 4).map((p, i) => {
  const el = document.createElement('div');
  el.className = 'scr';
  el.innerHTML = `<div class="win"><div class="bar"><i></i><i></i><i></i><span>🔒 ${esc(p.url.replace('https://', '').replace(/\/$/, ''))}</span></div><img alt=""></div><b>${esc(p.name)}</b><em>${esc(CAT[p.name] || p.cat)}</em>`;
  $('#grid').append(el);
  return { p, el, img: el.querySelector('img'), slug: SLUG[p.name], cell: { x: GX + (i % 2) * (GW + GAP), y: GY + Math.floor(i / 2) * ROW, w: GW } };
});

while (!window.__brain || !window.__brain.ready()) await new Promise((r) => setTimeout(r, 100));
const Br = window.__brain, field = neuronField($('#neurons'), W, H, true);
const beatAt = (t) => { let k = 0; while (k < N - 1 && t >= A[k + 1]) k++; return k; };

window.__render = (t) => {
  Br.user.yaw = 0.3 * Math.sin(t * 0.55) + 0.08 * Math.sin(t * 1.3 + 1);
  Br.user.pitch = 0.1 * Math.sin(t * 0.4 + 0.5);
  Br.user.zoom = lerp(1.7, 0.8, smooth(t / 1.6)) * (1 + 0.05 * Math.sin(t * 0.7));
  Br.render(t, 12);
  field(t);
  const k = beatAt(t), cur = S.beats[k], prev = S.beats[Math.max(0, k - 1)], u = smooth((t - A[k]) / 0.8);
  const endF = cur.cta ? smooth((t - A[k]) / 0.6) : 0;
  $('#dim').style.opacity = 0.35 + 0.25 * endF;
  const hf = smooth((t - 0.3) / 0.6) * (k === 0 ? 1 : 1 - u);
  $('#head').style.opacity = hf;
  // le mur tourne doucement ; il recule avant l'appel final
  const ry = 10 * Math.sin(t * 0.35), rx = 5 + 3 * Math.sin(t * 0.8);
  $('#grid').style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${1 - 0.25 * endF}) translateZ(${-200 * endF}px)`;
  $('#grid').style.opacity = 1 - endF;
  const waits = [];
  P.forEach((s, i) => {
    // mise en avant : l'écran choisi passe en grand, les autres s'effacent
    const was = prev.focus === i && k > 0 ? 1 : 0, is = cur.focus === i ? 1 : 0, f = lerp(was, is, u);
    const other = cur.focus != null && cur.focus !== i ? u : (prev.focus != null && prev.focus !== i && k > 0 ? 1 - u : 0);
    const r = { x: lerp(s.cell.x, BIG.x, f), y: lerp(s.cell.y, BIG.y, f), w: lerp(s.cell.w, BIG.w, f) };
    const inF = smooth((t - (1.2 + i * 0.18)) / 0.55);                 // arrivée des écrans un à un
    Object.assign(s.el.style, { left: r.x + 'px', top: r.y + (1 - inF) * (i < 2 ? -120 : 120) + 'px', width: r.w + 'px', zIndex: f > 0.01 ? 5 : 1,
      opacity: inF * (1 - 0.88 * other), transform: `rotateY(${(1 - inF) * (i % 2 ? 40 : -40)}deg)` });
    s.el.querySelector('.bar').style.height = lerp(22, 40, f) + 'px';
    s.el.querySelector('.bar span').style.fontSize = lerp(10, 17, f) + 'px';
    s.el.querySelectorAll('b, em').forEach((e) => (e.style.opacity = 1 - f));
    // parcours du site, en temps réel ; chaque écran part d'un moment différent
    const fr = Math.min(FRAMES - 1, Math.max(0, Math.floor((t - 1.2) * 15 + i * 22)));
    const src = `./scroll/${s.slug}/${String(fr).padStart(5, '0')}.jpg`;
    if (s.img.dataset.src !== src) { s.img.src = src; s.img.dataset.src = src; waits.push(s.img.decode().catch(() => {})); }
  });
  // fiche du site mis en avant
  const fi = cur.focus ?? (k > 0 ? prev.focus : null), ff = cur.focus != null ? u * smooth((B[k] - t) / 0.4) : 0;
  if (fi != null) {
    const p = P[fi].p;
    if ($('#info').dataset.i !== String(fi)) {
      $('#info').dataset.i = fi;
      $('#info').innerHTML = `<b>${esc(p.name)}</b><p class="c">${esc(CAT[p.name] || p.cat)}</p><div class="tags">${p.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`;
    }
  }
  $('#info').style.opacity = ff; $('#info').style.transform = `translateY(${(1 - ff) * 30}px)`;
  $('#end').style.opacity = endF; $('#end').style.transform = `translateY(${(1 - endF) * 30}px)`;
  const si = T.starts.findIndex((a, i) => T.lens[i] && t >= a && t <= a + T.lens[i] + 0.25);
  $('#subs').textContent = si < 0 ? '' : (S.beats[si].sub || S.beats[si].say);
  const cut = A.slice(1).find((a) => t >= a - 0.3 && t < a + 0.26);
  $('#wipe').style.opacity = cut === undefined ? 0 : 1;
  if (cut !== undefined) $('#wipe').style.transform = `translateX(${lerp(-40, W + 40, smooth((t - cut + 0.3) / 0.55))}px)`;
  return Promise.all(waits);   // render.cjs attend le décodage des images des 4 écrans
};

await document.fonts.ready;
if (COVER) {
  document.documentElement.classList.add('is-cover');
  for (let t = A[1] - 2.5; t < A[1] - 0.4; t += 1 / 30) await window.__render(t);
} else await window.__render(0);
window.__ready = true;
