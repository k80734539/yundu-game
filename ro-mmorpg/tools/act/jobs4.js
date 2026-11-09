// 二轉補完：一轉裝備二轉也能用、4 個原本拿不到的裝備上架、遺跡巨蛇任務
const r = await page.evaluate(() => {
  const G = window.__game, DB = window.__DB, ch = G.player.ch, out = {};
  const items = Object.values(DB.item), jobsOf = (j) => items.filter((i) => i.jobs && i.jobs.includes(j)).map((i) => i.id);
  out.counts = { swordsman: jobsOf('swordsman').length, paladin: jobsOf('paladin').length, mage: jobsOf('mage').length, elementalist: jobsOf('elementalist').length, archer: jobsOf('archer').length, ranger: jobsOf('ranger').length };
  out.missing = ['swordsman:paladin', 'mage:elementalist', 'archer:ranger'].flatMap((p) => { const [a, b] = p.split(':'); return jobsOf(a).filter((x) => !jobsOf(b).includes(x)); });
  const shop = (DB.shop ? (Array.isArray(DB.shop) ? DB.shop : Object.values(DB.shop)) : []).find((s) => s.id === 'weapon');
  out.shop4 = ['guard_dagger', 'helm', 'ring', 'glove'].map((k) => shop && shop.items.includes(k));
  // 元素師穿法師的杖
  ch.baseLv = 50; ch.job = 'novice'; ch.jobLv = 10; G.changeJob('mage'); ch.jobLv = 40; G.changeJob('elementalist');
  G.inv.add('wand'); const w = G.inv.items.find((i) => i.id === 'wand'); G.inv.equipItem(w.uid, 'elementalist', ch.baseLv);
  out.elemEquipWand = G.inv.slotOf(w.uid);
  // 遺跡巨蛇任務
  const Q = (id) => (Array.isArray(DB.quest) ? DB.quest.find((q) => q.id === id) : DB.quest[id]);
  const q = Q('q_mvp3'); out.q = !!q;
  G.quests.s['q_cap5'] = { st: 'done', n: 15 };
  out.canAccept = G.quests.canAccept(q);
  G.quests.accept('q_mvp3'); G.ev.emit('kill', 'serpent');
  G.quests.s['q_mvp3'].n = 1; out.complete = G.quests.complete(q); out.turn = G.quests.turnIn('q_mvp3');
  return out;
});
console.log(JSON.stringify(r));
