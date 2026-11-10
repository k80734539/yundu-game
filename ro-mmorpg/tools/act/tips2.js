const r = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch; G.skipStory && G.skipStory(); G.flags.tut = 99; G.flags.tutOff = false;
  ch.job = 'swordsman'; ch.baseLv = 8; G.quests.accept('q_tut1'); G.tutorial.lastTip = ''; G.ui.tutorialHint();
  return G.tutorial.text();
});
console.log(r); await sleep(1200);
