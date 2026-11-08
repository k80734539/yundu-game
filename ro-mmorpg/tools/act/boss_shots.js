// Boss 戰截圖：範圍預警、衝刺路線、狂暴紅色＋血條、擊敗演出（即時執行）
await page.evaluate(() => {
  const G = window.__game, p = G.player; G.loadMap('mine2', 25, 29);
  for (const m of G.monsters) if (!m.isMvp) m.remove = true; G.monsters = G.monsters.filter((m) => !m.remove); G.entities = G.entities.filter((e) => !e.remove);
  p.maxHp = p.hp = 1e7; p.d.def = 0; p.ch.job = 'swordsman'; p.refreshLook('sword');
  const b = G.monsters.find((m) => m.def.id === 'golem'); G.applyDamage(p, b, 20, 'deal'); window.__b = b;
});
const waitTel = async (kind, k) => page.waitForFunction(([kind, k]) => window.__game.telegraphs.some((t) => t.kind === kind && t.t / t.dur > k), [kind, k], { timeout: 60000, polling: 50 });
await waitTel('circle', 0.55); await page.screenshot({ path: 'screenshots/Boss_範圍預警.png' });
await page.waitForFunction(() => window.__game.telegraphs.length === 0, null, { timeout: 8000 }); 
await waitTel('line', 0.6); await page.screenshot({ path: 'screenshots/Boss_衝刺路線.png' });
await page.evaluate(() => { const b = window.__b; b.hp = b.maxHp * 0.45; });
await page.waitForFunction(() => window.__b.boss.state === 'roar', null, { timeout: 5000, polling: 30 });
await sleep(250); await page.screenshot({ path: 'screenshots/Boss_狂暴怒吼.png' });
await sleep(1600);
await waitTel('circle', 0.5); await page.screenshot({ path: 'screenshots/Boss_狂暴戰.png' });
await page.evaluate(() => { const b = window.__b; b.hp = 3; window.__game.applyDamage(window.__game.player, b, 99, 'deal'); });
await sleep(450); await page.screenshot({ path: 'screenshots/Boss_擊敗.png' });
