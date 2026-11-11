// 手機點擊掉落物（放大範圍＋選最近）、怪物名字（附近就顯示、顏色看強弱）
const r = await page.evaluate(() => {
  const G = window.__game, p = G.player, out = {}; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  G.loadMap('prt_fild', 28, 20); p.ch.baseLv = 3; p.recalc(true);
  const GI = window.__GI, DB = window.__DB;
  G.items.length = 0; const a = new GI(DB.item.jelly, 1, p.x + 2, p.y + 1, p.x + 2, p.y + 1, {}); const b = new GI(DB.item.red_potion, 1, p.x + 2.6, p.y + 1.2, p.x + 2.6, p.y + 1.2, {}); a.t = b.t = 1; G.items.push(a, b);
  for (let i = 0; i < 5; i++) G.update(1 / 60); G.render(1, 1 / 60);
  const L = G.cam.left(G.r.w), T = G.cam.top(G.r.h), iso = window.__ISO;
  const scr = (it) => [(it.ox - it.oy) * 32 - L, (it.ox + it.oy) * 16 - T];
  const [ax, ay] = scr(a); out.mobile = G.ui.mobile;
  out.hitCenter = G.pick(ax, ay - 10) === a;
  out.hitOffset = [[20, -10], [-20, -10], [0, -34], [0, 12], [24, 0]].map(([dx, dy]) => G.pick(ax + dx, ay + dy) === a);
  out.missFar = G.pick(ax + 60, ay) === null;
  const [bx, by] = scr(b); out.nearestB = G.pick(bx + 4, by - 8) === b;
  G.monsters.length = 0; const m = G.spawnMonster('jelly', [p.x + 3, p.y + 2]); const m2 = G.spawnMonster('goblin', [p.x - 2, p.y + 3]); const m3 = G.spawnMonster('flame_wyrm', [p.x - 12, p.y - 12]);
  for (const x of G.monsters) { x.aggro = false; x.def = { ...x.def, aggro: false }; }
  for (let i = 0; i < 5; i++) G.update(1 / 60); G.render(1, 1 / 60);
  return out;
});
console.log(JSON.stringify(r)); await sleep(600);
