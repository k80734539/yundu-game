// 劍士特效檢查：普通攻擊、重擊、爆裂斬、挑釁、霸體，各自在幾個時間點截圖後拼成一張（screenshots/劍士_特效.png）。
// 做法：停掉遊戲迴圈，自己一格一格推進再畫，確保截到指定的瞬間。
const setup = async (dx, dy) => page.evaluate(([dx, dy]) => {
  const G = window.__game, p = G.player, ch = p.ch; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 }; G.changeJob('swordsman'); ch.baseLv = 40; ch.skills = { basic: 9, bash: 10, magnum: 5, provoke: 5, endure: 3, sword_mastery: 10 };
  G.inv.items.length = 0; G.inv.equip = {}; G.inv.add('sword'); G.inv.equipItem(G.inv.items[0].uid, 'swordsman', 40); p.recalc(true); p.refreshLook(); p.hp = p.maxHp = 1e6; p.sp = p.maxSp = 1e5;
  G.loadMap('prt_fild', 28, 20); G.monsters.length = 0; for (const k in G.skillCd) G.skillCd[k] = 0;
  const m = G.spawnMonster('bunny', [p.x + dx, p.y + dy]); m.hp = m.maxHp = 1e9; m.aggro = false; m.def = { ...m.def, aggro: false, speed: 0 }; window.__m = m;
  for (let i = 0; i < 30; i++) G.update(1 / 60); G.render(1, 1 / 60);
}, [dx, dy]);
const step = (n) => page.evaluate((n) => { const G = window.__game; for (let i = 0; i < n; i++) G.update(1 / 60); G.render(1, 1 / 60); G.player.hp = G.player.maxHp; }, n);
const shots = [];
const snap = async (name) => { const b = await page.screenshot({ clip: { x: 440, y: 180, width: 400, height: 330 } }); shots.push([name, b]); };
const fs = await import('node:fs');
const run = async (label, start, frames, dx = -1.2, dy = 1.2, waitHit = false) => {
  await setup(dx, dy); await page.evaluate(start);
  if (waitHit) { for (let i = 0; i < 90; i++) { await step(1); if (await page.evaluate(() => window.__game.player.atkHit && window.__game.player.atkAnimT >= 0)) break; } }
  let done = 0; for (const f of frames) { await step(f - done); done = f; await snap(`${label}_${f}`); }
};
await run('attack', () => { const G = window.__game; G.player.chase = window.__m; }, [1, 3, 5, 8], -1.2, 1.2, true);
await run('bash', () => { const G = window.__game; G.skills.begin('bash', window.__m); }, [1, 3, 6, 10], -1.2, 1.2, true);
await run('magnum', () => { const G = window.__game; G.useSkill('magnum'); }, [3, 8, 14, 22]);
await run('provoke', () => { const G = window.__game; G.skills.begin('provoke', window.__m); }, [4, 10, 16, 26], -3, 3);
await run('endure', () => { const G = window.__game; G.useSkill('endure'); }, [3, 9, 18, 30]);
fs.mkdirSync('/tmp/claude-0/swfx', { recursive: true });
for (const [n, b] of shots) fs.writeFileSync(`/tmp/claude-0/swfx/${n}.png`, b);
console.log('shots', shots.length);
