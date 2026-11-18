// 其餘 6 隻 Boss 的機制畫面：魔力屏障、影隱身、追蹤雷擊、虛空牽引
const prep = (map, id) => page.evaluate(([map, id]) => { const G = window.__game; G.flags.tutOff = true; G.ui.tutorialHint(); G.atmos.cfg.on = false; const mv = window.__DB.map[map].mvp; G.loadMap(map, mv.x - 3, mv.y + 3); const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; const b = G.monsters.find((m) => m.def.id === id); G.applyDamage(p, b, 1, 'deal'); G.hitStop = 0; return true; }, [map, id]);
const until = (cond, secs = 60) => page.evaluate(([cond, secs]) => { const G = window.__game, f = new Function('G', 'return ' + cond); G.loop.running = false; for (let i = 0; i < secs * 60 && !f(G); i++) { G.update(1 / 60); G.player.hp = G.player.maxHp; G.hitStop = 0; } G.loop.start(); return f(G); }, [cond, secs]);
const snap = async (n) => { await sleep(300); await page.screenshot({ path: `screenshots/Boss_${n}.png` }); };
await prep('trial_archmage', 'trial_archmage'); await until("G.monsters.find((m) => m.def.id === 'trial_archmage').boss.gm.shieldHP > 0", 10); await snap('湮魔力屏障');
await prep('trial_sniper', 'trial_sniper'); await until("G.monsters.find((m) => m.def.id === 'trial_sniper').boss.gm.cloakOn > 1", 60); await snap('影隱身');
await prep('sky', 'sky_guardian'); await until("G.hazards.filter((h) => h.label === '雷擊').length >= 2", 60); await snap('蒼雷追蹤雷擊');
await prep('abyss', 'abyss_lord'); await until("G.monsters.find((m) => m.def.id === 'abyss_lord').boss.gm.pullT > 1", 90); await snap('深淵牽引');
