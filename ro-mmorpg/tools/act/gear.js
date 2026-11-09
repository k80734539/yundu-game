// 裝備完整性：每職業每欄位都有 B／C 兩階、軍需官可到達並能買、穿滿 C 套後的防禦與傷害減免
const r = await page.evaluate(() => {
  const G = window.__game, DB = window.__DB, ch = G.player.ch, out = {};
  const items = Object.values(DB.item);
  const jobs = ['swordsman', 'paladin', 'templar', 'mage', 'elementalist', 'archmage', 'archer', 'ranger', 'sniper'];
  const slots = ['weapon', 'armor', 'head', 'shield', 'garment', 'shoes', 'acc'];
  out.gaps = [];
  for (const j of jobs) for (const s of slots) { if (s === 'shield' && ['archer', 'ranger', 'sniper'].includes(j)) continue; const l = items.filter((i) => i.slot === s && i.jobs && i.jobs.includes(j) && !i.bossEx); if (l.length < (s === 'acc' ? 4 : 2)) out.gaps.push(j + ':' + s + '=' + l.length); }
  // 軍需官
  G.loadMap('aurora', 40, 36);
  const n = G.npcs.find((x) => x.def.id === 'quarter'); out.npc = !!n;
  const path = n && G.pf.find(G.player.x, G.player.y, n.x, n.y, 4000, 1); out.path = path ? path.length : null;
  const shop = (Array.isArray(DB.shop) ? DB.shop : Object.values(DB.shop)).find((s) => s.id === 'quarter'); out.shopItems = shop && shop.items.length;
  out.badShopItems = shop ? shop.items.filter((id) => !DB.item[id]) : null;
  // 穿滿 C 套
  const C = { swordsman: ['mithril_blade', 'mithril_plate', 'knight_helm', 'tower_shield', 'moon_cloak', 'wind_boots', 'titan_ring'], mage: ['mithril_staff', 'archmage_robe', 'star_circlet', null, 'moon_cloak', 'wind_boots', 'sage_earring'], archer: ['mithril_bow', 'dragon_vest', 'hawk_cowl', null, 'moon_cloak', 'wind_boots', 'eagle_glove'] };
  out.sets = {};
  C.templar = ['star_blade', 'star_plate', 'star_helm', 'star_shield', 'star_cloak', 'star_boots', 'star_ring']; C.archmage = ['star_staff', 'star_robe', 'star_hat', 'star_ward', 'star_cloak', 'star_boots', 'star_earring']; C.sniper = ['star_bow', 'star_vest', 'star_helm', null, 'star_cloak', 'star_boots', 'star_glove'];
  const chain = { templar: ['swordsman', 'paladin'], archmage: ['mage', 'elementalist'], sniper: ['archer', 'ranger'] };
  for (const [job, set] of Object.entries(C)) {
    G.inv.items.length = 0; G.inv.equip = {}; G.inv.add('knife'); ch.baseLv = 80; ch.job = 'novice'; ch.jobLv = 10; const ch3 = chain[job]; if (ch3) { G.changeJob(ch3[0]); ch.jobLv = 40; G.changeJob(ch3[1]); ch.jobLv = 50; } G.changeJob(job); G.player.recalc(true);
    for (const id of set) if (id) { G.inv.add(id); const it = G.inv.items.filter((i) => i.id === id).pop(); G.inv.equipItem(it.uid, job, ch.baseLv); }
    G.player.recalc(true); const d = G.player.d;
    out.sets[job] = { def: d.def, mdef: d.mdef, hp: G.player.maxHp, equipped: Object.keys(G.inv.equip || {}).length };
  }
  return out;
});
console.log(JSON.stringify(r));
