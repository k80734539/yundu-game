// 8 方向圖片精靈圖：初心者用圖片、朝向依移動方向（斜角）、攻擊時衝刺、轉職後換回程式畫的小人
const r = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch, out = {}; G.loop.running = false; const step = 1 / 60;
  G.skipStory && G.skipStory(); ch.job = 'novice'; ch.baseLv = 5; p.recalc(true); p.look = null; p.refreshLook(); G.loadMap('aurora', 24, 22); G.monsters.length = 0;
  out.rows = p.sheet.rows; out.size = [p.sheet.c.width, p.sheet.c.height];
  return out;
});
await sleep(800);
const r2 = await page.evaluate(() => {
  const G = window.__game, p = G.player, out = {}; G.loop.running = false; const step = 1 / 60;
  out.rowsAfterLoad = p.sheet.rows; out.sizeAfterLoad = [p.sheet.c.width, p.sheet.c.height];
  // 世界方向 → 列號
  const tests = { '+x': [1, 0], '+y': [0, 1], '-x': [-1, 0], '-y': [0, -1], '+x+y': [1, 1], '-x+y': [-1, 1], '-x-y': [-1, -1], '+x-y': [1, -1] };
  out.dir8 = {}; for (const [k, [dx, dy]] of Object.entries(tests)) { p.face(p.x + dx, p.y + dy); out.dir8[k] = p.dir8; }
  // 實際走一段，確認朝向會跟著變
  p.setPath([[p.x + 3, p.y], [p.x + 3, p.y + 3]]); const seen = new Set(); for (let i = 0; i < 60 * 3; i++) { G.update(step); seen.add(p.dir8); }
  out.walkRows = [...seen];
  // 轉職後換回程式畫
  const ch = p.ch; ch.job = 'novice'; ch.jobLv = 10; ch.skills.basic = 9; G.changeJob('swordsman'); out.swordsmanRows = p.sheet.rows || 4;
  return out;
});
console.log(JSON.stringify({ ...r, ...r2 }));
