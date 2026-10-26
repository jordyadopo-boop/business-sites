/**
 * Vidéo de présentation « Je fais ton site internet » (60 s, 30 i/s) : paysage 1920×1080, ou portrait 1080×1920 avec ?v.
 * Composition déterministe : window.__render(t) cale le cerveau 3D du site (brain.js en mode vidéo) et la typographie (GSAP) sur t.
 * Rendu image par image : tools/video/render.cjs, puis montage avec la voix off et la musique (voir README.md).
 */
import { neuronField } from './neurons.js';
const VERT = document.documentElement.classList.contains('vertical');
const W = VERT ? 1080 : 1920;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s) => document.querySelector(s);

// ---------- Minutage (secondes) ----------
export const DUR = 60;
const SLOT = 3, T0 = 14.15;                 // zone i (1..10) centrée sur T0 + 3i ; neurones (11) à T0 + 33
const Ti = (i) => T0 + SLOT * i;
const CUTS = [7.9, 11.8, ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => Ti(i) - 1.35), 45.6, 50.6, 55.2];
const ZONES = [   // [étape, intention, titre, texte] : on parle du métier, le cerveau reste l'image de la marque
  ['Écoute', 'Comprendre votre activité', 'On échange', 'Votre activité, vos clients, vos objectifs : je commence par vous écouter.'],
  ['Stratégie', 'Penser le parcours', 'La stratégie', 'Le plan du site : pages, messages, parcours du visiteur.'],
  ['Contenus', 'Trouver les bons mots', 'Vos contenus', 'Des textes clairs qui donnent envie de vous contacter.'],
  ['Fonctionnalités', 'Faire agir le site', 'Les fonctionnalités', 'Devis, commandes, formulaires, WhatsApp : votre site agit.'],
  ['Navigation', 'Guider le visiteur', 'La navigation', 'Vos visiteurs trouvent tout, sur mobile comme sur ordinateur.'],
  ['Design', 'Inspirer confiance', 'Le design', 'Un design qui inspire confiance au premier regard.'],
  ['Performance', 'Aller vite', 'La fluidité', 'Un site rapide et fluide, même en 3G.'],
  ['Hébergement', 'Rester en ligne', 'Hébergement & sécurité', 'En ligne et protégé, 24 h/24.'],
  ['Données', 'Tout ranger', 'La base de données', 'Contacts, commandes, élèves : tout est bien rangé.'],
  ['Connexions', 'Tout relier', 'Les connexions', 'Relié à Google, WhatsApp et vos réseaux.'],
];
// Voix off : [début, texte] ; les durées viennent de voice.json (généré par voice.py)
export const VOICE = [
  [0.7, 'Je fais ton site internet.'],
  [3.3, 'Sites vitrines, commandes en ligne, applications web, référencement Google.'],
  [8.4, 'Votre activité mérite un site qui travaille pour vous.'],
  [12.2, 'Voici comment je construis le vôtre, étape par étape.'],
  [Ti(1) - 1.1, "D'abord, je vous écoute."],
  [Ti(2) - 1.1, 'Je planifie la stratégie.'],
  [Ti(3) - 1.1, "J'écris vos contenus."],
  [Ti(4) - 1.1, 'Devis, commandes, WhatsApp : votre site agit.'],
  [Ti(5) - 1.1, 'Une navigation simple, sur mobile comme sur ordinateur.'],
  [Ti(6) - 1.1, 'Un design qui inspire confiance.'],
  [Ti(7) - 1.1, 'Un site rapide et fluide.'],
  [Ti(8) - 1.1, 'En ligne et protégé, jour et nuit.'],
  [Ti(9) - 1.1, 'Vos données, bien rangées.'],
  [Ti(10) - 1.1, 'Relié à Google, WhatsApp et vos réseaux.'],
  [46.2, 'Visible sur Google, votre site vous amène de nouveaux clients.'],
  [51.2, 'Découvrez mes réalisations sur mon site.'],
  [55.8, 'Vous avez un projet ? Écrivez-moi sur WhatsApp.'],
];
window.__VOICE = VOICE; window.__DUR = DUR;

// étape du parcours du cerveau (même échelle que le site : 0 cerveau entier … 11 neurones, 12 final)
const stepAt = (t) => t < T0 ? 0 : t <= Ti(11) ? (t - T0) / SLOT : t < 50.6 ? 11 : Math.min(12, 11 + (t - 50.6) / 3);
// rotation lente du cerveau pendant l'introduction, qui se résorbe avant la première zone
const yawAt = (t) => t < 14 ? lerp(-0.7, 0.45, t / 14) : 0.45 * (1 - smooth((t - 14) / 3));
// zoom de la caméra (1 = cadrage du site) : plongée sur le cerveau juste après le logo, puis cerveau gros plan toute la vidéo
const zoomAt = (t) => {
  const Z = VERT ? [0.72, 0.9, 0.7] : [0.5, 0.72, 0.55];    // introduction, zones, site + fin
  if (t < 2.4) return 1.8;
  if (t < 4.6) return lerp(1.8, Z[0], smooth((t - 2.4) / 2.2));
  if (t < 13.6) return Z[0];
  if (t < 15.4) return lerp(Z[0], Z[1], smooth((t - 13.6) / 1.8));
  if (t < 50.6) return Z[1];
  return lerp(Z[1], Z[2], smooth((t - 50.6) / 2));
};


