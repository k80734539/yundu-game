// 二轉：試煉流程、三職業 15 技能實戰施放、失落遺跡與 MVP
const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opt')].map((e) => e.textContent));
const until = async () => { for (let i = 0; i < 14; i++) { if ((await opts()).length || !(await page.evaluate(() => window.__game.ui.dialog.isOpen))) return; await page.keyboard.press('Enter'); await sleep(110); } };
const key = async (k) => { await page.keyboard.press(k); await sleep(160); };
const talk = async () => { await page.evaluate(() => { const G = window.__game; G.talkTo(G.npcs.find((n) => n.def.id === 'job')); }); await sleep(150); await until(); };
await page.evaluate(() => { const G = window.__game, ch = G.player.ch; ch.baseLv = 40; ch.job = 'novice'; ch.jobLv = 10; G.changeJob('swordsman'); ch.jobLv = 39; G.player.recalc(true); G.loadMap('aurora', 25, 13); });
await sleep(500);
await talk(); await key('1'); await until(); console.log('job39', (await page.evaluate(() => document.querySelector('.dlg-text').textContent)));
for (let i = 0; i < 4; i++) await key('Enter');
await page.evaluate(() => { const G = window.__game; G.player.ch.jobLv = 40; });
console.log('mark', await page.evaluate(() => window.__game.quests.mark('job')));
await talk(); await key('1'); await until(); console.log('menu', (await opts()).join('/'));
await key('1'); await until(); await key('1'); await sleep(200); for (let i = 0; i < 3; i++) await key('Enter');
console.log('trial', await page.evaluate(() => JSON.stringify(window.__game.quests.s)));
for (let i = 0; i < 15; i++) await page.evaluate(() => window.__game.quests.onKill('skeleton2'));
await talk(); await key('1'); await sleep(200);
for (let i = 0; i < 12 && await page.evaluate(() => window.__game.ui.dialog.isOpen); i++) await key('Enter');
console.log('after', await page.evaluate(() => { const G = window.__game; return JSON.stringify({ job: G.player.ch.job, jlv: G.player.ch.jobLv, weapon: G.player.weaponType(), skills: G.skillList().length }); }));
// 三個二轉全部技能實戰
for (const job of ['paladin', 'elementalist', 'ranger']) {
  await page.evaluate((job) => { const G = window.__game, ch = G.player.ch; const prev = G.constructor && window.__DB.job[job].prev;
    ch.job = prev; G.changeJob(job); for (const id of G.skillList()) ch.skills[id] = 10; ch.stats.int = 70; ch.stats.dex = 60; ch.stats.str = 60; ch.stats.vit = 60;
    G.player.recalc(true); G.player.sp = G.player.maxSp = 3000; G.loadMap('ruins', 40, 38); }, job);
  await sleep(600);
  const ids = await page.evaluate(() => window.__game.player.job.skills.filter((s) => window.__DB.skill[s].type === 'active'));
  for (const id of ids) {
    await page.evaluate((id) => { const G = window.__game, p = G.player; const m = G.monsters.filter((m) => !m.dead && !m.isMvp).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (m) { m.hp = m.maxHp = 99999; m.x = m.px = p.x + 1.5; m.y = m.py = p.y + 1; p.chase = m; } G.skillCd = {}; G.player.hp = G.player.maxHp; G.useSkill(id); }, id);
    await sleep(job === 'elementalist' ? 3200 : 1400);
  }
  console.log(job, await page.evaluate(() => { const G = window.__game, p = G.player; return JSON.stringify({ hp: p.maxHp, sp: p.maxSp, speed: +p.speed.toFixed(2), range: G.attackRange(p), cd: Object.keys(G.skillCd), buffs: p.buffs, look: p.look.hat }); }));
}
// 截圖：遊俠在遺跡打 MVP 附近
await page.evaluate(() => { const G = window.__game; G.loadMap('ruins', 40, 18); for (const m of G.monsters) if (!m.isMvp && Math.hypot(m.x - 40, m.y - 18) < 6) m.remove = true; });
await sleep(1200);
