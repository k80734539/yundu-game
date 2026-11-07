// 階段 10：新手教學提示、效能資訊（/fps）、標題畫面另存一張
await page.evaluate(() => { const G = window.__game; G.showFps = true; G.loadMap('aurora', 26, 31); });
await sleep(1200);
const t = await page.evaluate(() => document.getElementById('tuthint').textContent);
console.log('hint', t);
// 教學步驟會依條件前進
await page.evaluate(() => { const G = window.__game; G.flags.talkedGuide = true; G.raiseStat('str'); });
await sleep(1200);
console.log('hint2', await page.evaluate(() => document.getElementById('tuthint').textContent));
