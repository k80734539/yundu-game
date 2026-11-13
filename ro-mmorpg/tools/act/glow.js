// 裝備發光：各等級的判定（精煉、稀有度、高階裝備、MVP 專屬）與畫面。逐級截圖拼成 screenshots/裝備發光.png
const fs = await import('node:fs');
const info = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, out = {}; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 }; G.changeJob('swordsman'); ch.jobLv = 40; G.changeJob('paladin'); ch.baseLv = 90; ch.jobLv = 50; p.recalc(true);
  G.loadMap('prt_fild', 28, 20); G.monsters.length = 0; p.hp = p.maxHp = 1e6;
  const set = (id, refine = 0, rar) => { G.inv.items.length = 0; G.inv.equip = {}; if (id) { G.inv.add(id); const it = G.inv.items[0]; it.refine = refine; if (rar) it.rar = rar; G.inv.equipItem(it.uid, ch.job, 90); } p.recalc(); G.ev.emit('inv'); return G.glow && [G.glow.lv, G.glow.color, G.glow.rainbow]; };
  out.none = set('sword'); out.r4 = set('sword', 4); out.r5 = set('sword', 5); out.r7 = set('sword', 7); out.r9 = set('sword', 9); out.r10 = set('sword', 10);
  out.rare = set('sword', 0, 'rare'); out.legend = set('sword', 0, 'legend'); out.boss = set('sword', 0, 'boss'); out.mvp = set('flame_blade');
  // 高階裝備件數
  G.inv.items.length = 0; G.inv.equip = {}; const eq = (id) => { G.inv.add(id); const it = G.inv.items[G.inv.items.length - 1]; G.inv.equipItem(it.uid, ch.job, 90); };
  eq('zenith_spear'); p.recalc(); G.ev.emit('inv'); out.high1 = G.glow && G.glow.lv;
  eq('zenith_plate'); p.recalc(); G.ev.emit('inv'); out.high2 = G.glow && G.glow.lv;
  eq('zenith_helm'); eq('zenith_boots'); p.recalc(); G.ev.emit('inv'); out.high4 = G.glow && G.glow.lv;
  return out;
});
console.log(JSON.stringify(info));
const levels = [['0無', null], ['1精煉5', ['sword', 5]], ['2精煉7', ['sword', 7]], ['3精煉9', ['sword', 9]], ['4精煉10', ['sword', 10]], ['5傳說', ['sword', 0, 'legend']]];
const shots = [];
for (const [name, cfg] of levels) {
  await page.evaluate((cfg) => { const G = window.__game, p = G.player, ch = p.ch; G.inv.items.length = 0; G.inv.equip = {}; if (cfg) { G.inv.add(cfg[0]); const it = G.inv.items[0]; it.refine = cfg[1]; if (cfg[2]) it.rar = cfg[2]; G.inv.equipItem(it.uid, ch.job, 90); } p.recalc(); p.refreshLook(); G.ev.emit('inv'); G.fx.clear(); G.loop.running = false; }, cfg);
  for (let i = 0; i < 45; i++) await page.evaluate(() => { const G = window.__game; G.update(1 / 60); G.render(1, 1 / 60); });
  await page.evaluate(() => { const G = window.__game; G.time += 0.17; G.render(1, 1 / 60); });
  shots.push([name, await page.screenshot({ clip: { x: 520, y: 220, width: 240, height: 260 } })]);
}
fs.mkdirSync('/tmp/claude-0/glow', { recursive: true }); for (const [n, b] of shots) fs.writeFileSync(`/tmp/claude-0/glow/${n}.png`, b);
