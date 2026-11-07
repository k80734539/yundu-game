// 階段 7：初心者 Job10＋基本技能 9 → 找轉職官轉職成法師 → 學技能 → 詠唱火焰彈／雷暴
const clickNpc = async (id) => {
  const pos = await page.evaluate((id) => { const G = window.__game; const n = G.npcs.find((n) => n.def.id === id); const L = G.cam.left(G.r.w), T = G.cam.top(G.r.h); return [((n.x - n.y) * 32 - L) * G.r.scale / G.r.dpr, ((n.x + n.y) * 16 - T - 40) * G.r.scale / G.r.dpr]; }, id);
  await page.mouse.click(pos[0], pos[1]);
  await page.waitForFunction(() => window.__game.ui.dialog.isOpen, null, { timeout: 8000 });
};
const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opt')].map((e) => e.textContent));
const until = async () => { for (let i = 0; i < 12; i++) { if ((await opts()).length) return; await page.keyboard.press('Enter'); await sleep(90); } };
const key = async (k) => { await page.keyboard.press(k); await sleep(150); };
await page.evaluate(() => { const G = window.__game, ch = G.player.ch; ch.baseLv = 12; ch.jobLv = 10; ch.skills.basic = 9; ch.stats.int = 40; ch.stats.dex = 30; G.player.recalc(true); G.loadMap('aurora', 25, 13); });
await sleep(700);
await clickNpc('job'); await until();
console.log('job menu', await opts());
await key('1'); await until(); console.log('choose', await opts());
await key('2'); await until(); await key('1'); await sleep(300);
for (let i = 0; i < 4; i++) await key('Enter');
const st = await page.evaluate(() => { const G = window.__game; return { job: G.player.ch.job, weapon: G.player.weaponType(), range: G.attackRange(G.player) }; });
console.log('after', JSON.stringify(st));
// 學技能、測試三職業都能施放不出錯
await page.evaluate(() => { const G = window.__game; G.player.ch.skillPts = 30; for (let i = 0; i < 5; i++) { G.learnSkill('firebolt'); G.learnSkill('thunderstorm'); G.learnSkill('coldbolt'); G.learnSkill('soulstrike'); } G.player.sp = G.player.maxSp = 500; G.loadMap('prt_fild', 28, 20); G.hotbar[2] = { type: 'skill', id: 'firebolt' }; G.hotbar[3] = { type: 'skill', id: 'thunderstorm' }; G.ui.hot.render(); });
await sleep(800);
const near = () => page.evaluate(() => { const G = window.__game, p = G.player; const m = G.monsters.filter((m) => !m.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; m.hp = m.maxHp = 2000; p.chase = m; return m.name; });
console.log('target', await near());
await sleep(300);
await key('F3'); await sleep(2600);
await key('F4'); await sleep(1500);
console.log('state', await page.evaluate(() => { const G = window.__game; return JSON.stringify({ cast: !!G.skills.cast, cd: G.skillCd, sp: G.player.sp }); }));
await sleep(3000);
