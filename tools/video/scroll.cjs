/**
 * Parcours réel des sites du portfolio, image par image (1280×800, enregistré à 15 i/s), pour les petits écrans des shorts « réalisation » :
 * un curseur visible survole et clique dans le menu, chaque section s'ouvre, la page défile ; liens externes et WhatsApp évités.
 *   NODE_PATH=$(npm root -g) node tools/video/scroll.cjs <dossier> [id…]   → <dossier>/<id>/00000.jpg … (FRAMES images)
 * Le dossier est servi sous tools/video/scroll/ (lien symbolique, hors du dépôt).
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const SITES = { leglaceur: 'https://www.leglaceur.ci', amddesign: 'https://jordyadopo-boop.github.io/amddesign-archi3d/', odysseegames: 'https://www.odysseegames.com', liy10learning: 'https://www.liy10learning.com' };
const NOCLICK = new Set(['amddesign']);            // menu sans effet hors navigateur réel (longue scène 3D) : descente avec survol des cartes
const FRAMES = 1320, STEP = 2;                      // 44 s à 30 i/s pour les mouvements, une image enregistrée sur 2 (15 i/s, 660 images)
const ease = (u) => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
const CURSOR = `(() => { if (document.getElementById('__cur')) return; const c = document.createElement('div'); c.id = '__cur';
  c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg><i></i>';
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))';
  const r = c.querySelector('i'); r.style.cssText = 'position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:3px solid #ff3b4e;opacity:0';
  document.documentElement.appendChild(c); })()`;

(async () => {
const [out = 'scroll', ...ids] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of ids.length ? ids : Object.keys(SITES)) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  ctx.on('page', (np) => np.close().catch(() => {}));          // jamais de nouvel onglet
  const home = new URL(SITES[id]);
  await p.goto(SITES[id], { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(2500);
  // fenêtres d'accueil (connexion, assistant, intro qui bloque le défilement) : on les ferme, ici et avant chaque clic
  const dismiss = async () => {
    for (const re of [/^Continuer sans compte$/, /^Passer/i, /^Reste dans ton coin$/]) {
      const btn = p.getByText(re).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await p.waitForTimeout(1500); }
    }
  };
  for (let j = 0; j < 6; j++) { await dismiss(); await p.waitForTimeout(1500); }   // une intro peut démarrer quelques secondes après le chargement
  mkdirSync(`${out}/${id}`, { recursive: true });
  let k = 0, mx = 900, my = 420, ring = 0;
  const shot = async () => {
    if (k >= FRAMES) return;
    if (k % STEP) { k++; return; }
    await p.evaluate(CURSOR).catch(() => {});
    await p.evaluate(([x, y, r]) => { const c = document.getElementById('__cur'); if (!c) return; c.style.transform = `translate(${x}px,${y}px)`;
      const i = c.querySelector('i'); i.style.opacity = r > 0 ? r : 0; i.style.transform = `scale(${2 - r})`; }, [mx, my, ring]).catch(() => {});
    await p.waitForTimeout(60);
    await p.screenshot({ path: `${out}/${id}/${String(k / STEP).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80 }).catch(() => {});
    k++;
  };
  const sy = () => p.evaluate(() => scrollY).catch(() => 0);
  const scrollTo = async (y, n) => {
    const y0 = await sy();
    for (let j = 1; j <= n; j++) {
      const v = Math.round(y0 + (y - y0) * ease(j / n));
      await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), v).catch(() => {});
      await shot();
    }
  };
  const moveTo = async (x, y, n) => { const x0 = mx, y0 = my; for (let j = 1; j <= n; j++) { mx = x0 + (x - x0) * ease(j / n); my = y0 + (y - y0) * ease(j / n); await p.mouse.move(mx, my).catch(() => {}); await shot(); } };
  const wait = async (n) => { for (let j = 0; j < n; j++) await shot(); };
  const click = async () => { for (let j = 0; j < 8; j++) { ring = 1 - j / 8; if (j === 2) { await p.mouse.click(mx, my).catch(() => {}); } await shot(); } ring = 0; };
  // rubriques du menu : liens ou boutons visibles du même site, ni logo, ni connexion, ni WhatsApp, ni téléphone, ni nouvel onglet
  const links = () => p.evaluate((host) => {
    const skip = /connect|connexion|compte|login|app|whatsapp|devis|commander|appeler|t[ée]l[ée]charger|play|panier/i, seen = new Set();
    return [...document.querySelectorAll('header a, header button, nav a, nav button')].map((a) => {
      const r = a.getBoundingClientRect(), h = a.getAttribute('href'), txt = a.textContent.trim().replace(/\s+/g, ' ');
      let ok = r.width > 8 && r.height > 8 && r.top >= 0 && r.bottom < innerHeight && a.target !== '_blank' && !a.querySelector('img, svg')
        && txt.length >= 2 && txt.length <= 24 && !skip.test(txt) && !seen.has(txt) && h !== '/' && h !== '#' && !/^(tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp))/.test(h || '');
      try { ok = ok && (!h || h.startsWith('#') || new URL(a.href).host === host); } catch { ok = false; }
      if (ok) seen.add(txt);
      return ok ? { x: r.left + r.width / 2, y: r.top + r.height / 2, t: txt, h } : null;
    }).filter(Boolean);
  }, home.host).catch(() => []);

  if (NOCLICK.has(id)) {
    // descente par paliers ; à chaque palier, le curseur survole une carte ou un bouton visible
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight).catch(() => 6000);
    const steps = 16, depth = Math.min(max, 7000);
    await wait(20);
    for (let n = 1; n <= steps && k < FRAMES; n++) {
      await scrollTo(depth * n / steps, 36);
      const c = await p.evaluate(() => { const v = [...document.querySelectorAll('article, [class*=card], [class*=item], a, button')].map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > 60 && r.height > 40 && r.top > 80 && r.bottom < innerHeight - 40); const r = v[Math.floor(v.length / 2)]; return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }).catch(() => null);
      if (c) await moveTo(c.x, c.y, 22);
      await wait(16);
    }
  }
  await wait(20);
  await scrollTo(700, 50);
  await scrollTo(0, 25);
  const done = new Set();
  for (let n = 0; n < 4 && k < FRAMES && !NOCLICK.has(id); n++) {
    await dismiss();
    const L = (await links()).filter((l) => !done.has(l.t));
    if (!L.length) break;
    const l = L[0];   // les rubriques dans l'ordre du menu
    done.add(l.t);
    await moveTo(l.x, l.y, 18);
    const y0 = await sy();
    await click();
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await wait(15);
    // site qui ne réagit pas au clic (navigation gérée à sa façon) : on descend nous-mêmes jusqu'à la section visée
    if (l.h && l.h.startsWith('#') && Math.abs((await sy()) - y0) < 50) {
      const ty = await p.evaluate((h) => { const e = document.querySelector(h); return e ? e.getBoundingClientRect().top + scrollY - 60 : null; }, l.h).catch(() => null);
      if (ty != null) await scrollTo(ty, 40);
    }
    await wait(30);
    await moveTo(760, 520, 12);
    await scrollTo((await sy()) + 900, 90);
    if (new URL(p.url()).pathname !== home.pathname) { await p.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {}); await wait(20); }
    await scrollTo(0, 30);
  }
  // le reste : longue descente puis retour en haut
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight).catch(() => 3000);
  while (k < FRAMES) { await scrollTo(Math.min(max, 4200), Math.min(300, FRAMES - k)); if (k < FRAMES) await scrollTo(0, Math.min(120, FRAMES - k)); }
  console.log(id, k, [...done].join(' | '));
  await ctx.close();
}
await b.close();
})();
