// 逐張地圖截圖（測試用）：TOUR=aurora,forest
const ids = (process.env.TOUR || 'aurora').split(',');
for (const id of ids) {
  await page.evaluate((id) => { const G = window.__game; const d = G.constructor && window.__game; G.loadMap(id); }, id);
  await sleep(1500);
  await page.screenshot({ path: `/tmp/claude-0/map_${id}.png` });
}
