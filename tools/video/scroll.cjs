/**
 * Parcours réel des sites du portfolio, image par image (1280×800, enregistré à 15 i/s), pour les petits écrans des shorts « réalisation » :
 * un curseur visible survole et clique dans le menu, chaque section s'ouvre, la page défile ; liens externes et WhatsApp évités.
 *   NODE_PATH=$(npm root -g) node tools/video/scroll.cjs <dossier> [id…]   → <dossier>/<id>/00000.jpg … (FRAMES images)
 * Le dossier est servi sous tools/video/scroll/ (lien symbolique, hors du dépôt).
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const SITES = { leglaceur: 'https://www.leglaceur.ci', amddesign: 'https://jordyadopo-boop.github.io/amddesign-archi3d/', odysseegames: 'https://www.odysseegames.com', liy10learning: 'https://www.liy10learning.com' };
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
  for (const txt of ['Continuer sans compte', 'Passer']) {     // fenêtres d'accueil
    const btn = p.getByText(txt, { exact: true }).first();
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await p.waitForTimeout(1500); }
  }
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
  const scrollTo = async (y, n) => { const y0 = await sy(); for (let j = 1; j <= n; j++) { await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.round(y0 + (y - y0) * ease(j / n))).catch(() => {}); await shot(); } };
  const moveTo = async (x, y, n) => { const x0 = mx, y0 = my; for (let j = 1; j <= n; j++) { mx = x0 + (x - x0) * ease(j / n); my = y0 + (y - y0) * ease(j / n); await p.mouse.move(mx, my).catch(() => {}); await shot(); } };
  const wait = async (n) => { for (let j = 0; j < n; j++) await shot(); };
  const click = async () => { for (let j = 0; j < 8; j++) { ring = 1 - j / 8; if (j === 2) { await p.mouse.click(mx, my).catch(() => {}); } await shot(); } ring = 0; };
  // liens du menu : même site, visibles, ni WhatsApp ni téléphone ni nouvel onglet
  const links = () => p.evaluate((host) => [...document.querySelectorAll('header a, nav a')].map((a) => {
    const r = a.getBoundingClientRect(), h = a.getAttribute('href') || '';
    let ok = r.width > 8 && r.height > 8 && r.top >= 0 && r.bottom < innerHeight && a.target !== '_blank' && !/^(tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp))/.test(h);
    try { ok = ok && (h.startsWith('#') || new URL(a.href).host === host); } catch { ok = false; }
    return ok ? { x: r.left + r.width / 2, y: r.top + r.height / 2, t: a.textContent.trim() } : null;
  }).filter((l) => l && l.t), home.host).catch(() => []);

  await wait(20);
  await scrollTo(700, 50);
  await scrollTo(0, 25);
  const done = new Set();
  for (let n = 0; n < 4 && k < FRAMES; n++) {
    const L = (await links()).filter((l) => !done.has(l.t));
    if (!L.length) break;
    const l = L[Math.min(L.length - 1, n === 0 ? 0 : Math.floor(L.length / 2) + n - 2 < 0 ? n : Math.floor(L.length / 2) + n - 2)];
    done.add(l.t);
    await moveTo(l.x, l.y, 18);
    await click();
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await wait(45);
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
