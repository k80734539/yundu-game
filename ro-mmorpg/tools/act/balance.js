// 平衡模擬：機器人在南方草原→微風森林練功，用固定步長直接跑 Game.update（不繪製），量到 Base Lv10 的遊戲時間
const res = await page.evaluate(() => {
  const G = window.__game, p = G.player, ch = p.ch;
  G.loop.running = false;                       // 停掉即時迴圈，改成手動快轉
  G.loadMap('prt_fild', 28, 8);
  G.inv.add('red_potion', 25); // 模擬玩家買了藥水
  const plan = ['str', 'agi', 'str', 'dex', 'agi', 'str', 'vit'];
  let t = 0, kills = 0, deaths = 0, potions = 0; const lvT = {}; const killers = {};
  G.ev.on('kill', () => kills++);
  const step = 1 / 60;
  while (t < 60 * 40 && ch.baseLv < 10) {
    // 加點
    for (let k = 0; k < 7 && ch.statPts > 0; k++) G.raiseStat(plan[(ch.baseLv + k) % plan.length]);
    if (ch.skillPts > 0) G.learnSkill('basic');
    if (p.dead) { deaths++; for (const m of G.monsters) if (m.target === p && m.atkAnimT >= -1 && Math.hypot(m.x - p.x, m.y - p.y) < 3) killers[m.def.id] = (killers[m.def.id] || 0) + 1; G.respawn(); for (let i = 0; i < 40; i++) G.update(step); G.loadMap(ch.baseLv >= 6 ? 'forest' : 'prt_fild', ch.baseLv >= 6 ? 6 : 28, ch.baseLv >= 6 ? 30 : 8); }
    if (!p.chase && !p.dead && t % 0.5 < step) {
      const ms = G.monsters.filter((m) => !m.dead && m.def.lv <= ch.baseLv + 2).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      if (ms[0]) p.chase = ms[0];
    }
    if (p.hp < p.maxHp * 0.35 && G.inv.count('red_potion') > 0 && t % 1 < step && G.monsters.some((m) => m.aggroOn === p)) { const it = G.inv.items.find((i) => i.id === 'red_potion'); G.useItem(it.uid); potions++; }
    // 沒被追時血太少就停下來休息
    if (p.hp < p.maxHp * 0.5 && !G.monsters.some((m) => m.aggroOn === p && !m.dead)) { p.chase = null; if ((ch.skills.basic || 0) >= 3 && p.state !== 'sit') G.toggleSit(); G.update(step); t += step; continue; }
    if (p.state === 'sit' && p.hp >= p.maxHp * 0.95) G.toggleSit();
    if (ch.baseLv >= 6 && G.map.def.id === 'prt_fild') G.loadMap('forest', 6, 30);
    G.update(step); t += step;
    if (!lvT[ch.baseLv]) lvT[ch.baseLv] = Math.round(t);
  }
  return { minutes: (t / 60).toFixed(1), lv: ch.baseLv, jlv: ch.jobLv, kills, deaths, potions, zeny: ch.zeny, lvT, killers };
});
console.log('balance', JSON.stringify(res));
