// 初心者八方向跑步截圖：朝 8 個方向各走一小段，抓走路中的畫面
await page.evaluate(() => { const G = window.__game, p = G.player, ch = p.ch; G.skipStory && G.skipStory(); ch.job = 'novice'; ch.baseLv = 5; p.recalc(true); p.look = null; p.refreshLook(); G.loadMap('aurora', 24, 22); G.monsters.length = 0; });
await sleep(800);
const dirs = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
for (let i = 0; i < 8; i++) {
  await page.evaluate((i) => { const G = window.__game, p = G.player; const d = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]][i]; p.x = 24; p.y = 22; p.setPath([[24 + d[0] * 6, 22 + d[1] * 6]]); }, i);
  await sleep(500);
  const pos = await page.evaluate(() => { const G = window.__game, p = G.player, r = G.r; const a = 1; const sx = (p.ix(a) - p.iy(a)) * 32 - G.cam.left(r.w), sy = (p.ix(a) + p.iy(a)) * 16 - G.cam.top(r.h); const b = document.querySelector('canvas').getBoundingClientRect(); return { x: b.left + sx * r.scale, y: b.top + sy * r.scale }; });
  const x = Math.max(0, Math.min(1280 - 240, pos.x - 120)), y = Math.max(0, Math.min(720 - 240, pos.y - 170));
  await page.screenshot({ path: `screenshots/_walk_${i}.png`, clip: { x, y, width: 240, height: 240 } });
}
console.log('ok');
