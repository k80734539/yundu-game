// 怪物掉 Zeny：多次擊殺統計掉落機率與平均數量、撿起後金額增加、MVP 不重複掉
const r = await page.evaluate(() => {
  const G = window.__game, p = G.player, out = {}; G.loop.running = false;
  G.loadMap('ruins', 10, 47);
  const m0 = G.monsters.find((m) => m.def.id === 'ruin_guard'); const lv = m0.def.lv;
  let drops = 0, sum = 0, N = 400;
  for (let i = 0; i < N; i++) { const before = G.items.length; G.dropLoot(m0); for (const it of G.items.slice(before)) if (it.def.id === 'zeny') { drops++; sum += it.n; } G.items.length = before; }
  out.lv = lv; out.rate = +(drops / N).toFixed(2); out.avg = Math.round(sum / Math.max(1, drops));
  // 撿起
  G.dropLoot(m0); const z = G.items.find((it) => it.def.id === 'zeny') || (G.dropLoot(m0), G.items.find((it) => it.def.id === 'zeny'));
  const z0 = p.ch.zeny; if (z) G.pickUp(z); out.picked = p.ch.zeny - z0;
  out.zenyN = z && z.n;
  return out;
});
console.log(JSON.stringify(r));
