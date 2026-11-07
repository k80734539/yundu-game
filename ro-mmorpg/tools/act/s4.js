// 階段 4：主動怪追擊上限、MVP、掉落
await page.evaluate(() => { const G = window.__game; G.player.ch.stats.vit = 90; G.player.ch.stats.str = 60; G.player.ch.stats.agi = 50; G.player.recalc(true); G.loadMap('mine1', 29, 33); });
await sleep(6000);
const cap = await page.evaluate(() => { const G = window.__game; return { chasers: G.monsters.filter((m) => m.aggroOn === G.player && !m.dead).length, aggroMons: G.monsters.filter((m) => m.def.aggro).length }; });
console.log('mine1 chasers', JSON.stringify(cap));
// 殺幾隻看掉落
await page.evaluate(() => { const G = window.__game; G.player.ch.stats.str = 99; G.player.recalc(true); for (const m of G.monsters) m.hp = 1; });
await sleep(4000);
console.log('items on ground', await page.evaluate(() => window.__game.items.length));
// MVP
await page.evaluate(() => { const G = window.__game; G.player.ch.stats.str = 30; G.player.recalc(true); G.loadMap('forest', 38, 46); });
await sleep(1500);
await page.evaluate(() => { const G = window.__game; for (const m of G.monsters) if (!m.isMvp && Math.hypot(m.x - G.player.x, m.y - G.player.y) < 10) { G.kill(m, G.player); } });
await sleep(1200);
const mvp = await page.evaluate(() => { const G = window.__game; const m = G.monsters.find((m) => m.isMvp); return m ? { name: m.name, x: m.x | 0, y: m.y | 0, status: G.mvpStatus('forest') } : null; });
console.log('mvp', JSON.stringify(mvp));
