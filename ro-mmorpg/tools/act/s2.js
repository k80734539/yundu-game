// 階段 2：打幾隻怪升級、分配能力點，打開能力值視窗截圖
await page.evaluate(() => { const G = window.__game; G.player.ch.statPts = 24; G.player.ch.stats.vit = 40; G.player.ch.stats.str = 30; G.player.recalc(true); });
// 讓玩家連續打最近的怪
for (let k = 0; k < 6; k++) {
  await page.evaluate(() => {
    const G = window.__game, p = G.player;
    const ms = G.monsters.filter((m) => !m.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    p.chase = ms[0];
  });
  await page.waitForFunction(() => !window.__game.player.chase, null, { timeout: 60000 });
}
await page.evaluate(() => { const G = window.__game; for (const k of ['str', 'str', 'agi', 'dex', 'vit']) G.raiseStat(k); });
await page.keyboard.down('Alt'); await page.keyboard.press('a'); await page.keyboard.up('Alt');
await sleep(300);
const st = await page.evaluate(() => { const G = window.__game, c = G.player.ch; return { lv: c.baseLv, jlv: c.jobLv, exp: c.baseExp, pts: c.statPts, str: c.stats.str, hp: G.player.hp, aspd: G.player.d.aspd }; });
console.log('state', JSON.stringify(st));
