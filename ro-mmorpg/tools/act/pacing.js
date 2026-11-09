// 升級節奏模擬：機器人從 Lv1 練起，依等級自動換地圖、加點、學技能、轉職（略過試煉任務），記錄各等級／職業等級的遊戲內時間。
// 用法：把 'CLSNAME' 換成 swordsman/mage/archer，CAPMIN_VAL 換成上限（遊戲內分鐘）。無裝備升級、藥水無限、不做任務，所以是「最保守」的節奏。
const res = await page.evaluate(() => {
  const BUYGEAR = true, CLS = 'CLSNAME', CAPMIN = CAPMIN_VAL;
  const G = window.__game, p = G.player, ch = p.ch, DB = window.__DB;
  G.loop.running = false;
  const PL = { swordsman: ['str', 'str', 'vit', 'dex', 'agi'], mage: ['int', 'int', 'dex', 'int', 'vit'], archer: ['dex', 'dex', 'agi', 'dex', 'str'] }[CLS];
  const T2 = { swordsman: 'paladin', mage: 'elementalist', archer: 'ranger' }[CLS];
  const T3 = { swordsman: 'templar', mage: 'archmage', archer: 'sniper' }[CLS];
  const PRI = {
    swordsman: ['bash:5', 'sword_mastery:5', 'battle_spirit:5', 'bash:10', 'sword_mastery:10', 'hp_recovery:3', 'provoke:5', 'endure:3', 'magnum:5', 'battle_spirit:10', 'spear_mastery:5', 'pierce:10', 'riding:3', 'guard:5', 'whirlwind:5', 'templar_mastery:5', 'holy_smite:10', 'judgment_hammer:10', 'divine_aegis:10', 'heaven_wrath:5', 'templar_mastery:10'],
    mage: ['firebolt:5', 'arcane:3', 'coldbolt:5', 'mana_focus:5', 'soulstrike:5', 'thunderstorm:5', 'firebolt:10', 'arcane:10', 'coldbolt:10', 'mana_focus:10', 'soulstrike:10', 'thunderstorm:10', 'sp_recovery:5', 'mana_cycle:5', 'meteor:10', 'frost_nova:10', 'chain_lightning:10', 'barrier:5', 'arcane_supremacy:5', 'arcane_burst:10', 'void_lance:10', 'mana_surge:10', 'cataclysm:5', 'arcane_supremacy:10'],
    archer: ['double_strafe:5', 'armor_pierce:5', 'owl_eye:5', 'eagle_focus:5', 'double_strafe:10', 'vulture_eye:3', 'concentration:3', 'arrow_shower:5', 'charge_arrow:5', 'owl_eye:10', 'armor_pierce:10', 'eagle_focus:10', 'hunter_instinct:5', 'multi_shot:10', 'seeker_arrow:10', 'falcon:5', 'trap:5', 'wind_step:5', 'sniper_mastery:5', 'snipe:10', 'rain_of_death:10', 'hunters_mark:10', 'phantom_volley:5', 'sniper_mastery:10'],
  }[CLS].map((e) => e.split(':'));
  const mapFor = (lv) => (lv >= 60 ? ['volcano', 12, 50] : lv >= 48 ? ['snowfield', 46, 20] : lv >= 35 ? ['ruins', 10, 47] : lv >= 30 ? ['mine2', 24, 24] : lv >= 22 ? ['canyon', 20, 20] : lv >= 18 ? ['swamp', 30, 30] : lv >= 15 ? ['mine1', 24, 24] : lv >= 10 ? ['coast', 20, 30] : lv >= 5 ? ['forest', 6, 30] : ['prt_fild', 28, 8]);
  const step = 1 / 60; let t = 0, curMap = '', kills = 0, deaths = 0, lastLvT = 0, lastLv = 1;
  const ms = {}, killsByMap = {}, deathsByMap = {}; G.ev.on('kill', (id) => { kills++; if (BUYGEAR) { const md = DB.monster[id]; if (md) for (const d of md.drops) { const it = DB.item[d.item]; if (it) ch.zeny += d.rate * Math.floor(it.price / 2); } const zd = window.__LOOT.zenyDrop; if (md && zd) ch.zeny += md.lv * zd.perLevel * zd.chance; } /* 期望值：撿起掉落物並賣店（含 Zeny 掉落） */ killsByMap[curMap] = (killsByMap[curMap] || 0) + 1; });
  let idleT = 0, buyT = 0; const bought = [], mine = {}, mineUid = {}; let jobTier = 0, potCd = 0, skT = 0, buffT = 0, learnT = 0, fin = null;
  const rec = (k) => { if (!(k in ms)) ms[k] = +(t / 60).toFixed(1); };
  const sc = (id) => { const s = DB.skill[id], lv = ch.skills[id]; return ((s.power || [100])[lv - 1] || 100) * (s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1)) / (((s.cast || [0])[lv - 1] || 0) + ((s.cd || [0.5])[lv - 1] || 0.5)); };
  while (t < CAPMIN * 60) {
    // 買裝備（真的用掉落賣出前的 Zeny；每 20 秒檢查，每欄位買買得起的最好一件）
    if (BUYGEAR && (buyT -= step) <= 0) { buyT = 20; const shops = (Array.isArray(DB.shop) ? DB.shop : Object.values(DB.shop)).filter((x) => x.id === 'weapon' || x.id === 'quarter'); const cand = shops.flatMap((x) => x.items).map((id) => DB.item[id]).filter((i) => i && i.slot && i.jobs && i.jobs.includes(ch.job) && (i.slot !== 'weapon' || ({ archer: ['bow'], ranger: ['bow'], mage: ['staff'], elementalist: ['staff'], swordsman: ['sword'], paladin: ['sword', 'spear'], templar: ['sword', 'spear'], archmage: ['staff'], sniper: ['bow'] })[ch.job]?.includes(i.wtype) !== false));  // 武器只買本職主武器
      for (const slot of ['weapon', 'armor', 'head', 'shield', 'garment', 'shoes']) { const val = (i) => (i.atk || 0) + (i.matk || 0) + (i.def || 0) * 4 + (i.mdef || 0); const curV = mine[slot] ?? -1;
        const best = cand.filter((i) => i.slot === slot && i.price <= ch.zeny && val(i) >= curV * 1.2 + 2).sort((a, b) => val(b) - val(a))[0];  // 只買明顯升級的
        if (best) { G.inv.add(best.id); const it = G.inv.items.filter((i) => i.id === best.id).pop(); if (!it) continue; ch.zeny -= best.price; G.inv.equipItem(it.uid, ch.job, ch.baseLv); if (mineUid[slot]) { try { G.sell(mineUid[slot], 1); } catch (e) { /* ignore */ } } mineUid[slot] = it.uid; p.recalc(true); mine[slot] = val(best); bought.push(best.id + '@Lv' + ch.baseLv); } } }
    // 轉職（略過試煉）
    if (jobTier === 0 && ch.jobLv >= 10 && (ch.skills.basic || 0) >= 9) { G.changeJob(CLS); jobTier = 1; rec('轉職一轉(分)'); G.resetStats(); }  // Lv20 以下重新配點免費
    if (jobTier === 2 && ch.jobLv >= 50 && ch.baseLv >= 70) { G.changeJob(T3); jobTier = 3; rec('轉職三轉(分)'); }
    if (jobTier === 1 && ch.jobLv >= 40) { G.changeJob(T2); jobTier = 2; rec('轉職二轉(分)'); }
    // 加點
    for (let k = 0; k < 10 && ch.statPts > 0; k++) { const b = ch.statPts; { const plan = jobTier === 0 ? ['str', 'dex', 'agi', 'str', 'vit'] : PL; G.raiseStat(plan[(ch.baseLv + k) % plan.length]); } if (ch.statPts === b) break; }
    learnT -= step; if (ch.skillPts > 0 && learnT <= 0) { learnT = 0.3; if ((ch.skills.basic || 0) < 9 && jobTier === 0) G.learnSkill('basic'); else for (const [id, cap] of PRI) if (DB.skill[id] && (ch.skills[id] || 0) < +cap && G.learnSkill(id)) break; }
    if (ch.baseLv !== lastLv) { for (let l = lastLv + 1; l <= ch.baseLv; l++) if (l % 5 === 0 || l === 10) rec('Lv' + l + '(分)'); lastLv = ch.baseLv; lastLvT = t; }
    if (ch.jobLv % 10 === 0) rec('Job' + ch.jobLv + '(分)');
    if (ch.baseLv >= 80) { fin = 'Lv80'; break; }
    if (t - lastLvT > 40 * 60) { fin = '停滯：40 分鐘沒升級(Lv' + ch.baseLv + ')'; break; }
    // 換地圖
    const [mid, mx, my] = mapFor(ch.baseLv);
    if (mid !== curMap) { curMap = mid; G.loadMap(mid, mx, my); }
    // 藥水（假設一直買得起）
    for (const id of ['red_potion', 'white_potion', 'blue_potion']) if (G.inv.count(id) < 5) G.inv.add(id, 40);
    G.update(step); t += step; potCd -= step; skT -= step; buffT -= step;
    if (p.dead) { deaths++; deathsByMap[curMap] = (deathsByMap[curMap] || 0) + 1; G.respawn(); for (let i = 0; i < 40; i++) G.update(step); G.loadMap(curMap, mx, my); continue; }
    const ptype = ch.baseLv >= 18 ? 'white_potion' : 'red_potion';
    if (potCd <= 0 && p.hp < p.maxHp * 0.45 && G.monsters.some((m) => m.aggroOn === p && !m.dead)) { const it = G.inv.items.find((i) => i.id === ptype); if (it) { G.useItem(it.uid); potCd = 1; } }
    if (potCd <= 0 && p.sp < p.maxSp * 0.15 && ch.baseLv >= 5) { const it = G.inv.items.find((i) => i.id === 'blue_potion'); if (it) { G.useItem(it.uid); potCd = 1; } }
    if (!(p.chase && !p.chase.dead)) {
      const c = G.monsters.filter((m) => !m.dead && !m.isMvp && m.def.lv <= ch.baseLv + 5).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 8);
      let ok = false;
      for (const m of c) { const pa = G.pf.find(p.x, p.y, m.x, m.y, 3000, 1); if (pa && pa.length) { p.chase = m; ok = true; break; } }  // 只追走得到的（避免隔牆的最近目標）
      idleT = ok ? 0 : idleT + step;
      if (idleT > 8) { idleT = 0; G.loadMap(curMap, mx, my); }
    } else idleT = 0;
    if (buffT <= 0) { for (const id of Object.keys(ch.skills)) { const s = DB.skill[id]; if (s && s.effect === 'buff' && (G.skillCd[id] || 0) <= 0 && p.sp > 60) G.useSkill(id); } buffT = 5; }
    if (skT <= 0 && !G.skills.cast && p.chase && !p.chase.dead) {
      const ids = Object.keys(ch.skills).filter((id) => { const s = DB.skill[id]; return s && s.type === 'active' && !['buff', 'debuff'].includes(s.effect) && s.sp && ch.skills[id] > 0; }).sort((a, b) => sc(b) - sc(a));
      for (const id of ids) if ((G.skillCd[id] || 0) <= 0 && p.sp >= DB.skill[id].sp[ch.skills[id] - 1]) { G.useSkill(id); break; }
      skT = 0.1;
    }
  }
  return { zeny: ch.zeny, bought, equipped: G.inv.equip, def: p.d.def, mdef: p.d.mdef, atk: p.d.atkMax ?? p.d.atk, hp: p.maxHp, cls: CLS, end: fin || '時間到', minutes: +(t / 60).toFixed(1), baseLv: ch.baseLv, jobLv: ch.jobLv, job: ch.job, kills, deaths, ms, killsByMap, deathsByMap };
});
console.log('RESULT', JSON.stringify(res));
