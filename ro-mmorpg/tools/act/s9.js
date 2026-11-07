// 階段 9：解鎖音訊、BGM 依地圖切換（交叉淡入淡出）、音效、音量設定
await page.mouse.click(640, 400);
await sleep(500);
const a = await page.evaluate(() => { const A = window.__game.audio; return { state: A.ctx && A.ctx.state, theme: A.cur && A.cur.theme, step: A.cur && A.cur.step }; });
console.log('town', JSON.stringify(a));
// 用 AnalyserNode 量實際輸出
const level = () => page.evaluate(() => new Promise((res) => { const A = window.__game.audio; const an = A.ctx.createAnalyser(); A.master.connect(an); const buf = new Float32Array(an.fftSize); setTimeout(() => { an.getFloatTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v)); res(m); }, 400); }));
console.log('level town', (await level()).toFixed(3));
await page.evaluate(() => window.__game.loadMap('mine1', 30, 50));
await sleep(2200);
const b = await page.evaluate(() => { const A = window.__game.audio; return { theme: A.cur.theme, fading: A.old.length }; });
console.log('mine1', JSON.stringify(b));
await page.evaluate(() => { const A = window.__game.audio; for (const s of ['hit', 'crit', 'levelup', 'pickup', 'skill_fire_burst', 'thunder', 'questdone']) A.sfx(s); });
await page.evaluate(() => { const G = window.__game; G.audio.setVol('bgm', 0.3); G.ui.open('options'); });
console.log('vol', await page.evaluate(() => JSON.stringify(window.__game.audio.vol)));
await page.evaluate(() => window.__game.loadMap('aurora', 25, 30));
await sleep(1500);
