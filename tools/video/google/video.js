/**
 * TikTok « Ton business est invisible sur Google » (32 s, 30 i/s, 1080×1920).
 * Composition déterministe : window.__render(t) cale le cerveau 3D (brain.js en mode vidéo, en fond) et l'animation (GSAP) sur t.
 * Rendu : NODE_PATH=$(npm root -g) PAGE=google/index.html VERT=1 node tools/video/render.cjs <dossier> 30 0 32
 */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);

export const DUR = 32;
// Voix off : [début, texte] ; les durées viennent de voice.json (sinon estimées)
export const VOICE = [
  [0.3, 'Si un client cherche ton business sur Google et ne trouve rien… il va chez ton concurrent.'],
  [4.5, "Restaurant, salon, boutique, pressing… Beaucoup n'ont qu'une page Facebook ou un statut WhatsApp. Ça ne suffit plus."],
  [12.2, "Un site comme ça, c'est tes services, tes photos, tes prix, ta localisation, et un bouton pour te contacter directement sur WhatsApp."],
  [20.0, 'Je crée ton site professionnel, adapté au téléphone, livré en trois jours.'],
  [24.6, 'Écris SITE en commentaire, ou écris-moi sur WhatsApp. Je te montre gratuitement à quoi ressemblerait le tien.'],
];
window.__VOICE = VOICE; window.__DUR = DUR;

