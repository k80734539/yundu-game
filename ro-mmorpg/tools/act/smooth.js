// 流暢度量測：沿直線走 ~4 秒，記錄每幀主角螢幕座標、相機、幀間隔、render 耗時
await page.evaluate(() => { const G = window.__game; G.loadMap(process_map(), 18, 18); function process_map() { return 'forest'; } });
await sleep(800);
const r = await page.evaluate(() => new Promise((res) => {
  const G = window.__game; const orig = G.render.bind(G); const rt = [];
  G.render = (a, dt) => { const t0 = performance.now(); orig(a, dt); rt.push(performance.now() - t0); };
  G.walkTo(40.5, 40.5);
  const xs = [], ft = []; let last = performance.now();
  const tick = (now) => {
    const p = G.player, a = G.alpha, L = G.cam.left(G.r.w), T = G.cam.top(G.r.h);
    xs.push([Math.round((p.ix(a) - p.iy(a)) * 32 - L), Math.round((p.ix(a) + p.iy(a)) * 16 - T), L, T]); ft.push(now - last); last = now;
    if (p.path.length && xs.length < 600) requestAnimationFrame(tick); else { G.render = orig; res({ xs, ft, rt }); }
  };
  requestAnimationFrame(tick);
}));
let rev = 0, jump = 0, camRev = 0;
for (let i = 2; i < r.xs.length; i++) {
  const d1 = r.xs[i][1] - r.xs[i - 1][1], d0 = r.xs[i - 1][1] - r.xs[i - 2][1]; if (d1 * d0 < 0) rev++;
  if (Math.abs(r.xs[i][0] - r.xs[i - 1][0]) > 2 || Math.abs(d1) > 3) jump++;
  const c1 = r.xs[i][3] - r.xs[i - 1][3], c0 = r.xs[i - 1][3] - r.xs[i - 2][3]; if (c1 * c0 < 0) camRev++;
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const ft = r.ft.slice(5).sort((a, b) => a - b);
const out = { frames: r.xs.length, screenReversals: rev, bigJumps: jump, cameraReversals: camRev, frameMsAvg: +avg(ft).toFixed(2), frameMsP95: +ft[Math.floor(ft.length * 0.95)].toFixed(2), renderMsAvg: +avg(r.rt).toFixed(2), renderMsP95: +r.rt.sort((a, b) => a - b)[Math.floor(r.rt.length * 0.95)].toFixed(2) };
console.log('SMOOTH', JSON.stringify(out));
