import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const { chromium } = createRequire('/home/user/yundu-game/ro-mmorpg/package.json')('playwright');
const root = path.resolve('dist'); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const jobs = JSON.parse(process.argv[2]); fs.mkdirSync('shots', { recursive: true });
for (const [name, qs, w, h] of jobs) {
  const page = await browser.newPage({ viewport: { width: w || 1280, height: h || 720 } }); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/${qs.startsWith('town') ? '' : '?'}${qs}`); await page.waitForFunction(() => window.__frames > 40, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/${name}.png` }); console.log(name, errs.length ? errs.slice(0, 3) : 'ok'); await page.close();
}
await browser.close(); server.close();
