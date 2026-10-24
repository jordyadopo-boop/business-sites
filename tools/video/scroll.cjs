/**
 * Défilement réel des sites du portfolio, image par image (1280×800, 30 i/s), pour le petit écran des shorts « réalisation ».
 *   NODE_PATH=$(npm root -g) node tools/video/scroll.cjs <dossier> [id…]   → <dossier>/<id>/00000.jpg …
 * Le dossier est servi sous tools/video/scroll/ (lien symbolique, hors du dépôt).
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const SITES = { leglaceur: 'https://www.leglaceur.ci', amddesign: 'https://jordyadopo-boop.github.io/amddesign-archi3d/', odysseegames: 'https://www.odysseegames.com', liy10learning: 'https://www.liy10learning.com' };
const FPS = 30, DUR = 8, DEPTH = 3200;            // 8 s pour descendre d'environ 4 écrans
const ease = (u) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;

(async () => {
const [out = 'scroll', ...ids] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of ids.length ? ids : Object.keys(SITES)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(SITES[id], { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const depth = Math.min(DEPTH, max);
  mkdirSync(`${out}/${id}`, { recursive: true });
  // 1 s sur le haut de la page, puis descente douce
  for (let k = 0; k < FPS * DUR; k++) {
    const u = Math.max(0, (k / (FPS * DUR) - 0.12) / 0.88);
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(ease(u) * depth));
    await p.waitForTimeout(70);
    await p.screenshot({ path: `${out}/${id}/${String(k).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80 });
  }
  console.log(id, depth);
  await p.close();
}
await b.close();
})();
