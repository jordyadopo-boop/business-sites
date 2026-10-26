/**
 * Shorts TikTok (1080×1920) : même cerveau 3D et même charte que la vidéo de présentation, contenu lu dans shorts.json
 * et minutage des phrases dans shorts-timing.json (écrit par shorts.py). window.__render(t) cale chaque image sur t.
 */
import { neuronField } from './neurons.js';
const W = 1080, H = 1920;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
const red = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="red">$1</span>');   // *mot* en rouge

const q = new URLSearchParams(location.search), COVER = q.has('cover');
const [all, timing] = await Promise.all([fetch('./shorts.json').then((r) => r.json()), fetch('./shorts-timing.json').then((r) => r.json())]);
const S = all.find((s) => s.id === q.get('s')) || all[0], T = timing[S.id];
const N = S.beats.length, FRAMES = 660;   // parcours enregistré par site (scroll.cjs : 44 s à 15 i/s)
// la carte d'une phrase apparaît un peu avant la voix et reste jusqu'à la phrase suivante
const A = T.starts.map((a) => Math.max(0, a - 0.25)), B = A.map((_, i) => (i < N - 1 ? A[i + 1] : T.dur + 1));
window.__DUR = T.dur;

$('#series').textContent = S.series;
const cards = S.beats.map((b) => {
  const el = document.createElement('div'), c = b.card;
  if (b.cta || b.project) return null;
  if (c.big) { el.className = 'card card--big'; el.innerHTML = `<p class="k">${esc(c.k)}</p><p class="t">${red(c.t)}</p>${c.p ? `<p class="p">${esc(c.p)}</p>` : ''}`; }
  else {
    el.className = 'card card--box';
    el.innerHTML = `<div class="zone__frame"><i></i><i></i><i></i><i></i></div>${c.n ? `<span class="n">${c.n}</span>` : ''}<p class="zone__n">${esc(c.k)}</p>${c.f ? `<p class="zone__f">${esc(c.f)}</p>` : ''}<h2 class="zone__t">${red(c.t)}</h2>${c.p ? `<p class="zone__p">${esc(c.p)}</p>` : ''}`;
  }
  $('#cards').append(el); return el;
});
const projs = S.beats.map((b) => {
  if (!b.project) return null;
  const p = b.project, el = document.createElement('div');
  el.className = 'card card--proj';
  el.innerHTML = `<b>${esc(p.name)}</b><p class="c">${esc(p.cat)}</p><div class="tags">${p.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div><p class="u">→ ${esc(p.url)}</p>`;
  $('#cards').append(el); return el;
});
if (COVER) {
  document.documentElement.classList.add('is-cover');
  $('#cover .k').textContent = S.cover.k; $('#cover .t').innerHTML = red(S.cover.t); $('#cover .p').textContent = S.cover.p || '';
}

while (!window.__brain || !window.__brain.ready()) await new Promise((r) => setTimeout(r, 100));
const Br = window.__brain, field = neuronField($('#neurons'), W, H, true);
await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));

// cerveau : étape et zoom par phrase ; zone voisine = glissement, sinon coupe franche (masquée par le balayage rouge)
const beatAt = (t) => { let k = 0; while (k < N - 1 && t >= A[k + 1]) k++; return k; };
function brainAt(t) {
  const k = beatAt(t), b = S.beats[k].brain, p = S.beats[Math.max(0, k - 1)].brain, u = smooth((t - A[k]) / 1.4);
  const step = k && Math.abs(b.step - p.step) <= 1 ? lerp(p.step, b.step, u) : b.step;
  let zoom = k ? lerp(p.zoom, b.zoom, u) : b.zoom;
  if (k === 0) zoom = lerp(1.7, b.zoom, smooth(t / 1.6));                 // plongée sur le cerveau à l'ouverture
  return { step, zoom, dim: k ? lerp(p.dim || 0, b.dim || 0, u) : (b.dim || 0) };
}

