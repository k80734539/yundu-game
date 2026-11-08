// 階段 8：精煉、插卡、坐下回血、死亡扣經驗回城、存檔版本與備份還原
await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch;
  ch.baseLv = 15; ch.job = 'novice'; ch.jobLv = 10; G.changeJob('swordsman'); ch.skills.basic = 9; ch.zeny = 50000;
  G.inv.add('oridecon', 10); G.inv.add('elunium', 5); G.inv.add('falchion'); G.inv.add('crab_card'); G.inv.add('mushkin_card'); G.inv.add('adventure_suit');
  G.loadMap('aurora', 37, 33);
});
await sleep(600);
const r = await page.evaluate(() => {
  const G = window.__game; G.rnd = () => 0.01; // 測試用：保證成功
  const f = G.inv.items.find((i) => i.id === 'falchion');
  for (let i = 0; i < 8; i++) G.refine(f.uid);
  const card = G.inv.items.find((i) => i.id === 'crab_card');
  G.insertCard(card.uid, f.uid);
  G.inv.equipItem(f.uid, 'swordsman', 15); G.player.recalc();
  return { name: G.inv.displayName(f), cards: f.cards, atk: G.player.d.weaponAtk, status: G.player.d.statusAtk };
});
console.log('refine', JSON.stringify(r));
// 失敗會碎掉
const brk = await page.evaluate(() => { const G = window.__game; G.rnd = () => 0.99; const a = G.inv.items.find((i) => i.id === 'adventure_suit'); for (let i = 0; i < 6; i++) if (G.inv.get(a.uid)) G.refine(a.uid); return { exists: !!G.inv.get(a.uid) }; });
console.log('break', JSON.stringify(brk));
// 坐下回血
await page.evaluate(() => { const G = window.__game; G.rnd = Math.random; G.player.hp = 20; G.combatT = 10; G.toggleSit(); });
await sleep(3500);
console.log('sit', await page.evaluate(() => JSON.stringify({ st: window.__game.player.state, hp: window.__game.player.hp })));
// 死亡 → 扣經驗 → 回儲存點
const dd = await page.evaluate(() => { const G = window.__game; G.player.state = 'idle'; G.loadMap('prt_fild', 28, 20); G.player.ch.baseExp = 1000; const m = G.monsters[0]; G.applyDamage(m, G.player, 99999, 'take'); return { exp: G.player.ch.baseExp, dead: G.player.dead, overlay: document.getElementById('death').style.display }; });
console.log('death', JSON.stringify(dd));
await page.click('#death .btn'); await sleep(900);
console.log('respawn', await page.evaluate(() => JSON.stringify({ map: window.__game.map.def.id, hp: window.__game.player.hp, dead: window.__game.player.dead })));
// 存檔：主存檔、備份、損壞時改用備份、舊版本遷移
const sv = await page.evaluate(() => {
  const G = window.__game; G.save.save(); G.player.ch.zeny = 12345; G.save.save();
  const main = localStorage.getItem('rom.save.s1'), bak = localStorage.getItem('rom.save.s1.bak');
  localStorage.setItem('rom.save.s1', main.slice(0, main.length - 30)); // 模擬寫到一半壞掉
  const d = G.save.read();
  return { hasBak: !!bak, from: G.save.loadedFrom, zenyFromBak: d && d.ch.zeny, v: JSON.parse(main).v };
});
console.log('save', JSON.stringify(sv));
// 遷移：手動做一份 v1 存檔
const mg = await page.evaluate(() => {
  const G = window.__game; const d = G.save.snapshot(); delete d.hotbar; d.savePoint = 'aurora'; delete d.mvp;
  const body = JSON.stringify(d); let h = 0x811c9dc5; for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  localStorage.setItem('rom.save.s1', JSON.stringify({ v: 1, t: Date.now(), sum: (h >>> 0).toString(16), data: body }));
  const r = G.save.read(); return { from: G.save.loadedFrom, hotbar: !!r.hotbar, sp: r.savePoint };
});
console.log('migrate', JSON.stringify(mg));
// 截圖：精煉＋插卡視窗、坐下
await page.evaluate(() => { const G = window.__game; G.loadMap('aurora', 37, 33); G.inv.add('jelly_card'); G.inv.add('cotton_shirt'); G.toggleSit(); G.ui.open('refine'); G.ui.open('cards'); document.getElementById('win-refine').style.left = '250px'; document.getElementById('win-cards').style.left = '880px'; document.getElementById('win-cards').style.top = '200px'; });
await sleep(1500);
