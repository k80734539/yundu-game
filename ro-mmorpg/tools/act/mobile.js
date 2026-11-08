// 手機版：預設全部收合；量測遊戲畫面露出的比例（elementFromPoint 取樣）
await page.evaluate(() => { const G = window.__game; G.loadMap('forest', 30, 30); G.quests.accept('q_tut1'); G.ev.emit('quest'); });
await sleep(1500);
const cover = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, cv = document.getElementById('game');
  let all = 0, game = 0, cAll = 0, cGame = 0;
  for (let y = 2; y < H; y += 4) for (let x = 2; x < W; x += 4) {
    const e = document.elementFromPoint(x, y); const ok = e === cv || (e && e.classList && e.classList.contains('pass'));
    all++; if (ok) game++;
    if (x > W * 0.2 && x < W * 0.8 && y > H * 0.2 && y < H * 0.8) { cAll++; if (ok) cGame++; }
  }
  return { gameVisible: +(game / all).toFixed(3), centerVisible: +(cGame / cAll).toFixed(3), scale: window.__game.r.scale, logical: [window.__game.r.w, window.__game.r.h], folds: window.__game.ui.fold };
});
console.log('MOBILE', JSON.stringify(await cover()));
await page.screenshot({ path: `screenshots/改版5_手機${process.env.W > process.env.H ? '橫' : '直'}_收合.png` });
// 點圖示展開基本資訊選單 → 開背包
await page.tap('#hud .hud-expand'); await sleep(200);
await page.tap('#hud [data-win="inventory"]'); await sleep(300);
console.log('EXPANDED', JSON.stringify(await cover()));
await page.screenshot({ path: `screenshots/改版5_手機${process.env.W > process.env.H ? '橫' : '直'}_展開.png` });
await page.tap('#win-inventory .win-x'); await sleep(200);
// 點地面還能走
const before = await page.evaluate(() => [window.__game.player.x, window.__game.player.y]);
await page.tap('#game', { position: { x: Math.round(innerW() * 0.65), y: Math.round(innerH() * 0.62) } }).catch(async () => { await page.touchscreen.tap(560, 260); });
function innerW() { return +process.env.W; } function innerH() { return +process.env.H; }
await sleep(1500);
const after = await page.evaluate(() => [window.__game.player.x, window.__game.player.y]);
console.log('TAPMOVE', JSON.stringify({ moved: Math.hypot(after[0] - before[0], after[1] - before[1]).toFixed(2) }));