window.__render = (t) => {
  const st = brainAt(t);
  // le cerveau ne s'arrête jamais : balancement, légère orbite verticale et zoom qui respire
  Br.user.yaw = 0.3 * Math.sin(t * 0.55) + 0.08 * Math.sin(t * 1.3 + 1);
  Br.user.pitch = 0.1 * Math.sin(t * 0.4 + 0.5);
  Br.user.zoom = st.zoom * (1 + 0.05 * Math.sin(t * 0.7));
  Br.render(t, st.step);
  field(t);
  $('#dim').style.opacity = st.dim;
  const fade = (i) => smooth((t - A[i]) / 0.5) * smooth((B[i] - t) / 0.3);
  cards.forEach((el, i) => { if (!el) return; const f = fade(i); el.style.opacity = f; el.style.transform = `translateY(${(1 - smooth((t - A[i]) / 0.5)) * 34}px)`; });
  projs.forEach((el, i) => { if (!el) return; const f = fade(i); el.style.opacity = f; el.style.transform = `translateY(${(1 - smooth((t - A[i]) / 0.5)) * 34}px)`; });
  // navigateur 3D : visible pendant les phrases « réalisation », capture qui glisse doucement
  const pk = beatAt(t), P = S.beats[pk].project;
  let so = 0;
  S.beats.forEach((b, i) => { if (b.project) so = Math.max(so, fade(i)); });
  $('#site').style.opacity = so;
  let wait = null;
  if (P) {
    // petite vidéo du parcours du site (scroll.cjs : curseur, clics, défilement), lue en temps réel depuis la première phrase sur ce site
    let a = pk;
    while (a > 0 && S.beats[a - 1].project?.name === P.name) a--;
    const fr = Math.min(FRAMES - 1, Math.max(0, Math.floor((t - A[a]) * 15)));
    const src = P.scroll ? `./scroll/${P.scroll}/${String(fr).padStart(5, '0')}.jpg` : '../../' + P.img;
    const shot = $('#shot');
    if (shot.dataset.src !== src) { shot.src = src; shot.dataset.src = src; wait = shot.decode().catch(() => {}); }
    $('#url').textContent = '🔒 ' + P.url;
    const v = clamp((t - A[pk]) / (B[pk] - A[pk]));
    $('#browser').style.transform = `rotateX(${8 - 4 * v}deg) rotateY(${-12 + 20 * v}deg) scale(.9)`;
  }
  // appel final
  const ce = N - 1, cf = smooth((t - A[ce]) / 0.6);
  $('#end').style.opacity = S.beats[ce].cta ? cf : 0;
  $('#end').style.transform = `translateY(${(1 - cf) * 30}px)`;
  // sous-titres
  const si = T.starts.findIndex((a, i) => t >= a && t <= a + T.lens[i] + 0.25);
  $('#subs').textContent = si < 0 ? '' : (S.beats[si].sub || S.beats[si].say);
  // balayage rouge à chaque nouvelle phrase
  const cut = A.slice(1).find((a) => t >= a - 0.3 && t < a + 0.26);
  $('#wipe').style.opacity = cut === undefined ? 0 : 1;
  if (cut !== undefined) $('#wipe').style.transform = `translateX(${lerp(-40, W + 40, smooth((t - cut + 0.3) / 0.55))}px)`;
  return wait;   // render.cjs attend que l'image du défilement soit décodée avant la capture
};

await document.fonts.ready;
if (COVER) {
  // couverture : le cerveau tel qu'il est pendant la deuxième phrase (avec la capture du site pour une réalisation), sans texte animé
  const tc = A[Math.min(1, N - 1)] + 1.5;
  for (let t = tc - 3; t < tc; t += 1 / 30) await window.__render(t);
  $('#site').style.opacity = S.beats[Math.min(1, N - 1)].project ? 1 : 0; $('#end').style.opacity = 0; $('#dim').style.opacity = .15;
} else window.__render(0);
window.__ready = true;
