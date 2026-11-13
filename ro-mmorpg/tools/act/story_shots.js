// 主線截圖：噴水池調查點、晨曦石之靈對話、任務視窗（主線＋劇情回顧）
const shot = async (name, fn) => { await page.evaluate(fn); await sleep(700); await page.screenshot({ path: `screenshots/${name}.png` }); };
await shot('主線_調查點', () => {
  const G = window.__game, ch = G.player.ch; G.flags.tutOff = true; G.ui.tutorialHint(); G.flags.story = undefined;
  ch.baseLv = 3; G.loadMap('aurora', 27, 31); G.story.jump('m_p1', 1);
});
await shot('主線_晨曦石之靈', () => {
  const G = window.__game, D = G.ui.dialog; G.story.jump('m_p3', 2);
  const s = G.story.spotHere(); G.player.x = G.player.px = s.x + 0.5; G.player.y = G.player.py = s.y + 1.5;
  G.story.investigate(); for (let i = 0; i < 2; i++) { D.advance(); D.advance(); }
});
await shot('主線_任務視窗', () => {
  const G = window.__game, D = G.ui.dialog; G.ui.dialog.close();
  G.flags.story.done = ['m_p1', 'm_p2', 'm_p3']; G.story.jump('m_1a', 0); G.player.ch.baseLv = 15; G.ui.open('quests');
});
await shot('主線_夜鴉', () => {
  const G = window.__game, D = G.ui.dialog, p = G.player; G.ui.wins.quests.close();
  G.loadMap('mine2', 30, 22); p.hp = p.maxHp = 99999; G.story.jump('m_1c', 2);
  for (let i = 0; i < 200 && !D.isOpen; i++) G.update(1 / 60);
  for (let i = 0; i < 6; i++) { if (D.choices.length) D.onKey('2'); else { D.advance(); D.advance(); } }
});
