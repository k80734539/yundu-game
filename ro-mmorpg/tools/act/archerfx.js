// 弓箭手特效檢查：普通射擊、二連矢、衝鋒箭、箭雨、陷阱、狙擊、滅絕箭雨、集中。逐格推進截圖 → screenshots/弓箭手_特效.png
const setup = async (dx, dy) => page.evaluate(([dx, dy]) => {
  const G = window.__game, p = G.player, ch = p.ch; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 }; G.changeJob('archer'); ch.jobLv = 40; G.changeJob('ranger'); ch.jobLv = 50; ch.baseLv = 60; G.changeJob('sniper');
  ch.skills = { basic: 9, double_strafe: 10, arrow_shower: 5, charge_arrow: 5, concentration: 3, multi_shot: 5, trap: 5, snipe: 5, rain_of_death: 5, hunters_mark: 3, wind_step: 3, seeker_arrow: 5 };
  ch.stats.dex = 60; p.recalc(true); p.refreshLook(); p.hp = p.maxHp = 1e6; p.sp = p.maxSp = 1e5;
  G.loadMap('prt_fild', 28, 20); G.monsters.length = 0; for (const k in G.skillCd) G.skillCd[k] = 0;
  const m = G.spawnMonster('bunny', [p.x + dx, p.y + dy]); m.hp = m.maxHp = 1e9; m.def = { ...m.def, aggro: false, speed: 0, def: 0 }; window.__m = m;
  for (let i = 0; i < 30; i++) G.update(1 / 60); G.render(1, 1 / 60);
}, [dx, dy]);
const step = (n) => page.evaluate((n) => { const G = window.__game; for (let i = 0; i < n; i++) { G.update(1 / 60); G.player.hp = G.player.maxHp; G.player.sp = G.player.maxSp; } G.render(1, 1 / 60); }, n);
const shots = []; const fs = await import('node:fs');
const snap = async (name) => { shots.push([name, await page.screenshot({ clip: { x: 380, y: 150, width: 440, height: 360 } })]); };
const run = async (label, id, frames, dx = -3, dy = 3) => {
  await setup(dx, dy);
  await page.evaluate((id) => { const G = window.__game; if (id === 'attack') { G.player.chase = window.__m; return; } const s = window.__DB.skill[id]; G.skills.begin(id, s.target === 'enemy' ? window.__m : null); }, id);
  for (let i = 0; i < 200; i++) { if (!(await page.evaluate(() => !!window.__game.skills.cast))) break; await step(2); }
  let done = 0; for (const f of frames) { await step(f - done); done = f; await snap(`${label}_${String(f).padStart(3, '0')}`); }
};
await run('1atk', 'attack', [10, 16, 22, 28]);
await run('2double', 'double_strafe', [6, 12, 18, 26]);
await run('3charge', 'charge_arrow', [6, 12, 18, 24]);
await run('4shower', 'arrow_shower', [6, 16, 24, 40]);
await run('5trap', 'trap', [3, 8, 14, 30]);
await run('6snipe', 'snipe', [4, 8, 14, 20]);
await run('7rain', 'rain_of_death', [8, 18, 28, 44]);
await run('8mark', 'hunters_mark', [4, 12, 22, 34]);
fs.rmSync('/tmp/claude-0/arfx', { recursive: true, force: true }); fs.mkdirSync('/tmp/claude-0/arfx', { recursive: true });
for (const [n, b] of shots) fs.writeFileSync(`/tmp/claude-0/arfx/${n}.png`, b);
console.log('shots', shots.length);
