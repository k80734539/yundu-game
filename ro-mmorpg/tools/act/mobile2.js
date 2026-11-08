// 手機介面 v2：預設畫面、選單、背包＋道具動作面板、技能面板、對話框；量測遊戲畫面露出比例
const tag = +process.env.W > +process.env.H ? '橫' : '直';
const shot = (n) => page.screenshot({ path: `screenshots/手機介面_${tag}_${n}.png` });
await page.evaluate(() => { const G = window.__game; G.loadMap('prt_fild', 28, 20); G.quests.accept('q_tut1'); G.inv.add('orange_potion', 3); G.inv.add('ribbon'); G.player.ch.skillPts = 2; G.ev.emit('quest'); G.ev.emit('stats'); });
await sleep(1500);
const cover = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, cv = document.getElementById('game'); let a = 0, g = 0, ca = 0, cg = 0;
  for (let y = 2; y < H; y += 4) for (let x = 2; x < W; x += 4) { const e = document.elementFromPoint(x, y); const ok = e === cv; a++; if (ok) g++; if (x > W * .2 && x < W * .8 && y > H * .2 && y < H * .8) { ca++; if (ok) cg++; } }
  return { gameVisible: +(g / a).toFixed(3), centerVisible: +(cg / ca).toFixed(3) };
});
// 觸控目標尺寸：所有可點的按鈕最小邊
const targets = () => page.evaluate(() => [...document.querySelectorAll('#mdock .mbtn, #hotbar .hot, #hud .hud-expand, .mm-head, .qt-head, .chat-head, #tuthint.folded')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
console.log('DEFAULT', tag, JSON.stringify(await cover()), 'minTarget', Math.min(...await targets()));
await shot('1預設');
await page.tap('#mdock .mbtn.main'); await sleep(300); await shot('2選單');
await page.tap('.mmenu-item:nth-child(2)'); await sleep(400);
console.log('INVENTORY', tag, JSON.stringify(await cover()));
await page.tap('#win-inventory .inv-cell:nth-child(2)'); await sleep(300); await shot('3道具動作');
const btns = await page.evaluate(() => [...document.querySelectorAll('#msheet .mact')].map((b) => b.textContent));
console.log('ITEM BUTTONS', btns.join('/'));
await page.tap('#msheet .mact.pri'); await sleep(300);
await page.tap('#msheet .mact:last-child').catch(() => {}); await sleep(200);
await page.tap('#win-inventory .win-x'); await sleep(200);
await page.tap('#mdock .mbtn:nth-child(3)'); await sleep(300);
await page.tap('#win-skills .sk-row'); await sleep(300); await shot('4技能');
await page.tap('#msheet .mact:last-child'); await page.tap('#win-skills .win-x'); await sleep(200);
console.log('AFTER CLOSE', tag, JSON.stringify(await cover()));
// 對話框
await page.evaluate(() => { const G = window.__game; G.loadMap('aurora', 27, 31); });
await sleep(700);
await page.evaluate(() => { const G = window.__game; G.talkTo(G.npcs.find((n) => n.def.id === 'guide')); });
for (let i = 0; i < 4; i++) { await page.tap('#dialog .dlg-text'); await sleep(150); }
await shot('5對話');
