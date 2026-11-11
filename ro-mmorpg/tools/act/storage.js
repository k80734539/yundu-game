// 倉庫：存入／取出、保留精煉＋卡片＋詞條、裝備中不能存、格數上限、超重取不出、存檔來回、NPC 可達、視窗
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const p = G.player, inv = G.inv, st = G.storage;
  inv.items.length = 0; inv.equip = {}; st.items.length = 0;
  inv.add('red_potion', 30); inv.add('flame_core', 5); inv.add('star_blade'); const sw = inv.items.find((i) => i.id === 'star_blade'); sw.refine = 7; sw.cards = ['flame_wyrm_card']; sw.rar = 'rare'; sw.aff = [{ k: 'crit', v: 5 }]; sw.roll = { atk: 12 };
  const pot = inv.items.find((i) => i.id === 'red_potion');
  out.depPotion = st.deposit(inv, pot.uid, 20); out.depPotion2 = st.deposit(inv, pot.uid, 5); out.potionState = [inv.count('red_potion'), st.count('red_potion'), st.used];
  out.depSword = st.deposit(inv, sw.uid, 1); const stored = st.items.find((i) => i.id === 'star_blade'); out.stored = stored && [stored.refine, stored.cards, stored.rar, stored.aff, stored.roll];
  out.invHasSword = inv.items.some((i) => i.id === 'star_blade');
  const err = st.withdraw(inv, stored.uid, 1); const back = inv.items.find((i) => i.id === 'star_blade'); out.back = back && [back.refine, back.cards, back.rar, back.aff, back.roll]; out.wdErr = err;
  out.wdPotion = st.withdraw(inv, st.items.find((i) => i.id === 'red_potion').uid, 25); out.afterWd = [inv.count('red_potion'), st.count('red_potion')];
  // 裝備中不能存
  G.player.ch.job = 'templar'; G.player.ch.baseLv = 90; inv.equipItem(back.uid, 'templar', 90); out.equipped = st.deposit(inv, back.uid, 1);
  // 格數上限
  st.items.length = 0; for (let i = 0; i < 100; i++) st.items.push({ uid: i + 1, id: 'flame_core', n: 1, refine: 0, cards: [] });
  inv.add('magma_gel', 3); const gel = inv.items.find((i) => i.id === 'magma_gel'); out.full = st.deposit(inv, gel.uid, 3);
  // 超重
  st.items.length = 0; st.items.push({ uid: 1, id: 'flame_core', n: 5000, refine: 0, cards: [] }); out.heavy = st.withdraw(inv, 1, 5000); out.heavyLeft = st.items[0].n;
  // 存檔來回
  st.items.length = 0; inv.add('sky_core', 4); const sc = inv.items.find((i) => i.id === 'sky_core'); st.deposit(inv, sc.uid, 4);
  const snap = G.save.snapshot(); const raw = JSON.parse(JSON.stringify(snap)); st.items.length = 0; G.save.apply(raw); out.afterLoad = st.count('sky_core');
  // NPC 可達
  for (const [map, x, y] of [['aurora', 25, 30], ['starfall', 24, 26]]) { G.loadMap(map, x, y); const n = G.npcs.find((q) => q.def.id.startsWith('store')); out[map] = n && [Math.round(n.x), Math.round(n.y), G.map.canWalk(Math.round(n.x), Math.round(n.y)), !!G.pf.find(p.x, p.y, n.x, n.y + 1, 20000, 1)]; }
  inv.add('red_potion', 5); G.ui.storage.open(); out.winOpen = G.ui.storage.isOpen; out.rows = G.ui.storage.body.querySelectorAll('.shop-row').length;
  return out;
});
console.log(JSON.stringify(R));
