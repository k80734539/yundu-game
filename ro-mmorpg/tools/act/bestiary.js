// 怪物圖鑑：計數、解鎖階段、掉落記錄、收集獎勵領取（含背包放不下）、存檔來回、視窗
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const bs = G.bestiary, p = G.player, ch = p.ch; G.flags.dex = undefined;
  out.total = bs.list().length; out.hasMvp = bs.list().some((d) => d.mvp); out.noMinionOnly = !bs.list().some((d) => d.id === 'zzz');
  out.t0 = bs.tier('magma_slime');
  G.loadMap('volcano', 40, 20); const m = G.monsters.find((x) => x.def.id === 'magma_slime'); G.applyDamage(p, m, 1e9, 'deal'); for (let i = 0; i < 5; i++) G.update(1 / 60);
  out.afterKill = [bs.kills('magma_slime'), bs.tier('magma_slime'), bs.seen('magma_slime'), bs.places('magma_slime')];
  out.dropRecorded = G.flags.dex.d.magma_slime || [];
  G.flags.dex.k.magma_slime = 10; out.t10 = bs.tier('magma_slime'); G.flags.dex.k.magma_slime = 25; out.t25 = bs.tier('magma_slime'); G.flags.dex.k.magma_slime = 100; out.mastered = bs.mastered('magma_slime');
  // 獎勵
  const ms = window.__BESTIARY.milestones; const s5 = ms.find((x) => x.id === 's5'), m3 = ms.find((x) => x.id === 'm3');
  out.s5Before = bs.claimable(s5); for (const d of bs.list().slice(0, 5)) G.flags.dex.k[d.id] = 1; out.s5After = bs.claimable(s5);
  const z0 = ch.zeny; out.claim = bs.claim(s5); out.zenyGain = ch.zeny - z0; out.claimAgain = bs.claim(s5);
  const pts0 = ch.statPts; for (const d of bs.list().slice(0, 3)) G.flags.dex.k[d.id] = 100; out.m3 = bs.claim(m3); out.ptsGain = ch.statPts - pts0;
  const s45 = ms.find((x) => x.id === 's45'); for (const d of bs.list().slice(0, 46)) G.flags.dex.k[d.id] = 1; G.inv.add('flame_core', 1); const old = p.d.weight; p.d.weight = 10; out.heavyClaim = bs.claim(s45); out.heavyStill = bs.claimable(s45); p.d.weight = old; out.okClaim = bs.claim(s45);
  // 存檔來回
  const raw = JSON.parse(JSON.stringify(G.save.snapshot())); G.flags.dex = undefined; G.save.apply(raw); out.afterLoad = [bs.kills('magma_slime'), bs.claimed(s5)];
  // 視窗
  G.ui.open('bestiary'); out.rows = G.ui.wins.bestiary.body.querySelectorAll('.dex-row').length; out.unk = G.ui.wins.bestiary.body.querySelectorAll('.dex-row.unk').length;
  return out;
});
console.log(JSON.stringify(R));
