// 主線劇情：序章＋第一章整條跑一遍（對話、調查點、擊倒、夜鴉登場、護符升級、引導、存檔）
// 用法：npm run build && node tools/shot.mjs 主線_xxx tools/act/story.js
const out = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, D = G.ui.dialog, R = {};
  G.loop.running = false; G.flags.tutOff = true; G.ui.tutorialHint();
  G.flags.story = undefined; G.quests.s = {};
  const step = (n = 30) => { for (let i = 0; i < n; i++) G.update(1 / 60); };
  // 播完目前的劇情：一直按下一頁；有選項就選第 1 個
  const finish = () => { let k = 0; while (D.isOpen && k++ < 400) { if (D.choices.length) D.onKey('1'); else D.advance(); } return !D.isOpen; };
  const talk = (id) => { const n = G.npcs.find((o) => o.def.id === id); if (!n) return 'no npc ' + id; G.talkTo(n); return D.isOpen && D.el.classList.contains('story'); };
  const walkSpot = () => { const s = G.story.spotHere(); if (!s) return 'no spot'; p.x = p.px = s.x + 0.5; p.y = p.py = s.y + 1.5; step(5); return D.isOpen; };
  const spots = []; // 每個調查點：可走、從入口走得到
  for (const q of window.__STORY.quests) for (const s of q.steps) if (s.type === 'spot') {
    G.loadMap(s.map); const m = G.map, po = m.def.portals[0];
    const path = G.pf.find(po.x + 0.5, po.y + 0.5, s.x + 0.5, s.y + 0.5, 20000, 1);
    spots.push(`${q.id}:${s.map}(${s.x},${s.y}) walk=${m.canWalk(s.x, s.y)} reach=${!!path}`);
  }
  R.spots = spots;
  // 序章 1
  G.loadMap('aurora', 25, 30); ch.baseLv = 2; step(); R.lv2 = G.story.st.started;
  ch.baseLv = 3; step(); R.p1start = [G.story.st.q, G.story.st.started, G.guide.get().text, G.guide.get().main];
  R.p1girl = talk('girl'); R.p1girlEnd = finish(); R.after1 = G.story.st.step;
  R.p1spot = walkSpot(); finish(); R.p1guide = talk('guide'); finish();
  R.p1done = G.story.isDone('m_p1');
  // 序章 2
  ch.baseLv = 6; step(); G.loadMap('forest', 5, 30); step(); R.p2spot = walkSpot(); finish();
  G.loadMap('aurora', 25, 30); step(); R.p2talk = talk('herbalist'); finish(); R.p2done = G.story.isDone('m_p2');
  // 序章 3
  ch.baseLv = 12; step(); G.loadMap('forest', 5, 30); step(); R.p3guide = G.guide.get().text;
  G.ev.emit('kill', 'kingjelly'); step(); R.p3kill = G.story.st.step;
  R.p3spot = walkSpot(); finish(); G.loadMap('aurora', 25, 30); step(); walkSpot(); finish();
  R.p3done = G.story.isDone('m_p3'); R.charm1 = G.inv.count('dawn_charm1');
  const c1 = G.inv.items.find((i) => i.id === 'dawn_charm1'); G.inv.equipItem(c1.uid, ch.job, ch.baseLv); R.eq1 = G.inv.isEquipped(c1.uid);
  // 第一章
  ch.baseLv = 15; step(); R.c1start = G.story.st.q; talk('captain'); finish();
  G.loadMap('coast', 30, 5); step(); walkSpot(); finish(); R.c1a = G.story.isDone('m_1a');
  ch.baseLv = 20; step(); G.loadMap('swamp', 50, 6); step(); walkSpot(); finish();
  G.loadMap('aurora', 25, 30); step(); talk('herbalist'); finish(); R.c1b = G.story.isDone('m_1b');
  ch.baseLv = 28; p.recalc(); p.hp = p.maxHp = 99999; step(); G.loadMap('mine2', 11, 48); step(); R.c1guide = G.guide.get().text; walkSpot(); finish();
  G.ev.emit('kill', 'golem'); step(10); R.crowWaiting = G.story.step?.type;
  step(150); R.crowScene = D.isOpen && G.story.scene; R.crowNpc = G.npcs.some((n) => n.def.id === 'crow'); R.crowName = D.nameEl.textContent;
  window.__shotCrow = true; return R;
});
console.log(JSON.stringify(out, null, 1));
await sleep(50);
await page.evaluate(() => { window.__game.loop.start(); });
await sleep(600);
await page.screenshot({ path: 'screenshots/主線_夜鴉.png' });
const out2 = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, D = G.ui.dialog, R = {};
  const step = (n = 30) => { for (let i = 0; i < n; i++) G.update(1 / 60); };
  const finish = () => { let k = 0; while (D.isOpen && k++ < 400) { if (D.choices.length) D.onKey('1'); else D.advance(); } return !D.isOpen; };
  const talk = (id) => { const n = G.npcs.find((o) => o.def.id === id); if (!n) return 'no npc ' + id; G.talkTo(n); return D.isOpen && D.el.classList.contains('story'); };
  const walkSpot = () => { const s = G.story.spotHere(); if (!s) return 'no spot'; p.x = p.px = s.x + 0.5; p.y = p.py = s.y + 1.5; step(5); return D.isOpen; };
  G.loop.running = false; if (p.dead) { p.state = 'idle'; p.hp = p.maxHp; } R.wasDead = p.hp; finish(); step(120); R.crowGone = !G.npcs.some((n) => n.def.id === 'crow');
  G.loadMap('aurora', 25, 30); step(); const s = G.story.spotHere(); p.x = p.px = s.x + 0.5; p.y = p.py = s.y + 1.5; step(5); finish();
  R.state = [JSON.stringify(G.flags.story), G.map.def.id, D.isOpen, G.story.scene, !!G.warp, G.player.x, G.player.y, G.player.dead]; R.c1c = G.story.isDone('m_1c'); R.charm = G.inv.items.filter((i) => i.id.startsWith('dawn_charm')).map((i) => [i.id, G.inv.isEquipped(i.uid)]);
  // 第二章
  p.recalc(); p.hp = p.maxHp = 99999; ch.baseLv = 30; step(); R.c2start = [G.story.st.q, G.story.st.started];
  talk('captain'); finish(); G.loadMap('canyon', 7, 9); step(); walkSpot(); finish();
  G.ev.emit('kill', 'bandit_king'); step(); R.c2kill = G.story.st.step; walkSpot(); finish(); R.c2a = G.story.isDone('m_2a');
  ch.baseLv = 38; step(); G.loadMap('ruins', 11, 49); step(); R.herman = G.guide.get().text; R.c2talk = talk('herman'); finish();
  step(); walkSpot(); finish(); R.c2b = G.story.isDone('m_2b');
  ch.baseLv = 50; step(); G.loadMap('ruins', 11, 49); step(); G.ev.emit('kill', 'serpent'); step(10); step(160);
  R.c2crow = D.isOpen && G.story.scene; finish(); step(120);
  G.loadMap('aurora', 25, 30); step(); walkSpot(); finish(); R.c2c = G.story.isDone('m_2c');
  R.charm3 = G.inv.items.filter((i) => i.id.startsWith('dawn_charm')).map((i) => i.id);
  R.after = [G.story.st.q, G.story.finished, G.guide.get()?.text];
  R.saved = JSON.parse(JSON.stringify(G.flags.story)).done.length;
  // 舊存檔：沒有 flags.story → 從序章開始
  const keep = G.flags.story; G.flags.story = undefined; R.oldSave = G.story.st.q; G.flags.story = keep;
  G.ui.open('quests'); R.qwin = G.ui.wins.quests.body.textContent.slice(0, 160);
  return R;
});
console.log(JSON.stringify(out2, null, 1));
await page.evaluate(() => { window.__game.loop.start(); });
await sleep(500);
