// 階段 3：走進傳送點換地圖、再回城，最後打開世界地圖
await page.evaluate(() => { const G = window.__game; G.loadMap('aurora', 25, 42); });
await sleep(600);
await page.evaluate(() => window.__game.walkTo(25.5, 47.5));
await page.waitForFunction(() => window.__game.map.def.id === 'prt_fild', null, { timeout: 10000 });
await sleep(800);
const a = await page.evaluate(() => { const p = window.__game.player; return [window.__game.map.def.id, Math.floor(p.x), Math.floor(p.y)]; });
console.log('arrived', a);
await page.evaluate(() => window.__game.walkTo(28.5, 3.5));
await page.waitForFunction(() => window.__game.map.def.id === 'aurora', null, { timeout: 10000 });
await sleep(500);
await page.evaluate(() => { const G = window.__game; G.loadMap('aurora', 42, 25); });
await sleep(1200);
await page.keyboard.press('m');
await page.evaluate(() => { const w = document.getElementById('win-worldmap'); w.style.left = '640px'; w.style.top = '170px'; });
await sleep(600);
