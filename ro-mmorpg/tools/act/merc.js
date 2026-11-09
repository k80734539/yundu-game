// 傭兵：雇用（扣錢、Zeny 不足）、跟隨與換地圖、牧師補血、樂師增益、煉金術士炸彈、契約到期、存檔還原
const R = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, out = {}; G.loop.running = false; const step = 1 / 60; const ms = G.mercs;
  G.skipStory && G.skipStory(); ch.baseLv = 50; ch.zeny = 100; G.loadMap('aurora', 30, 30);
  out.noMoney = ms.hire('priest'); out.cost = ms.cost(); ch.zeny = 100000;
  // 牧師
  out.hirePriest = ms.hire('priest'); out.zenyAfter = ch.zeny; out.active = ms.active; out.again = ms.hire('bard');
  p.x = p.px = 30.5; p.y = p.py = 30.5; for (let i = 0; i < 90; i++) G.update(step);
  p.setPath(G.pf.find(p.x, p.y, 45, 30, 4000, 0)); for (let i = 0; i < 60 * 8; i++) G.update(step);
  out.follow = +Math.hypot(ms.merc.x - p.x, ms.merc.y - p.y).toFixed(1);
  p.hp = Math.round(p.maxHp * 0.5); const h0 = p.hp; for (let i = 0; i < 60 * 3; i++) G.update(step); out.healSmall = p.hp - h0;
  p.hp = Math.round(p.maxHp * 0.2); const h1 = p.hp; for (let i = 0; i < 60 * 3; i++) G.update(step); out.healBig = p.hp - h1;
  p.sp = Math.round(p.maxSp * 0.3); const s0 = p.sp; for (let i = 0; i < 60 * 7; i++) G.update(step); out.spGive = p.sp - s0;
  // 換地圖後仍跟著
  G.loadMap('prt_fild', 28, 8); for (let i = 0; i < 30; i++) G.update(step); out.afterMap = { has: !!ms.merc, near: +Math.hypot(ms.merc.x - p.x, ms.merc.y - p.y).toFixed(1), inEntities: G.entities.includes(ms.merc) };
  // 存檔
  const snap = G.save.snapshot(); out.saved = snap.merc;
  ms.dismiss(true); out.afterDismiss = ms.active; G.save.pendingMerc = snap.merc; ms.restore(G.save.pendingMerc); out.restored = ms.active && ms.merc.type.id;
  ms.dismiss(true);
  // 樂師
  ch.zeny = 100000; p.recalc(); const atk0 = p.d.atkMax, flee0 = p.d.flee, asp0 = p.d.aspd; ms.hire('bard'); for (let i = 0; i < 10; i++) G.update(step);
  p.recalc(); out.bard = { buff: p.buffs.merc_song, atkUp: p.d.atkMax - atk0, fleeUp: p.d.flee - flee0, aspdUp: +(p.d.aspd - asp0).toFixed(1) }; ms.dismiss(true); out.bardGone = !p.buffs.merc_song;
  // 煉金術士：對遺跡怪丟炸彈
  ch.zeny = 100000; G.loadMap('ruins', 10, 47); ms.hire('alchemist'); const mon = G.monsters.filter((m) => !m.dead && !m.isMvp)[0]; mon.hp = mon.maxHp = 1e6; mon.x = mon.px = p.x + 3; mon.y = mon.py = p.y + 1; p.chase = mon; const d0 = mon.hp;
  for (let i = 0; i < 60 * 8; i++) G.update(step); out.bomb = { dmg: d0 - mon.hp, defDown: mon.provokeDef, lost: ms.active };
  // 契約到期
  ms.left = 0.5; for (let i = 0; i < 90; i++) G.update(step); out.expired = !ms.active;
  return out;
});
console.log(JSON.stringify(R));
