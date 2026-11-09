// 弓與盾：裝弓會卸盾並提示；（資料上弓手已不能穿盾，用小圓盾＋新手模擬舊存檔情況）
const r = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch, out = {}, msgs = []; const orig = G.msg.bind(G); G.msg = (t, k) => { msgs.push(t); orig(t, k); };
  ch.job = 'archer'; ch.baseLv = 30;
  G.inv.add('bow'); G.inv.add('guard'); const bow = G.inv.items.find((i) => i.id === 'bow'), sh = G.inv.items.find((i) => i.id === 'guard');
  G.inv.equip.shield = sh.uid; // 模擬舊存檔：弓手身上有盾
  G.useOrEquip(bow.uid);
  out.weapon = G.inv.equip.weapon === bow.uid; out.shieldGone = G.inv.equip.shield === undefined; out.msgs = msgs.filter((m) => m.includes('雙手'));
  out.archerCanEquipShield = window.__DB.item.guard.jobs.includes('archer');
  return out;
});
console.log(JSON.stringify(r));
