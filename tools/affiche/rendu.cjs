/**
 * Exporte l'affiche des tarifs : PDF A4, image A4 haute définition et image portrait 1080×1920.
 *   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/affiche/rendu.cjs <dossier>
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
(async () => {
  const out = process.argv[2] || 'affiche'; mkdirSync(out, { recursive: true });
  const URL = 'http://127.0.0.1:8123/tools/affiche/tarifs.html';
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const a4 = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
  await a4.goto(URL); await a4.waitForFunction(() => window.__ready === true);
  await a4.screenshot({ path: `${out}/Tarifs-JeFaisTonSite-A4.png` });
  await a4.pdf({ path: `${out}/Tarifs-JeFaisTonSite.pdf`, width: '210mm', height: '297mm', printBackground: true, scale: 1 });
  const st = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await st.goto(URL + '?f=story'); await st.waitForFunction(() => window.__ready === true);
  await st.screenshot({ path: `${out}/Tarifs-JeFaisTonSite-portrait.png` });
  await b.close();
})();
