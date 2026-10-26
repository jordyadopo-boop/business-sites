/**
 * Rendu de la vidéo image par image (Playwright + Chromium). Servir la racine du dépôt :
 *   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/video/render.cjs <dossier> [fps] [début] [fin] [pas]
 * VERT=1 pour la version portrait 1080×1920 ; PAGE='shorts.html?s=<id>' (avec VERT=1) pour un short TikTok.
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');

(async () => {
const [out = 'frames', fpsArg = '30', fromArg = '0', toArg = '60', stepArg = ''] = process.argv.slice(2);
const fps = Number(fpsArg), from = Number(fromArg), to = Number(toArg), step = stepArg ? Number(stepArg) : 1 / fps;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VERT = !!process.env.VERT;
const p = await b.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT || 8123}/tools/video/${process.env.PAGE || 'index.html' + (VERT ? '?v' : '')}`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await p.waitForTimeout(1500);
// le cerveau évolue image après image (influx, surbrillances) : on part toujours d'un peu avant le début demandé
for (let t = Math.max(0, from - 2); t < from - 1e-6; t += 1 / fps) await p.evaluate((t) => window.__render(t), t);
// le moteur 3D doit d'abord écouler ces images de mise en route : première capture sans limite de temps courte
await p.screenshot({ type: 'jpeg', timeout: 300000 });
const t0 = Date.now();
let i = Math.round(from * fps);
for (let t = from; t < to - 1e-6; t += step, i++) {
  await p.evaluate((t) => window.__render(t), t);
  const name = stepArg ? `t${t.toFixed(1)}` : String(i).padStart(5, '0');
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 92, timeout: 120000 });
  if (i % 60 === 0) console.log(`t=${t.toFixed(2)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await b.close();
})();
