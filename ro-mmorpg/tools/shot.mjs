// 用法：node tools/shot.mjs <名稱> [動作腳本.js]
// 啟動 dist/ 的靜態伺服器 → Playwright 開遊戲 → 執行動作 → 截圖 screenshots/<名稱>.png；console 有錯誤就以非零結束
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve('dist');
const name = process.argv[2] || 'shot';
const script = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (process.env.LOG) console.log('[console]', m.type(), m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/${process.env.TITLE ? "" : "?autostart=1"}`);
await page.waitForFunction(() => window.__game && window.__game.loop && window.__game.loop.running, null, { timeout: 15000 });
await page.waitForTimeout(800);
if (script) {
  const fn = new Function('page', 'sleep', `return (async () => { ${script} })()`);
  await fn(page, (ms) => page.waitForTimeout(ms));
}
fs.mkdirSync('screenshots', { recursive: true });
await page.screenshot({ path: `screenshots/${name}.png` });
const info = await page.evaluate(() => { const g = window.__game; return { fps: g.loop.fps, entities: g.entities.length, chunks: g.ground.chunkCount, map: g.map.def.id }; });
console.log('info', JSON.stringify(info));
await browser.close(); server.close();
if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK screenshots/' + name + '.png');
