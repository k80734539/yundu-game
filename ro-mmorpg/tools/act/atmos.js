// 氛圍渲染：晨曦鎮白天／黃昏／夜晚、光影關閉對照、野外夜晚；網址 ?hour= 由外部指定，這裡切換開關
const shot = async (name, fn) => { await page.evaluate(fn); await sleep(900); await page.screenshot({ path: `screenshots/${name}.png` }); };
const H = [['氛圍_白天', 13], ['氛圍_黃昏', 18.3], ['氛圍_夜晚', 22.5]];
await page.evaluate(() => { const G = window.__game; G.skipStory && G.skipStory(); G.flags.tutOff = true; G.ui.tutorialHint(); G.flags.story = { q: null, step: 0, n: 0, started: false, done: window.__STORY.quests.map((q) => q.id), seen: [] }; G.loadMap('aurora', 27, 30); });
for (const [n, hr] of H) await shot(n, `(() => { const A = window.__game.atmos; A.fixedHour = ${hr}; A.cfg.on = true; })()`);
await shot('氛圍_關閉對照', () => { const A = window.__game.atmos; A.fixedHour = 13; A.cfg.on = false; });
await shot('氛圍_野外夜晚', () => { const G = window.__game, A = G.atmos; A.cfg.on = true; A.fixedHour = 22.5; G.loadMap('forest', 20, 30); });
const info = await page.evaluate(() => ({ fps: window.__game.loop.fps, night: window.__game.atmos.night(22.5), active: window.__game.atmos.active() }));
console.log(JSON.stringify(info));
