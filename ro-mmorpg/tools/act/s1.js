// 階段 1：點怪物 → 自動走過去攻擊，截圖時保留傷害數字
await page.evaluate(() => {
  const G = window.__game; const p = G.player;
  window.__t = G.monsters.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  window.__t.hp = window.__t.maxHp = 400;
});
const pos = await page.evaluate(() => {
  const G = window.__game, m = window.__t; const L = G.cam.left(G.r.w), T = G.cam.top(G.r.h);
  return [((m.x - m.y) * 32 - L) * G.r.scale / G.r.dpr, ((m.x + m.y) * 16 - T - 20) * G.r.scale / G.r.dpr];
});
await page.mouse.click(pos[0], pos[1]);
await page.waitForFunction(() => window.__t.hp < 330, null, { timeout: 15000 });
await sleep(120);
const st = await page.evaluate(() => { const G = window.__game; return { chase: !!G.player.chase, hp: window.__t.hp, texts: G.fx.texts.activeCount }; });
console.log('state', JSON.stringify(st));
