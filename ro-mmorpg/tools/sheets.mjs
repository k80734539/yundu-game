// 把幾個 sprite sheet 匯出成 PNG 檢查（node tools/sheets.mjs）
import { createRequire } from 'node:module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve('dist');
const server = http.createServer((req, res) => { let p = req.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = path.join(root, decodeURIComponent(p)); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`http://localhost:${server.address().port}/`);
await pg.waitForFunction(() => window.__game && window.__game.loop.running);
const which = process.argv[2] || 'player';
const url = await pg.evaluate((which) => {
  const G = window.__game;
  const s = which === 'player' ? G.player.sheet : G.monsters.find((m) => m.def.id === which).sheet;
  const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; const x = c.getContext('2d');
  x.fillStyle = '#7a9a6a'; x.fillRect(0, 0, c.width, c.height); x.drawImage(s.c, 0, 0);
  x.strokeStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i <= 10; i++) { x.strokeRect(i * s.fw, 0, s.fw, c.height); }
  return c.toDataURL();
}, which);
fs.writeFileSync(`/tmp/claude-0/sheet_${which}.png`, Buffer.from(url.split(',')[1], 'base64'));
await b.close(); server.close(); console.log('ok');
