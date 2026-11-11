// 法師特效檢查：詠唱（魔法陣）、火焰彈、冰凍彈、靈魂衝擊、雷暴、隕石術、冰封大地、魔力屏障。逐格推進後截圖，拼成 screenshots/法師_特效.png。
const setup = async (dx, dy) => page.evaluate(([dx, dy]) => {
  const G = window.__game, p = G.player, ch = p.ch; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 }; G.changeJob('mage'); ch.jobLv = 40; G.changeJob('elementalist'); ch.baseLv = 60;
  ch.skills = { basic: 9, firebolt: 5, coldbolt: 5, soulstrike: 6, thunderstorm: 5, meteor: 4, frost_nova: 5, barrier: 3, chain_lightning: 5 };
  ch.stats.int = 60; ch.stats.dex = 1; p.recalc(true); p.refreshLook(); p.hp = p.maxHp = 1e6; p.sp = p.maxSp = 1e5;
  G.loadMap('prt_fild', 28, 20); G.monsters.length = 0; for (const k in G.skillCd) G.skillCd[k] = 0;
  const m = G.spawnMonster('bunny', [p.x + dx, p.y + dy]); m.hp = m.maxHp = 1e9; m.def = { ...m.def, aggro: false, speed: 0, mdef: 0 }; window.__m = m;
  for (let i = 0; i < 30; i++) G.update(1 / 60); G.render(1, 1 / 60);
}, [dx, dy]);
const step = (n) => page.evaluate((n) => { const G = window.__game; for (let i = 0; i < n; i++) { G.update(1 / 60); G.player.hp = G.player.maxHp; G.player.sp = G.player.maxSp; } G.render(1, 1 / 60); }, n);
const shots = []; const fs = await import('node:fs');
const snap = async (name) => { shots.push([name, await page.screenshot({ clip: { x: 400, y: 150, width: 420, height: 360 } })]); };
// waitCast：先等詠唱結束（詠唱中先截一張），再照 frames 截圖
const run = async (label, id, frames, dx = -2.5, dy = 2.5) => {
  await setup(dx, dy); await page.evaluate((id) => { const G = window.__game; const s = window.__DB.skill[id]; G.skills.begin(id, s.target === 'enemy' ? window.__m : null); }, id);
  await step(12); await snap(`${label}_000`);
  for (let i = 0; i < 400; i++) { if (!(await page.evaluate(() => !!window.__game.skills.cast))) break; await step(2); }
  let done = 0; for (const f of frames) { await step(f - done); done = f; await snap(`${label}_${String(f + 1).padStart(3, '0')}`); }
};
await run('1fire', 'firebolt', [16, 28, 58]);
await run('2ice', 'coldbolt', [16, 28, 58]);
await run('3soul', 'soulstrike', [6, 14, 26]);
await run('4thunder', 'thunderstorm', [4, 14, 28]);
await run('5meteor', 'meteor', [12, 20, 28]);
await run('6frost', 'frost_nova', [3, 10, 30]);
await run('7barrier', 'barrier', [6, 20, 40]);
fs.rmSync('/tmp/claude-0/mgfx', { recursive: true, force: true }); fs.mkdirSync('/tmp/claude-0/mgfx', { recursive: true });
for (const [n, b] of shots) fs.writeFileSync(`/tmp/claude-0/mgfx/${n}.png`, b);
console.log('shots', shots.length);
