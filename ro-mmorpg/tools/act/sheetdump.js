// 匯出玩家目前職業的精靈圖（背景填草綠色，方便檢查）。JOBNAME 換職業 id，OUTPATH 換輸出檔。
const fs = await import('node:fs');
const url = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch; G.loop.running = false; G.skipStory && G.skipStory();
  ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 }; G.changeJob('JOBNAME'); p.refreshLook();
  const s = p.sheet, c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; const x = c.getContext('2d');
  x.fillStyle = '#6f9860'; x.fillRect(0, 0, c.width, c.height); x.drawImage(s.c, 0, 0);
  return c.toDataURL();
});
fs.writeFileSync('OUTPATH', Buffer.from(url.split(',')[1], 'base64'));
console.log('dumped');
