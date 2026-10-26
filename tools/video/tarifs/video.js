/**
 * TikTok « Tarifs » (35 s, 30 i/s, 1080×1920) : prix des agences, les offres, −20 % de lancement, confiance, contact WhatsApp.
 * Composition déterministe : window.__render(t) cale le cerveau 3D (brain.js en mode vidéo, en fond) et l'animation (GSAP) sur t.
 * Rendu : NODE_PATH=$(npm root -g) PAGE=tarifs/index.html VERT=1 node tools/video/render.cjs <dossier> 30 0 35
 */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');

export const DUR = 35;
// Voix off (Henri) : [début, texte] ; durées dans voice.json
export const VOICE = [
  [0.3, "Ton site pro, sans payer le prix d'une agence."],
  [3.0, 'En agence, un site vitrine coûte souvent entre 250 000 et 1 500 000 francs.'],
  [7.6, 'Chez moi : la Page Pro à 75 000, livrée en trois jours.'],
  [11.0, 'Le site Vitrine à 150 000. Le pack Business à 250 000. Et ta boutique en ligne, avec paiement Wave et Orange Money, dès 450 000.'],
  [21.1, 'Offre de lancement : moins vingt pour cent pour mes cinq premiers clients !'],
  [24.3, 'Tu paies en deux fois, et tu valides ton site avant de payer le solde.'],
  [27.7, 'Contacte-moi sur WhatsApp, au 07 09 95 10 92.'],
];
window.__VOICE = VOICE; window.__DUR = DUR;

async function boot() {
  while (!window.__brain || !window.__brain.ready()) await new Promise((r) => setTimeout(r, 100));
  const B = window.__brain;
  const durs = await fetch('./voice.json').then((r) => r.ok ? r.json() : null).catch(() => null) || [2.1, 4.1, 3.09, 9.2, 2.6, 2.85, 5.21];
  const q = qrcode(0, 'M'); q.addData('https://wa.me/2250709951092?text=Bonjour%20Jordy%2C%20je%20veux%20ma%20maquette%20gratuite%20de%20site.'); q.make();
  $('#qr').innerHTML = q.createSvgTag({ margin: 0, scalable: true });

  // accroche : mots qui montent un à un
  const words = [];
  const wrap = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) { const f = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach((w) => { if (!w.trim()) { f.append(w); return; } const o = document.createElement('span'), i = document.createElement('span'); o.className = 'w'; i.textContent = w; o.append(i); f.append(o); words.push(i); }); n.replaceWith(f); }
    else wrap(n);
  });
  wrap($('#hook'));

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const hide = ['#agency', '.ask', '#me', '#k1', '#k2', '#k3', '#k4', '#promo', '#t1', '#t2', '#cta', '#brand'];
  tl.set(hide, { opacity: 0 }, 0).set(words, { yPercent: 110 }, 0)
    .set('#black', { opacity: 1 }, 0).to('#black', { opacity: 0, duration: .4 }, 0)
    .from('#logo', { opacity: 0, y: -30, duration: .6 }, .1)
    .to(words, { yPercent: 0, duration: .7, stagger: .08 }, .3)
    .to('#hook', { opacity: 0, y: -60, duration: .4, ease: 'power2.in' }, 2.6);
  // B · prix des agences (compteurs) puis « Trop cher ? »
  tl.fromTo('#agency', { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .5, immediateRender: false }, 2.9)
    .fromTo('.ask', { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(3)', immediateRender: false }, 6.2)
    .to('#agency', { opacity: 0, x: -200, duration: .4, ease: 'power2.in' }, 7.2);
  // C · les offres, au rythme de la voix
  tl.fromTo('#me', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .4, immediateRender: false }, 7.5);
  [['#k1', 7.9], ['#k2', 11.0], ['#k3', 13.5], ['#k4', 16.2]].forEach(([s, a]) =>
    tl.fromTo(s, { opacity: 0, x: 220 }, { opacity: 1, x: 0, duration: .5, ease: 'back.out(1.6)', immediateRender: false }, a));
  tl.to('#k2', { scale: 1.04, duration: .3, yoyo: true, repeat: 1 }, 11.6)
    .to('#k4', { scale: 1.05, duration: .3, yoyo: true, repeat: 1 }, 17.4)
    .to(['#me', '#cards'], { opacity: 0, y: -80, duration: .4, ease: 'power2.in' }, 20.6);
  // D · −20 %
  tl.fromTo('#promo', { opacity: 0, scale: 2.4, rotate: -30 }, { opacity: 1, scale: 1, rotate: -10, duration: .45, ease: 'back.out(2.2)', immediateRender: false }, 21.0)
    .fromTo('#flash', { opacity: .45 }, { opacity: 0, duration: .6, immediateRender: false }, 21.2)
    .to('#promo', { scale: 1.06, duration: .3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 21.9)
    .to('#promo', { opacity: 0, scale: .6, duration: .35, ease: 'power2.in' }, 23.9);
  // E · confiance
  tl.fromTo('#t1', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: .5, immediateRender: false }, 24.3)
    .fromTo('#t2', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: .5, immediateRender: false }, 25.5)
    .to('#trust', { opacity: 0, y: -60, duration: .4, ease: 'power2.in' }, 27.3);
  // F · contact
  tl.fromTo('#cta', { opacity: 0 }, { opacity: 1, duration: .3, immediateRender: false }, 27.6)
    .from('.cta__t', { opacity: 0, y: 50, duration: .6 }, 27.6)
    .from('#wabtn', { opacity: 0, scale: .8, duration: .5, ease: 'back.out(2)' }, 28.0)
    .from('.qr', { opacity: 0, scale: .7, duration: .5, ease: 'back.out(2)' }, 30.5)
    .from('.cta__s', { opacity: 0, duration: .5 }, 30.9)
    .to('#wabtn', { scale: 1.04, duration: .35, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 31.3)
    .fromTo('#brand', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .6, immediateRender: false }, 33.1)
    .to('#black', { opacity: 1, duration: .6, ease: 'power2.in' }, 34.3)
    .set({}, {}, DUR);

  // sous-titres mot à mot, 4 mots par carton
  const cards = [];
  VOICE.forEach(([a, txt], i) => {
    const w = txt.split(/\s+/), per = durs[i] / w.length;
    for (let k = 0; k < w.length; k += 4) cards.push({ a: a + k * per, b: a + Math.min(w.length, k + 4) * per, words: w.slice(k, k + 4), per });
  });
  const NUM = '+225 07 09 95 10 92';

  window.__render = (t) => {
    B.user.yaw = -0.6 + t * 0.07;
    B.render(t, 0);
    $('#a1').textContent = fmt(250000 * clamp((t - 3.3) / 1.4));
    $('#a2').textContent = fmt(1500000 * clamp((t - 4.6) / 1.6));
    $('#num').textContent = NUM.slice(0, Math.round(clamp((t - 28.9) / 3.2) * NUM.length));
    $('#veil').style.opacity = t > 20.9 && t < 24.2 ? .9 : .8;
    tl.seek(t, false);
    const c = cards.find((c) => t >= c.a && t < c.b + .15);
    $('#subs').innerHTML = c ? c.words.map((w, i) => `<span class="${t >= c.a + i * c.per ? 'on' : ''}">${w.replace(/[<>&]/g, '')}</span>`).join(' ') : '';
  };
  await document.fonts.ready;
  window.__render(0);
  window.__ready = true;
}
boot();
