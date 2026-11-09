// 任務引導：新角色 → 建議找導覽員；接任務後告訴去哪打；完成可回報；換地圖給路線；等級不夠顯示下一個門檻；箭頭開關
const r = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch, qs = G.quests, gd = G.guide, out = {}; G.loop.running = false; const step = 1 / 60;
  G.skipStory && G.skipStory(); G.loadMap('aurora', 30, 30); qs.s = {}; ch.baseLv = 1;
  const snap = (k) => { gd.key = ''; const t = gd.compute(); out[k] = t && { text: t.text, sub: t.sub, arrow: t.arrow }; };
  snap('new');
  qs.accept('q_tut1'); snap('tut1_active_in_town');
  G.loadMap('prt_fild', 28, 8); snap('tut1_in_field');
  qs.s['q_tut1'].n = 5; snap('tut1_ready');
  G.loadMap('aurora', 30, 30); snap('tut1_ready_in_town');
  qs.s = { q_tut1: { st: 'done', n: 5 }, q_tut2: { st: 'done', n: 5 } }; ch.baseLv = 1; snap('after_tut_lv1');
  ch.baseLv = 22; qs.s['q_cap1'] = { st: 'done', n: 8 }; snap('lv22');
  // 收集任務 + 遠地圖
  qs.s = { q_tut1: { st: 'done', n: 5 }, q_tut2: { st: 'done', n: 5 } }; ch.baseLv = 5; qs.accept('q_herb1'); G.loadMap('aurora', 30, 30); snap('collect_far');
  // 箭頭：目標在同一地圖時出現；用 render 畫一格確認不會丟錯
  G.loop.running = true; return out;
});
console.log(JSON.stringify(r));
await sleep(1200);
const ok = await page.evaluate(() => { const G = window.__game; G.flags.guideOff = false; G.ui.qtrack.render(); const el = document.querySelector('#qtrack .qt-guide'); return { hasBox: !!el, text: el && el.textContent.slice(0, 80), err: window.__err || null }; });
console.log(JSON.stringify(ok));
await page.screenshot({ path: 'screenshots/任務引導.png' });
