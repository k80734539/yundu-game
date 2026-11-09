// 三轉對話流程：條件不足的提示、達標後的選項、接試煉、試煉中的「前往試煉之間」
const opts = () => page.evaluate(() => [...document.querySelectorAll('.dlg-opt')].map((e) => e.textContent));
const text = () => page.evaluate(() => (document.querySelector('.dlg-text') || {}).textContent);
const until = async () => { for (let i = 0; i < 14; i++) { if ((await opts()).length || !(await page.evaluate(() => window.__game.ui.dialog.isOpen))) return; await page.keyboard.press('Enter'); await sleep(110); } };
const key = async (k) => { await page.keyboard.press(k); await sleep(160); };
const talk = async () => { await page.evaluate(() => { const G = window.__game; G.talkTo(G.npcs.find((n) => n.def.id === 'job')); }); await sleep(150); await until(); };
await page.evaluate(() => { const G = window.__game, ch = G.player.ch; ch.baseLv = 50; ch.job = 'novice'; ch.jobLv = 10; G.changeJob('swordsman'); ch.jobLv = 40; G.changeJob('paladin'); ch.jobLv = 50; G.loadMap('aurora', 25, 13); });
await sleep(500);
console.log('mark(base50)', await page.evaluate(() => window.__game.quests.mark('job')));
await talk(); console.log('base50 text', await text()); await key('Escape'); await sleep(150);
await page.evaluate(() => { window.__game.player.ch.baseLv = 60; });
console.log('mark(base60)', await page.evaluate(() => window.__game.quests.mark('job')));
await talk(); await key('1'); await until(); console.log('offer opts', (await opts()).join('/'));
await key('1'); await sleep(200); await until(); console.log('accept opts', (await opts()).join('/')); await key('1'); await sleep(250); console.log('after accept', JSON.stringify(await page.evaluate(() => Object.entries(window.__game.quests.s).filter(([k]) => k.startsWith('trial3')))));
await page.keyboard.press('Escape'); await sleep(150);
await talk(); await key('1'); await until(); console.log('in-progress opts', (await opts()).join('/'));
