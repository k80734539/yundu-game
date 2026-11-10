// 進階提示：依條件出現、做過就消失、× 全部關掉
const r = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch, out = {}; G.skipStory && G.skipStory(); G.flags.tut = 99; G.flags.tutOff = false;
  const T = () => G.tutorial.text();
  ch.job = 'novice'; ch.baseLv = 3; out.novice = T();
  G.quests.s.q_tut1 = G.quests.s.q_tut1 || { n: 0 };
  ch.job = 'swordsman'; ch.baseLv = 8; out.guide = T();
  G.flags.guideSeen = true; ch.baseLv = 16; out.merc = T();
  G.flags.hiredMerc = true; ch.baseLv = 31; out.quarter = T();
  G.flags.quarterSeen = true; out.none1 = T();
  ch.jobLv = 40; ch.job = 'swordsman'; out.job2 = T();
  ch.job = 'paladin'; ch.jobLv = 50; ch.baseLv = 60; out.job3 = T();
  ch.job = 'templar'; out.done = T();
  ch.job = 'paladin'; G.flags.tutOff = true; out.off = T();
  G.flags.tutOff = false; G.tutorial.lastTip = ''; G.ui.tutorialHint();
  return out;
});
console.log(JSON.stringify(r, null, 1));
