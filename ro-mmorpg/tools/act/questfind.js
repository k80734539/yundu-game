// 找任務：任務視窗「可以接的任務」＋追蹤、小地圖 NPC 標記、世界地圖徽章、升級提示
const r = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, out = {}; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint();
  ch.job = 'novice'; ch.baseLv = 3; p.recalc(true); G.flags.qAnn = undefined; G.quests.s = {};
  G.loadMap('aurora', 25, 30);
  for (let i = 0; i < 40; i++) G.update(1 / 60);
  out.annInit = !!G.flags.qAnn; out.marks = G.guide.mapMarks();
  // 升級 → 新任務提示
  const msgs = []; const m0 = G.msg.bind(G); G.msg = (t, k) => { msgs.push(t); m0(t, k); };
  ch.baseLv = 5; G.gainExpHook = null; window.__gainExp ? 0 : 0;
  G.quests.announceNew(); out.annAfterLevel = msgs.filter((t) => t.includes('新任務'));
  // 追蹤
  const av = window.__DB.quest.q_herb1; out.canHerb = G.quests.canAccept(av);
  G.flags.guidePin = 'q_herb1'; G.guide.t = 99; out.pinGuide = G.guide.get().text;
  G.quests.accept('q_herb1'); G.guide.t = 99; out.afterAccept = [G.flags.guidePin, G.guide.get().text];
  G.ui.open('quests'); out.qwRows = G.ui.wins.quests.body.querySelectorAll('.q-avail').length;
  return out;
});
console.log(JSON.stringify(r));
await page.evaluate(() => { const G = window.__game; G.quests.s = {}; G.flags.guidePin = null; G.ui.open('quests'); });
await sleep(700);
