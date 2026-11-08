// 存檔驗證：用假的 db（存在 sessionStorage）模擬雲端，驗證「清除本機資料後從雲端還原」「刪除同步」「較新者勝出」「沒有雲端時的提示」「匯出匯入」
await page.addInitScript(() => {
  const fakeDb = { doc: (p) => ({ get: async () => { const v = sessionStorage.getItem('cloud:' + p); return { exists: v !== null, data: () => (v ? JSON.parse(v) : undefined) }; }, set: async (d) => { sessionStorage.setItem('cloud:' + p, JSON.stringify(d)); }, delete: async () => sessionStorage.removeItem('cloud:' + p) }) };
  if (!sessionStorage.getItem('nocloud')) window.claude = { use: async (n) => (n === 'user' ? { id: async () => 'u1' } : n === 'db' ? fakeDb : null) };
});
const ready = async () => { await page.waitForFunction(() => window.__game && document.querySelector('#title .slot'), null, { timeout: 15000 }); await page.waitForFunction(() => window.__game.save.cloud.state !== 'pending', null, { timeout: 15000 }); await sleep(200); };
await page.reload(); await ready();
console.log('1 status', await page.evaluate(() => JSON.stringify([window.__game.save.cloud.state, window.__game.save.statusText().level])));
// 在欄位 1 建立角色、改一些資料、存檔
await page.fill('#slot-name-1', '雲端測試'); await page.click('.slot:nth-child(1) .btn');
await page.waitForFunction(() => !window.__game.inTitle);
await page.evaluate(async () => { const G = window.__game; G.player.ch.zeny = 77777; G.inv.add('falchion', 1, { rar: 'legend', roll: { atk: 55 }, aff: [{ k: 'crit', v: 6 }] }); G.save.save(true); await G.save.flush(); });
console.log('2 cloud doc', await page.evaluate(() => { const v = JSON.parse(sessionStorage.getItem('cloud:data/users/u1/save_s1') || 'null'); return v && { name: v.name, lv: v.lv, hasRaw: !!v.raw, size: v.raw.length }; }));
// 模擬「換一台裝置／清除網站資料」：本機清空，雲端還在
await page.evaluate(() => localStorage.clear());
await page.reload(); await ready();
console.log('3 restored list', await page.evaluate(() => JSON.stringify(window.__game.save.list().map((s) => s && s.name))));
await page.click('.slot:nth-child(1) .btn');
await page.waitForFunction(() => !window.__game.inTitle);
console.log('4 loaded', await page.evaluate(() => { const G = window.__game; return JSON.stringify({ name: G.player.ch.name, zeny: G.player.ch.zeny, falchion: G.inv.items.find((i) => i.id === 'falchion')?.roll }); }));
// 較新者勝出：雲端比本機新 → 用雲端
await page.evaluate(async () => { const G = window.__game; G.player.ch.zeny = 11111; G.save.save(true); await G.save.flush(); const k = 'cloud:data/users/u1/save_s1'; const d = JSON.parse(sessionStorage.getItem(k)); sessionStorage.setItem('old', localStorage.getItem('rom.save.s1')); G.player.ch.zeny = 22222; G.save.save(true); await G.save.flush(); });
await page.evaluate(() => { localStorage.setItem('rom.save.s1', sessionStorage.getItem('old')); }); // 本機退回舊版本（時間較早）
await page.reload(); await ready();
await page.click('.slot:nth-child(1) .btn'); await page.waitForFunction(() => !window.__game.inTitle);
console.log('5 newer wins (expect 22222)', await page.evaluate(() => window.__game.player.ch.zeny));
// 刪除會同步到雲端（在標題畫面刪除，和實際操作一致）
await page.reload(); await ready();
await page.evaluate(async () => { const G = window.__game; G.save.deleteSlot(1); await G.save.flush(); });
console.log('6 after delete', await page.evaluate(() => JSON.stringify(JSON.parse(sessionStorage.getItem('cloud:data/users/u1/save_s1') || 'null'))));
await page.reload(); await ready();
console.log('7 list after delete', await page.evaluate(() => JSON.stringify(window.__game.save.list())));
// 匯出匯入
await page.fill('#slot-name-2', '匯出測試'); await page.click('.slot:nth-child(2) .btn'); await page.waitForFunction(() => !window.__game.inTitle);
const code = await page.evaluate(async () => { const G = window.__game; G.player.ch.zeny = 4242; G.save.save(true); return G.save.exportCode(2); });
console.log('8 code', code.slice(0, 12), code.length > 100);
await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('nocloud', '1'); });
await page.reload(); await page.waitForFunction(() => window.__game && document.querySelector('#title .slot')); await sleep(300);
console.log('9 no cloud status', await page.evaluate(() => JSON.stringify(window.__game.save.statusText())));
const err = await page.evaluate((c) => [window.__game.save.importCode(3, 'abc'), window.__game.save.importCode(3, c), JSON.stringify(window.__game.save.list().map((s) => s && s.name + s.baseLv))], code);
console.log('10 import', JSON.stringify(err));
await page.evaluate(() => window.__game.ui.refreshTitle()); await sleep(300);
await page.screenshot({ path: 'screenshots/存檔_標題.png' });
await page.evaluate(() => sessionStorage.removeItem('nocloud'));
