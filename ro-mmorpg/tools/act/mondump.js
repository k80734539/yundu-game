// 匯出指定怪物的精靈圖（每隻：三個方向 × 0,2,4,6,7,8 格），拼成一張檢查圖。IDS 換成逗號分隔的怪物 id。
const fs = await import('node:fs');
const url = await page.evaluate((ids) => {
  const G = window.__game; G.loop.running = false; G.loadMap('prt_fild', 28, 20);
  const list = ids.split(','), cols = [0, 2, 4, 6, 7, 8];
  const sheets = list.map((id) => G.spawnMonster(id, [G.player.x + 2, G.player.y + 2]).sheet);
  const cell = 150, W = cols.length * 3 * cell, H = list.length * cell;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#6f9860'; x.fillRect(0, 0, W, H);
  sheets.forEach((s, j) => { const k = Math.min(1, cell / s.fw); [0, 1, 3].forEach((r, ri) => cols.forEach((f, i) => x.drawImage(s.c, f * s.fw, r * s.fh, s.fw, s.fh, (ri * cols.length + i) * cell + (cell - s.fw * k) / 2, j * cell + (cell - s.fh * k), s.fw * k, s.fh * k))); });
  return cv.toDataURL();
}, 'IDS');
fs.writeFileSync('OUT', Buffer.from(url.split(',')[1], 'base64')); console.log('ok');
