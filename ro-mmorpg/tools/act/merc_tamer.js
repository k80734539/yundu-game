// 馴獸師：戰獸跟隨並咬怪、換地圖後仍在、存檔還原、解雇後戰獸消失
const r = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, ms = G.mercs, out = {}; G.loop.running = false; const step = 1 / 60;
  G.skipStory && G.skipStory(); ch.baseLv = 50; ch.zeny = 1e6; G.loadMap('ruins', 10, 47); ms.hire('tamer'); out.has = { merc: !!ms.merc, beast: !!ms.beast };
  const mon = G.monsters.filter((m) => !m.dead && !m.isMvp)[0]; mon.hp = mon.maxHp = 1e6; mon.x = mon.px = p.x + 3; mon.y = mon.py = p.y + 1; p.chase = mon; const t0 = mon.hp;
  for (let i = 0; i < 60 * 8; i++) G.update(step); out.dmg = Math.round(t0 - mon.hp); out.near = +Math.hypot(ms.beast.x - mon.x, ms.beast.y - mon.y).toFixed(1);
  p.chase = null; G.loadMap('prt_fild', 28, 8); for (let i = 0; i < 30; i++) G.update(step); out.afterMap = !!ms.beast && G.entities.includes(ms.beast);
  const snap = G.save.snapshot(); out.saved = snap.merc; ms.dismiss(true); out.gone = !ms.beast && !G.entities.some((e) => e.kind === 'merc'); ms.restore(snap.merc); out.restored = !!ms.beast; ms.dismiss(true);
  return out;
});
console.log(JSON.stringify(r));
