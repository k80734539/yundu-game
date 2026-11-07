// 自我驗收：走路是否抖動、NPC 是否被建築擋住、攻擊時 sprite 大小是否一致
await page.evaluate(() => window.__game.loadMap('prt_fild', 20, 20));
await sleep(500);
// 1) 走路抖動：每個 rAF 記錄主角的螢幕座標與相機左上角，沿直線走時主角螢幕位置不應來回跳
const jit = await page.evaluate(() => new Promise((res) => {
  const G = window.__game; G.walkTo(34.5, 34.5);
  const xs = [], ls = [];
  const tick = () => {
    const p = G.player, a = G.alpha, L = G.cam.left(G.r.w), T = G.cam.top(G.r.h);
    xs.push([Math.round((p.ix(a) - p.iy(a)) * 32 - L), Math.round((p.ix(a) + p.iy(a)) * 16 - T)]); ls.push([L, T]);
    if (p.path.length && xs.length < 400) requestAnimationFrame(tick); else res({ xs, ls });
  };
  requestAnimationFrame(tick);
}));
let rev = 0, bigJump = 0, bgRev = 0;
for (let i = 2; i < jit.xs.length; i++) {
  const d1 = jit.xs[i][1] - jit.xs[i - 1][1], d0 = jit.xs[i - 1][1] - jit.xs[i - 2][1];
  if (d1 * d0 < 0) rev++;
  if (Math.abs(jit.xs[i][0] - jit.xs[i - 1][0]) > 2 || Math.abs(d1) > 3) bigJump++;
  const b1 = jit.ls[i][1] - jit.ls[i - 1][1], b0 = jit.ls[i - 1][1] - jit.ls[i - 2][1];
  if (b1 * b0 < 0) bgRev++;
}
console.log('walk frames', jit.xs.length, 'player-screen reversals', rev, 'jumps', bigJump, 'camera reversals', bgRev);
// 2) NPC 是否被建築擋住
await page.evaluate(() => window.__game.loadMap('aurora', 25, 30));
await sleep(400);
const hidden = await page.evaluate(() => { const G = window.__game; return G.npcs.filter((n) => G.npcHiddenBy(n)).map((n) => n.def.id); });
console.log('hidden npcs', JSON.stringify(hidden));
// 3) 攻擊格與待機格：每格大小相同、腳底錨點相同、身體（頭頂到腳底）高度相同
const sz = await page.evaluate(() => {
  const out = {};
  for (const job of ['novice', 'swordsman', 'mage', 'archer']) {
    const G = window.__game; G.player.ch.job = job; G.player.refreshLook(job === 'mage' ? 'staff' : job === 'archer' ? 'bow' : 'sword');
    const s = G.player.sheet, c = s.c.getContext('2d');
    const feet = [];
    for (let f = 0; f < 10; f++) { // 找腳底（最下面的不透明列）與身體寬度中心，確認錨點不動
      const d = c.getImageData(f * s.fw, 0, s.fw, s.fh).data; let bottom = 0;
      for (let y = s.fh - 1; y >= 0 && !bottom; y--) for (let x = 40; x < 152; x++) if (d[(y * s.fw + x) * 4 + 3]) { bottom = y; break; }
      feet.push(bottom);
    }
    out[job] = { fw: s.fw, fh: s.fh, sheet: [s.c.width, s.c.height], feet: [...new Set(feet)] };
  }
  return out;
});
console.log('sprite', JSON.stringify(sz));
