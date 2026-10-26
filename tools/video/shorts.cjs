/**
 * Couvertures des shorts TikTok (1080×1920), une par entrée de shorts.json. Servir la racine du dépôt :
 *   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/video/shorts.cjs <dossier> [id…]
 */
const { chromium } = require('playwright');
const { mkdirSync, readFileSync } = require('node:fs');

(async () => {
const [out = 'covers', ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const all = JSON.parse(readFileSync(`${__dirname}/shorts.json`, 'utf8')).filter((s) => !ids.length || ids.includes(s.id));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const { id, page = 'shorts.html' } of all) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8123}/tools/video/${page}?s=${id}&cover`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await p.screenshot({ path: `${out}/${id}.png`, timeout: 300000 });
  await p.close();
  console.log(id);
}
await b.close();
})();
