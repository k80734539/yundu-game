import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const { chromium } = createRequire('/home/user/yundu-game/ro-mmorpg/package.json')('playwright');
const root = path.resolve('dist'); const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const cases = [['桌機高畫質', 'q=high', { width: 1280, height: 720 }], ['桌機低畫質', 'q=low', { width: 1280, height: 720 }], ['手機橫式(自動)', 't=18.3&auto=0', { width: 844, height: 390 }, true], ['手機直式(自動)', 't=22&auto=0', { width: 390, height: 664 }, true], ['下雨+低', 'q=low&rain=1&t=15&auto=0', { width: 844, height: 390 }, true]];
fs.mkdirSync('shots', { recursive: true });
for (const [name, qs, vp, touch] of cases) {
  const page = await browser.newPage({ viewport: vp, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: touch ? 2 : 1 }); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/?${qs}`); await page.waitForFunction(() => window.__frames > 20, null, { timeout: 180000 });
  const f0 = await page.evaluate(() => window.__frames); const t0 = Date.now(); await page.waitForTimeout(1500); const f1 = await page.evaluate(() => window.__frames);
  const info = await page.evaluate(() => window.__info); await page.screenshot({ path: `shots/${name}.png` });
  console.log(name, 'fps(軟體渲染)=', ((f1 - f0) / ((Date.now() - t0) / 1000)).toFixed(1), JSON.stringify({ calls: info.calls, tris: info.tris, low: info.low }), errs.length ? errs.slice(0, 2) : 'no errors'); await page.close();
}
await browser.close(); server.close();