async function boot() {
  while (!window.__brain || !window.__brain.ready()) await new Promise((r) => setTimeout(r, 100));
  const B = window.__brain;
  const field = neuronField($('#neurons'), W, VERT ? 1920 : 1080, VERT);
  const durs = await fetch('./voice.json').then((r) => r.ok ? r.json() : null).catch(() => null);

  // ---------- Typographie (GSAP, en pause : pilotée par __render) ----------
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  tl.set('#black', { opacity: 1 }, 0)
    .from('.logo__rule', { scaleX: 0, duration: 1 }, 1.4)
    .from('.logo__who', { opacity: 0, letterSpacing: '.6em', duration: 1.1 }, 1.6)
    .to('#logo', { opacity: 0, scale: 1.08, filter: 'blur(6px)', duration: .6, ease: 'power2.in' }, 2.7)
    .to('#black', { opacity: 0, duration: .9, ease: 'power2.inOut' }, 2.8)
    .from('#chrome', { opacity: 0, duration: .8 }, 3);
  const pills = document.querySelectorAll('#pillars span');
  tl.set(pills, { opacity: 0 }, 0)
    .fromTo(pills, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .7, stagger: 1.05 }, 3.3)
    .from('#pillars i', { scale: 0, duration: .4, stagger: 1.05 }, 3.8)
    .to('#pillars', { opacity: 0, y: -30, duration: .6, ease: 'power2.in' }, 7.5);
  // accroche : mots qui montent un à un
  const title = $('#title');
  title.innerHTML = title.innerHTML.replace(/(<span class="red">)?([^<\s]+)(<\/span>)?/g, (m) => m);
  const words = [];
  const wrap = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) { const f = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach((w) => { if (!w.trim()) { f.append(w); return; } const o = document.createElement('span'), i = document.createElement('span'); o.className = 'w'; i.textContent = w; o.append(i); f.append(o); words.push(i); }); n.replaceWith(f); }
    else wrap(n);
  });
  wrap(title);
  tl.set('#title', { opacity: 1 }, 0).set(words, { yPercent: 110 }, 0)
    .to(words, { yPercent: 0, duration: .9, stagger: .07 }, 8.2)
    .to('#title', { opacity: 0, y: -40, duration: .6, ease: 'power2.in' }, 11.3);
  tl.set(['.idea__a', '.idea__b', '.idea__c'], { opacity: 0 }, 0)
    .fromTo('.idea__a', { opacity: 0, letterSpacing: '.5em' }, { opacity: 1, letterSpacing: '.12em', duration: 1.1 }, 12.1)
    .fromTo('.idea__b', { opacity: 0, scale: 1.35, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.1 }, 12.8)
    .fromTo('.idea__c', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .8 }, 13.8)
    .to('#idea', { opacity: 0, scale: .92, duration: .6, ease: 'power2.in' }, 15.3);
  tl.set('#zone', { opacity: 0 }, 0);
  for (let i = 1; i <= 10; i++) {
    const s = Ti(i) - 1.5 + .15, end = Ti(i) + 1.5 - .3;
    tl.fromTo('#zone', { opacity: 0, x: -70 }, { opacity: 1, x: 0, duration: .55, immediateRender: false }, s)
      .fromTo('.zone__frame i', { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .55, stagger: .05, immediateRender: false }, s + .05)
      .fromTo('.zone__f', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .5, immediateRender: false }, s + .2)
      .fromTo('.zone__t', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .55, immediateRender: false }, s + .25)
      .fromTo('.zone__p', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .55, immediateRender: false }, s + .45)
      .to('#zone', { opacity: 0, x: 40, duration: .3, ease: 'power2.in' }, end);
  }
  tl.set('#neuro', { opacity: 0 }, 0)
    .fromTo('#neuro', { opacity: 0 }, { opacity: 1, duration: .8, immediateRender: false }, 45.8)
    .fromTo('.neuro__a', { letterSpacing: '.5em' }, { letterSpacing: VERT ? '.14em' : '.24em', duration: 1.4, immediateRender: false }, 45.8)
    .fromTo('.neuro__b', { opacity: 0, scale: 1.3, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, immediateRender: false }, 46.8)
    .to('#neuro', { opacity: 0, duration: .5, ease: 'power2.in' }, 50.1);
  // balayages rouges aux coupes de plan
  CUTS.forEach((c) => tl.fromTo('#wipe', { x: -40, opacity: 1 }, { x: W + 40, duration: .55, ease: 'power2.inOut', immediateRender: false }, c - .3).set('#wipe', { opacity: 0 }, c + .26));
  // le site dans un navigateur en 3D
  const imgs = document.querySelectorAll('#screen img');
  tl.set('#site', { opacity: 0 }, 0)
    .to('#dim', { opacity: .55, duration: .6 }, 50.4)
    .set('#site', { opacity: 1 }, 50.5)
    .fromTo('#browser', { rotateX: 32, rotateY: -26, scale: .62, y: 160, opacity: 0 }, { rotateX: 9, rotateY: -12, scale: .86, y: 0, opacity: 1, duration: 1.3, immediateRender: false }, 50.5)
    .to('#browser', { rotateX: 4, rotateY: 10, scale: .9, duration: 3.4, ease: 'none' }, 51.8);
  [[50.6, 51.6, '0% 0%', 1, 1.08], [51.6, 52.5, '50% 30%', 1.1, 1], [52.5, 53.4, '50% 50%', 1, 1.1], [53.4, 54.2, '50% 40%', 1.08, 1], [54.2, 55.1, '50% 50%', 1, 1.08]].forEach(([a, b, o, s0, s1], i) => {
    tl.fromTo(imgs[i], { opacity: 0, scale: s0, transformOrigin: o }, { opacity: 1, duration: .3, ease: 'none', immediateRender: false }, a)
      .to(imgs[i], { scale: s1, duration: b - a, ease: 'none' }, a)
      .to(imgs[i], { opacity: 0, duration: .3, ease: 'none' }, b - .05);
  });
  tl.to('#site', { opacity: 0, scale: .94, duration: .5, ease: 'power2.in' }, 54.8);
  // fin
  tl.set('#end', { opacity: 0 }, 0).set('#end', { opacity: 1 }, 55.2)
    .to('#dim', { opacity: .6, duration: .5 }, 55.1)
    .from('.end__q', { opacity: 0, y: 30, duration: .9 }, 55.3)
    .from('.end__t', { opacity: 0, y: 40, duration: .9 }, 55.8)
    .from('.end__code', { opacity: 0, letterSpacing: '.3em', duration: 1 }, 56.5)
    .from('.end__wa', { opacity: 0, y: 20, duration: .8 }, 57.1)
    .from('.end__url', { opacity: 0, duration: .8 }, 57.6)
    .to('#black', { opacity: 1, duration: .8, ease: 'power2.in' }, 59.2)
    .set({}, {}, DUR);

  const labels = [[0, ''], [3, 'Présentation'], ...ZONES.map((z, i) => [Ti(i + 1) - 1.35, z[0]]), [45.6, 'Visibilité'], [50.6, 'Le site'], [55.2, 'Contact']];
  const SUBS = VOICE.map(([a, txt], i) => [a, a + (durs ? durs[i] : 2.5) + .25, txt]);
  const LOGO = '<je.fais.ton.site/>';
  const zone = $('#zone'), typed = $('#typed');
  let lastZone = -1;

  window.__render = (t) => {
    // le cerveau ne s'arrête jamais : balancement, légère orbite verticale et zoom qui respire, en plus du parcours
    B.user.yaw = yawAt(t) + 0.22 * Math.sin(t * 0.55) + 0.08 * Math.sin(t * 1.3 + 1);
    B.user.pitch = 0.1 * Math.sin(t * 0.4 + 0.5);
    B.user.zoom = zoomAt(t) * (1 + 0.05 * Math.sin(t * 0.7));
    field(t);
    B.render(t, stepAt(t));
    // logo tapé au clavier, « .site » en rouge
    const n = Math.round(clamp((t - .4) / 1.3) * LOGO.length), s = LOGO.slice(0, n);
    typed.innerHTML = s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]).replace('.site', '<span class="dot">.site</span>');
    const zi = clamp(Math.round((t - T0) / SLOT), 1, 10) - 1;
    if (zi !== lastZone) {
      lastZone = zi; const z = ZONES[zi];
      zone.querySelector('[data-n]').textContent = String(zi + 1).padStart(2, '0');
      zone.querySelector('[data-r]').textContent = z[0];
      zone.querySelector('[data-f]').textContent = '→ ' + z[1];
      zone.querySelector('[data-t]').textContent = z[2];
      zone.querySelector('[data-p]').textContent = z[3];
    }
    tl.seek(t, false);
    $('#subs').textContent = (SUBS.find(([a, b]) => t >= a && t <= b) || [, , ''])[2];
    $('#label').textContent = labels.reduce((acc, [a, l]) => (t >= a ? l : acc), '');
    const f = Math.floor(t * 30);
    $('#tc').textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
  };
  await document.fonts.ready;
  window.__render(0);
  window.__ready = true;
}
boot();
