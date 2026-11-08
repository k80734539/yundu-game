// 角色欄位：舊存檔搬到欄位 1、建立第 2 個角色、重新整理後兩個都在、刪除；重新配點
// 1) 做一份舊版單一存檔（rom.save），重新整理後應出現在欄位 1
await page.evaluate(() => { const G = window.__game; G.player.ch.name = '舊角色'; G.player.ch.baseLv = 12; G.save.slot = 1; G.save.save(); const k = localStorage.getItem('rom.save.s1'); localStorage.clear(); localStorage.setItem('rom.save', k); });
await page.reload(); await page.waitForFunction(() => window.__game && document.querySelector('#title .slot'));
console.log('after legacy', await page.evaluate(() => JSON.stringify(window.__game.save.list().map((s) => s && s.name + ' Lv' + s.baseLv)) + ' legacyKey=' + localStorage.getItem('rom.save')));
// 2) 在欄位 2 建立新角色
await page.fill('#slot-name-2', '小法師'); await page.click('.slot:nth-child(2) .btn');
await page.waitForFunction(() => !window.__game.inTitle);
await page.evaluate(() => { const G = window.__game; G.player.ch.baseLv = 3; G.save.save(); });
await page.reload(); await page.waitForFunction(() => window.__game && document.querySelector('#title .slot'));
await sleep(400);
console.log('two slots', await page.evaluate(() => JSON.stringify(window.__game.save.list().map((s) => s && s.name + ' Lv' + s.baseLv))));
await page.screenshot({ path: 'screenshots/角色選擇.png' });
// 3) 開始欄位 1，確認讀到舊角色
await page.click('.slot:nth-child(1) .btn');
await page.waitForFunction(() => !window.__game.inTitle);
console.log('playing', await page.evaluate(() => window.__game.player.ch.name + ' slot' + window.__game.save.slot));
// 4) 重新配點
const rs = await page.evaluate(() => {
  const G = window.__game, ch = G.player.ch; ch.zeny = 10000;
  ch.statPts = 30; for (let i = 0; i < 8; i++) G.raiseStat('str'); for (let i = 0; i < 4; i++) G.raiseStat('dex');
  const usedPts = ch.statPts, str = ch.stats.str;
  ch.skills = { basic: 9 }; ch.job = 'novice'; G.changeJob('swordsman'); ch.skillPts = 10; for (let i = 0; i < 5; i++) G.learnSkill('bash'); for (let i = 0; i < 3; i++) G.learnSkill('sword_mastery');
  const sp0 = ch.skillPts;
  const a = G.resetStats(), b = G.resetSkills();
  return { before: { str, statPts: usedPts, skillPts: sp0 }, after: { str: ch.stats.str, statPts: ch.statPts, skillPts: ch.skillPts, skills: ch.skills, zeny: ch.zeny }, a, b };
});
console.log('reset', JSON.stringify(rs));
// 5) 刪除欄位 2
await page.evaluate(() => { window.__game.save.deleteSlot(2); });
console.log('after delete', await page.evaluate(() => JSON.stringify(window.__game.save.list().map((s) => s && s.name))));
