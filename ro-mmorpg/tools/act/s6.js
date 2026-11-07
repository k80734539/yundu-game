// 階段 6：和導覽員對話 → 接任務 → 擊殺進度 → 回報；最後停在選項畫面
const clickNpc = async (id) => {
  const pos = await page.evaluate((id) => { const G = window.__game; const n = G.npcs.find((n) => n.def.id === id); const L = G.cam.left(G.r.w), T = G.cam.top(G.r.h); return [((n.x - n.y) * 32 - L) * G.r.scale / G.r.dpr, ((n.x + n.y) * 16 - T - 40) * G.r.scale / G.r.dpr]; }, id);
  await page.mouse.click(pos[0], pos[1]);
  await page.waitForFunction(() => window.__game.ui.dialog.isOpen, null, { timeout: 8000 });
};
const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opt')].map((e) => e.textContent));
const until = async () => { for (let i = 0; i < 12; i++) { if ((await opts()).length) return; await page.keyboard.press('Enter'); await sleep(90); } };
await page.evaluate(() => { window.__game.loadMap('aurora', 27, 30); });
await sleep(700);
await clickNpc('guide');
await until();
console.log('menu', await opts());
await page.keyboard.press('4'); await sleep(120); await until();        // 新手任務
console.log('quest menu', await opts());
await page.keyboard.press('1'); await sleep(120); await until();        // 新任務
await page.keyboard.press('1'); await sleep(120); await sleep(200);     // 接受
await page.keyboard.press('Enter'); await sleep(200);
for (let i = 0; i < 5; i++) await page.evaluate(() => window.__game.quests.onKill('jelly'));
console.log('mark', await page.evaluate(() => window.__game.quests.mark('guide')));
await clickNpc('guide'); await until();
await page.keyboard.press('4'); await sleep(120); await until();
console.log('turnin menu', await opts());
await page.keyboard.press('1'); await sleep(120); await sleep(300);
const st = await page.evaluate(() => ({ done: window.__game.quests.isDone('q_tut1'), exp: window.__game.player.ch.baseExp, red: window.__game.inv.count('red_potion') }));
console.log('after', JSON.stringify(st));
for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await sleep(80); }
// 接第二個任務，然後跟隊長對話停在選項
await clickNpc('guide'); await until(); await page.keyboard.press('4'); await sleep(120); await until(); await page.keyboard.press('1'); await sleep(120); await until(); await page.keyboard.press('1'); await sleep(120); await sleep(150); await page.keyboard.press('Enter');
await page.evaluate(() => { window.__game.inv.add('jelly', 3); window.__game.loadMap('aurora', 43, 28); });
await sleep(800);
await clickNpc('captain'); await until(); await page.keyboard.press('1'); await sleep(120); await until(); await page.keyboard.press('1'); await sleep(120); await sleep(900);
