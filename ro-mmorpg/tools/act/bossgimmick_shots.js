// 主線 Boss 專屬機制截圖（golem／serpent／frost／wyrm／bandit）
const prep = (map, id, x, y) => page.evaluate(([map, id, x, y]) => { const G = window.__game; G.flags.tutOff = true; G.ui.tutorialHint(); G.loadMap(map, x, y); const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; const b = G.monsters.find((m) => m.def.id === id); G.applyDamage(p, b, 1, 'deal'); G.hitStop = 0; return true; }, [map, id, x, y]);
const until = (cond, secs = 60) => page.evaluate(([cond, secs]) => { const G = window.__game, f = new Function('G', 'return ' + cond); G.loop.running = false; for (let i = 0; i < secs * 60 && !f(G); i++) { G.update(1 / 60); G.player.hp = G.player.maxHp; G.hitStop = 0; } G.loop.start(); return f(G); }, [cond, secs]);
const snap = async (n) => { await sleep(350); await page.screenshot({ path: `screenshots/Boss_${n}.png` }); };
await prep('mine2', 'golem', 29, 26); await until("G.monsters.find((m) => m.def.id === 'golem').boss.gm.expT > 2"); await snap('巨像核心暴露');
await prep('ruins', 'serpent', 39, 15); await until('G.hazards.length >= 2', 90); await snap('巨蛇毒沼');
await prep('canyon', 'bandit_king', 42, 38); await page.evaluate(() => { const b = window.__game.monsters.find((m) => m.def.id === 'bandit_king'); b.hp = b.maxHp * 0.69; }); await until("G.monsters.find((m) => m.def.id === 'bandit_king').boss.gm.shield", 5); await snap('山賊王躲手下');
await prep('snowfield', 'frost_king', 44, 16); await until("G.monsters.find((m) => m.def.id === 'frost_king').boss.gm.bOn > 5", 60); await snap('狼王暴風雪');
await prep('volcano', 'flame_wyrm', 46, 14); await until('G.hazards.some((h) => h.age > h.warn) && G.hazards.length >= 3', 60); await snap('地龍熔岩');
