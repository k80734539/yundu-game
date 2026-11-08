// 職業架構 v2：轉職試煉、技能樹前置、被動技能效果
const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opt')].map((e) => e.textContent));
const until = async () => { for (let i = 0; i < 14; i++) { if ((await opts()).length || !(await page.evaluate(() => window.__game.ui.dialog.isOpen))) return; await page.keyboard.press('Enter'); await sleep(110); } };
const key = async (k) => { await page.keyboard.press(k); await sleep(160); };
const talk = async () => { await page.evaluate(() => { const G = window.__game; G.talkTo(G.npcs.find((n) => n.def.id === 'job')); }); await sleep(150); await until(); };
await page.evaluate(() => { const G = window.__game, ch = G.player.ch; ch.baseLv = 12; ch.jobLv = 10; ch.skills.basic = 9; G.player.recalc(true); G.loadMap('aurora', 25, 13); });
await sleep(600);
console.log('mark before', await page.evaluate(() => window.__game.quests.mark('job')));
await talk(); console.log('menu', (await opts()).join('/'));
await key('1'); await until();
await key('3'); await until(); console.log('offer', (await opts()).join('/'));
await key('1'); await sleep(200); await until(); await page.keyboard.press('Escape'); await sleep(150);
console.log('trial active', await page.evaluate(() => JSON.stringify(window.__game.quests.s)));
// 沒完成時再來
await talk(); await key('1'); await until(); console.log('in progress', (await opts()).join('/')); await key('1'); await sleep(150);
// 收集 6 根羽毛
await page.evaluate(() => { window.__game.inv.add('feather', 6); window.__game.ev.emit('inv'); });
console.log('mark ready', await page.evaluate(() => window.__game.quests.mark('job')));
await talk(); await key('1'); await sleep(200);
for (let i = 0; i < 7; i++) { await page.keyboard.press('Enter'); await sleep(130); }
const r = await page.evaluate(() => { const G = window.__game; return { job: G.player.ch.job, feathers: G.inv.count('feather'), weapon: G.player.weaponType(), done: G.quests.isDone('trial_archer') }; });
console.log('after trial', JSON.stringify(r), 'skillPts', await page.evaluate(() => window.__game.player.ch.skillPts));
// 技能樹前置
const t = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch; ch.skillPts = 20;
  const out = {};
  out.chargeLocked = !G.canLearn('charge_arrow');
  out.missing = G.missingReq('charge_arrow').map((m) => m.name + m.lv).join(',');
  const d0 = G.player.d.total.dex, h0 = G.player.d.hit, r0 = G.attackRange(G.player);
  for (let i = 0; i < 4; i++) G.learnSkill('owl_eye');
  out.vultureAfterOwl3 = G.canLearn('vulture_eye');
  for (let i = 0; i < 4; i++) G.learnSkill('vulture_eye');
  G.player.recalc();
  out.dex = [d0, G.player.d.total.dex]; out.hit = [h0, G.player.d.hit]; out.range = [r0, G.attackRange(G.player)];
  return out;
});
console.log('tree', JSON.stringify(t));
// 劍士與法師被動
const p2 = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch, out = {};
  ch.job = 'novice'; G.changeJob('swordsman'); ch.skillPts = 20; const a0 = G.player.d.statusAtk, r0 = G.player.d.hpRegen;
  for (let i = 0; i < 5; i++) { G.learnSkill('sword_mastery'); G.learnSkill('hp_recovery'); }
  G.player.recalc(); out.sword = { atk: [a0, G.player.d.statusAtk], regen: [r0, G.player.d.hpRegen], magnumLocked: !G.canLearn('magnum') };
  for (let i = 0; i < 5; i++) G.learnSkill('bash');
  out.sword.magnumAfter = G.canLearn('magnum');
  ch.job = 'novice'; G.changeJob('mage'); ch.skillPts = 20; const m0 = G.player.d.matkMax, s0 = G.player.d.spRegen;
  for (let i = 0; i < 5; i++) { G.learnSkill('arcane'); G.learnSkill('sp_recovery'); }
  G.player.recalc(); out.mage = { matk: [m0, G.player.d.matkMax], spRegen: [s0, G.player.d.spRegen], thunderLocked: !G.canLearn('thunderstorm') };
  return out;
});
console.log('passives', JSON.stringify(p2));
await page.evaluate(() => { const G = window.__game; G.player.ch.job = 'novice'; G.changeJob('archer'); G.player.ch.skillPts = 3; G.learnSkill('owl_eye'); G.ui.open('skills'); });
await sleep(500);