async function boot() {
  while (!window.__brain || !window.__brain.ready()) await new Promise((r) => setTimeout(r, 100));
  const B = window.__brain;
  const durs = await fetch('./voice.json').then((r) => r.ok ? r.json() : null).catch(() => null) || [3.67, 7.16, 6.8, 3.72, 6.08];

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  tl.set(['.soc', '#neq', '#c1', '#c2', '#tap', '#tap0'], { opacity: 0 }, 0);
  // A · recherche Google
  tl.set('#black', { opacity: 1 }, 0).to('#black', { opacity: 0, duration: .4 }, 0)
    .from('#hA', { opacity: 0, y: -40, duration: .6 }, .1)
    .from('#phone', { y: 500, rotate: 6, duration: .9 }, 0)
    .from('#res .g__res', { opacity: 0, y: 40, duration: .45, stagger: .25 }, 2.0)
    .from('#tag', { scale: 0, duration: .4, ease: 'back.out(3)' }, 3.0)
    .to('#hA', { opacity: 0, y: -40, duration: .4, ease: 'power2.in' }, 4.0)
    .to('#phone', { x: -900, rotate: -8, duration: .6, ease: 'power2.in' }, 4.1);
  // B · le problème
  const chips = document.querySelectorAll('.chip');
  tl.set(['#chips', '#socials'], { opacity: 1 }, 0).set(chips, { opacity: 0 }, 0)
    .fromTo(chips, { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: .4, stagger: .62, ease: 'back.out(2)', immediateRender: false }, 4.6)
    .fromTo('.soc', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: .5, stagger: .9, immediateRender: false }, 7.6)
    .fromTo('#neq', { opacity: 0, scale: 1.3, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .6, immediateRender: false }, 10.2)
    .fromTo('#flash', { opacity: .35 }, { opacity: 0, duration: .5, immediateRender: false }, 10.25)
    .to(['#chips', '#socials', '#neq'], { opacity: 0, y: -60, duration: .4, ease: 'power2.in' }, 11.6);
  // C · démonstration : le faux site défile au rythme de la voix
  // le téléphone revient plus grand : « Chez Awa » sort en premier sur Google, on tape dessus, le site s'ouvre
  tl.set('#site', { opacity: 0 }, 0)
    .set('#res', { opacity: 0 }, 11.9).set('#res2', { opacity: 1 }, 11.9)
    .fromTo('#phone', { x: 900, rotate: 8, scale: 1 }, { x: 0, y: -30, rotate: 0, scale: 1.15, duration: .7, immediateRender: false }, 11.9)
    .fromTo('#tap0', { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .2, immediateRender: false }, 12.35)
    .to('#tap0', { scale: .8, duration: .1, yoyo: true, repeat: 1 }, 12.55)
    .to('#tap0', { opacity: 0, duration: .2 }, 12.8)
    .fromTo('#site', { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .35, immediateRender: false }, 12.75)
    .fromTo('#c1', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: .5, immediateRender: false }, 13.0)
    .fromTo('#c2', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: .5, immediateRender: false }, 16.9);
  const scroll = [[13.3, 520], [13.9, 860], [14.5, 1240], [15.2, 1600], [16.0, 1878]];
  scroll.forEach(([at, y]) => tl.to('#siteIn', { y: -y, duration: .7, ease: 'power2.inOut' }, at));
  tl.fromTo('#tap', { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .25, immediateRender: false }, 17.4)
    .to('#tap', { scale: .8, duration: .12, yoyo: true, repeat: 1 }, 17.7)
    .to('#waBtn', { scale: .95, duration: .12, yoyo: true, repeat: 1 }, 17.7)
    .to('#tap', { opacity: 0, duration: .3 }, 18.3)
    .to('#checks', { opacity: 0, y: -60, duration: .4, ease: 'power2.in' }, 19.2)
    .to('#phone', { y: 1800, rotate: 6, duration: .6, ease: 'power2.in' }, 19.3);
  // D · l'offre
  tl.set('#offer', { opacity: 0 }, 0)
    .fromTo('#offer', { opacity: 0 }, { opacity: 1, duration: .3, immediateRender: false }, 19.8)
    .from('.offer__a', { opacity: 0, letterSpacing: '.6em', duration: .8 }, 19.8)
    .from('.offer__b', { opacity: 0, scale: 1.4, filter: 'blur(10px)', duration: .7 }, 20.2)
    .from('#p1', { opacity: 0, y: 60, duration: .5 }, 21.4)
    .from('#p2', { opacity: 0, y: 60, duration: .5 }, 22.3)
    .to('#offer', { opacity: 0, y: -60, duration: .4, ease: 'power2.in' }, 24.0);
  // E · appel à l'action
  tl.set('#cta', { opacity: 0 }, 0)
    .fromTo('#cta', { opacity: 0 }, { opacity: 1, duration: .3, immediateRender: false }, 24.4)
    .from('.cta__t', { opacity: 0, y: 50, duration: .6 }, 24.4)
    .from('.comment', { opacity: 0, scale: .8, duration: .5, ease: 'back.out(2)' }, 24.9)
    .from('#cs', { opacity: 0, y: 30, duration: .5 }, 26.6)
    .from('#cg', { opacity: 0, y: 30, duration: .5 }, 28.4)
    .from('#arrow', { opacity: 0, duration: .4 }, 26.0)
    .from('#brand', { opacity: 0, y: 30, duration: .6 }, 30.0)
    .to('#black', { opacity: 1, duration: .6, ease: 'power2.in' }, 31.4)
    .set({}, {}, DUR);

  // sous-titres mot à mot, 4 mots par carton
  const cards = [];
  VOICE.forEach(([a, txt], i) => {
    const w = txt.split(/\s+/), d = durs[i], per = d / w.length;
    for (let k = 0; k < w.length; k += 4) cards.push({ a: a + k * per, b: a + Math.min(w.length, k + 4) * per, words: w.slice(k, k + 4), a0: a + k * per, per });
  });
  const Q = 'restaurant Abidjan', CMT = 'SITE';

  window.__render = (t) => {
    // cerveau en fond : lent, un peu plus présent pendant l'offre
    B.user.yaw = -0.8 + t * 0.06;
    B.render(t, 0);
    $('#veil').style.opacity = t > 19.8 && t < 24.4 ? .55 : .8;
    $('#q').textContent = Q.slice(0, Math.round(clamp((t - .5) / 1.3) * Q.length));
    $('#cmt').textContent = CMT.slice(0, Math.round(clamp((t - 25.2) / .8) * CMT.length));
    $('#days').textContent = Math.max(1, Math.min(3, Math.ceil((t - 22.4) / .25)));
    $('#arrow').style.transform = `translateY(${Math.abs(Math.sin(t * 5)) * 26}px)`;
    tl.seek(t, false);
    const c = cards.find((c) => t >= c.a && t < c.b + .15);
    $('#subs').innerHTML = c ? c.words.map((w, i) => `<span class="${t >= c.a0 + i * c.per ? 'on' : ''}">${w.replace(/[<>&]/g, '')}</span>`).join(' ') : '';
  };
  await document.fonts.ready;
  window.__render(0);
  window.__ready = true;
}
boot();
