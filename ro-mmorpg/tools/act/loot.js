// 打寶系統驗證：稀有度掉落與特效、撿到才擲數值、詞條數量、Boss 掉落表與保底、職業比例、分解兌換、存檔
const R = await page.evaluate(() => {
  const G = window.__game, L = window.__LOOT, DB = window.__DB, out = {};
  G.loadMap('prt_fild', 28, 20);
  // 1) 稀有度權重統計（一般怪裝備）
  const cnt = {}; for (let i = 0; i < 20000; i++) { const r = G.loot.monsterRarity(DB.item.knife); cnt[r] = (cnt[r] || 0) + 1; }
  out.monsterRarity = cnt;
  return out;
});
console.log('rarity weights (20000 rolls)', JSON.stringify(R.monsterRarity));
// 撿到才擲：掉一件傳說彎刀，地上還沒有數值，撿起後才有
const P = await page.evaluate(async () => {
  const G = window.__game, DB = window.__DB, p = G.player;
  const m = G.monsters[0]; m.x = m.px = p.x + 1; m.y = m.py = p.y; m.def = { ...m.def, drops: [{ item: 'falchion', rate: 1 }] };
  const W = window.__LOOT.monsterRarityWeights; const save = { ...W }; for (const k in W) W[k] = 0; W.legend = 1;
  G.kill(m, p);
  for (const k in save) W[k] = save[k];
  const gi = G.items.find((i) => i.def.id === 'falchion');
  const onGround = { rar: gi.extra.rar, hasRoll: !!gi.extra.roll };
  G.pickTarget = gi; G.walkTo(gi.x, gi.y, false);
  return onGround;
});
console.log('on ground', JSON.stringify(P));
await sleep(700);
await page.screenshot({ path: 'screenshots/打寶_傳說提示.png' });
await sleep(1500);
const picked = await page.evaluate(() => { const G = window.__game; const it = G.inv.items.find((i) => i.id === 'falchion'); return it ? { rar: it.rar, roll: it.roll, aff: it.aff } : null; });
console.log('picked', JSON.stringify(picked));
// 直接呼叫 rollGear（透過 exchange 路徑不便，改用 loot 物件上的方法）
const ST = await page.evaluate(() => {
  const G = window.__game, DB = window.__DB, L = window.__LOOT; const out = {};
  for (const rar of ['common', 'magic', 'rare', 'legend', 'boss']) {
    const affN = new Set(); let lo = 1e9, hi = 0; const base = DB.item.falchion.atk; const f = L.mainStatRange[rar];
    for (let i = 0; i < 400; i++) {
      const it = { def: DB.item.falchion, extra: { rar }, n: 1 };
      const before = G.inv.items.length; G.inv.items = G.inv.items.filter((x) => x.id !== 'falchion');
      G.items = []; const gi = new (window.__GI)(DB.item.falchion, 1, G.player.x, G.player.y, G.player.x, G.player.y, { rar }); G.pickUp(gi);
      const got = G.inv.items.find((x) => x.id === 'falchion'); affN.add(got.aff ? got.aff.length : 0); lo = Math.min(lo, got.roll.atk); hi = Math.max(hi, got.roll.atk);
    }
    out[rar] = { affixes: [...affN].join(','), atk: `${lo}-${hi}`, expected: `${Math.round(base * f[0])}-${Math.round(base * f[1])}` };
  }
  return out;
});
console.log('rolls', JSON.stringify(ST));
// Boss：保底與職業比例
const B = await page.evaluate(() => {
  const G = window.__game, L = window.__LOOT, DB = window.__DB; const out = {};
  G.flags.pity = {}; const t = L.boss.kingjelly; const ex0 = t.exclusiveChance; t.exclusiveChance = 0;
  let firstEx = -1; for (let i = 1; i <= 12; i++) { const d = G.loot.bossDrops('kingjelly'); if (d.some((x) => x.rar === 'boss') && firstEx < 0) firstEx = i; }
  out.pityAt = firstEx;
  out.always = G.loot.bossDrops('kingjelly').map((x) => x.id).slice(0, 2);
  t.exclusiveChance = 1; G.player.ch.job = 'mage'; let mine = 0, tot = 0;
  for (let i = 0; i < 2000; i++) { const d = G.loot.bossDrops('kingjelly').find((x) => x.rar === 'boss'); if (d) { tot++; if (DB.item[d.id].jobs.includes('mage')) mine++; } }
  out.ownJobRate = (mine / tot).toFixed(3);
  t.exclusiveChance = ex0;
  let eq = 0, ex = 0, card = 0; G.flags.pity = {}; const N = 20000;
  for (let i = 0; i < N; i++) { G.flags.pity = {}; const d = G.loot.bossDrops('golem'); if (d.some((x) => x.rar && x.rar !== 'boss')) eq++; if (d.some((x) => x.rar === 'boss')) ex++; if (d.some((x) => x.id === 'golem_card')) card++; }
  out.rates = { equip: (eq / N).toFixed(3), exclusive: (ex / N).toFixed(3), card: (card / N).toFixed(4) };
  G.player.ch.job = 'novice';
  return out;
});
console.log('boss', JSON.stringify(B));
// 分解、兌換、存檔
const F = await page.evaluate(() => {
  const G = window.__game, DB = window.__DB, out = {};
  G.inv.items = G.inv.items.filter((x) => !['falchion', 'jelly_blade'].includes(x.id));
  G.inv.add('falchion', 1, { rar: 'legend', roll: { atk: 55 }, aff: [{ k: 'crit', v: 7 }, { k: 'lifesteal', v: 4 }, { k: 'elem', v: 20, el: 'fire' }] });
  const f = G.inv.items.find((x) => x.id === 'falchion');
  const c0 = G.inv.count('king_crown'); G.loot.dismantle(f.uid); out.dismantle = G.inv.count('king_crown') - c0;
  G.inv.add('king_crown', 20); out.exchangeErr = G.loot.exchange('jelly_blade');
  const jb = G.inv.items.find((x) => x.id === 'jelly_blade'); out.exchanged = jb && { rar: jb.rar, atk: jb.roll.atk, aff: jb.aff.length };
  G.flags.pity = { kingjelly: 7 }; G.save.save();
  const d = G.save.read(); const jb2 = d.inv.items.find((x) => x.id === 'jelly_blade');
  out.saved = { pity: d.flags.pity, rar: jb2.rar, roll: jb2.roll, aff: jb2.aff };
  // 詞條真的生效
  G.player.ch.job = 'swordsman'; const p = G.player; const c0b = p.d.crit; G.inv.add('falchion', 1, { rar: 'legend', roll: { atk: 60 }, aff: [{ k: 'crit', v: 7 }, { k: 'move', v: 10 }, { k: 'hp', v: 200 }] });
  const f2 = G.inv.items.filter((x) => x.id === 'falchion').pop(); const sp0 = p.speed, hp0 = p.maxHp; G.inv.equipItem(f2.uid, 'swordsman', 20); p.recalc();
  out.affixApplied = { crit: [c0b, p.d.crit], speed: [+sp0.toFixed(2), +p.speed.toFixed(2)], maxHp: [hp0, p.maxHp], weaponAtk: p.d.weaponAtk };
  return out;
});
console.log('forge/save', JSON.stringify(F));
// 截圖：地上各稀有度
await page.evaluate(() => { const G = window.__game, DB = window.__DB, p = G.player; G.loadMap('prt_fild', 28, 20); G.items = [];
  [['knife', 'common'], ['cutter', 'magic'], ['falchion', 'rare'], ['composite_bow', 'legend'], ['golem_staff', 'boss'], ['jelly', undefined]].forEach(([id, rar], i) => {
    const gi = new window.__GI(DB.item[id], 1, p.x - 2.5 + i * 1.1, p.y + 1.5 - i * 0.6, p.x, p.y, rar ? { rar } : {}); gi.t = 1; G.items.push(gi); });
  G.ui.open('inventory'); });
await sleep(800);
// 提示框
await page.click('#win-inventory .tab:nth-child(2)'); await sleep(200);
const p2 = await page.evaluate(() => { const c = document.querySelector('#win-inventory .r-boss') || document.querySelector('#win-inventory .r-legend'); const r = c.getBoundingClientRect(); return [r.x + 10, r.y + 10]; });
await page.mouse.move(p2[0], p2[1]); await sleep(300);
await page.evaluate(() => { const w = document.getElementById('win-inventory'); w.style.left = '880px'; });
const p3 = await page.evaluate(() => { const c = document.querySelector('#win-inventory .r-boss') || document.querySelector('#win-inventory .r-legend'); const r = c.getBoundingClientRect(); return [r.x + 10, r.y + 10]; });
await page.mouse.move(p3[0] + 2, p3[1] + 2); await sleep(300);
