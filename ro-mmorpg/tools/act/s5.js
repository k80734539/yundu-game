// 階段 5：打開背包、裝備、技能視窗與商店，快捷列有道具
await page.evaluate(() => { const G = window.__game; G.loadMap('aurora', 33, 21); G.player.ch.zeny = 5000; G.inv.add('sword'); G.inv.add('ribbon'); G.inv.add('jelly', 12); G.inv.add('jelly_card'); G.player.ch.skillPts = 3; G.ev.emit('stats'); });
await sleep(800);
// 點道具商人
const pos = await page.evaluate(() => { const G = window.__game; const n = G.npcs.find((n) => n.def.id === 'tool'); const L = G.cam.left(G.r.w), T = G.cam.top(G.r.h); return [((n.x - n.y) * 32 - L) * G.r.scale / G.r.dpr, ((n.x + n.y) * 16 - T - 40) * G.r.scale / G.r.dpr]; });
await page.mouse.click(pos[0], pos[1]);
await page.waitForFunction(() => window.__game.ui.dialog.isOpen, null, { timeout: 8000 });
for (let i = 0; i < 6 && !(await page.evaluate(() => document.querySelectorAll('.dlg-opt').length)); i++) { await page.keyboard.press('Enter'); await sleep(120); }
await page.keyboard.press('1'); await sleep(200);
await page.waitForFunction(() => document.getElementById('win-shop') && !document.getElementById('win-shop').classList.contains('hidden'), null, { timeout: 8000 });
await page.evaluate(() => { const G = window.__game; G.buy('red_potion', 10); G.buy('blue_potion', 2); });
await page.keyboard.down('Alt'); await page.keyboard.press('e'); await page.keyboard.press('q'); await page.keyboard.press('s'); await page.keyboard.up('Alt');
await page.evaluate(() => {
  const set = (id, x, y) => { const w = document.getElementById('win-' + id); w.style.left = x + 'px'; w.style.top = y + 'px'; };
  set('shop', 250, 200); set('inventory', 960, 160); set('equip', 600, 60); set('skills', 600, 330);
  window.__game.hotbar[1] = { type: 'item', id: 'blue_potion' }; window.__game.hotbar[2] = { type: 'skill', id: 'first_aid' }; window.__game.ui.hot.render();
});
await page.keyboard.press('F1');
await sleep(500);
const st = await page.evaluate(() => { const G = window.__game; return { zeny: G.player.ch.zeny, red: G.inv.count('red_potion'), w: G.inv.weight() }; });
console.log('state', JSON.stringify(st));
