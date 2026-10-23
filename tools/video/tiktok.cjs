/**
 * Capture des images TikTok (1080×1920) depuis tiktok.html. Servir la racine du dépôt :
 *   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/video/tiktok.cjs <dossier>
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');

(async () => {
const out = process.argv[2] || 'tiktok';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [i, name] of [['1', 'JFTS-tiktok-1-je-fais-ton-site.png'], ['2', 'JFTS-tiktok-2-realisations.png']]) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8123}/tools/video/tiktok.html?i=${i}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await p.screenshot({ path: `${out}/${name}`, timeout: 300000 });
  await p.close();
  console.log(name);
}
await b.close();
})();
