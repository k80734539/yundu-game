// 三轉：條件、試煉之間與專屬 Boss、轉職、15 個新技能（被動／增益生效、主動技能施放）
const R = await page.evaluate(() => {
  const G = window.__game, DB = window.__DB, ch = G.player.ch, p = G.player, out = {}; G.loop.running = false; const step = 1 / 60;
  const Q = (id) => (Array.isArray(DB.quest) ? DB.quest.find((q) => q.id === id) : DB.quest[id]);
  const chains = { paladin: ['swordsman', 'templar'], elementalist: ['mage', 'archmage'], ranger: ['archer', 'sniper'] };
  out.jobs = {};
  for (const [t2, [t1, t3]] of Object.entries(chains)) {
    const r = {};
    ch.baseLv = 69; ch.job = 'novice'; ch.jobLv = 10; G.changeJob(t1); ch.jobLv = 40; G.changeJob(t2); ch.jobLv = 50; ch.skills = { basic: 9 };
    delete G.quests.s['trial3_' + t3];
    r.acceptAt69 = G.quests.canAccept(Q('trial3_' + t3)); ch.baseLv = 70; r.acceptAt70 = G.quests.canAccept(Q('trial3_' + t3));
    G.quests.accept('trial3_' + t3); G.loadMap(Q('trial3_' + t3).arena, 20, 30);
    const boss = G.monsters.find((m) => m.isMvp); r.boss = boss && boss.def.id; p.x = p.px = boss.x; p.y = p.py = boss.y + 5;
    // 開打：觀察招式、擊敗
    p.maxHp = p.hp = 1e8; p.d.def = 0; const rc = p.recalc; p.recalc = () => {}; p.ch.job = 'novice';
    G.applyDamage(p, boss, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);
    const mv = []; const fn = (e) => mv.push(e.move); G.ev.on('bossmove', fn);
    for (let i = 0; i < 60 * 30; i++) { G.update(step); p.hp = p.maxHp; if (boss.hp < boss.maxHp * 0.7) boss.hp = boss.maxHp * 0.7; }
    boss.hp = boss.maxHp * 0.4; for (let i = 0; i < 60 * 25; i++) { G.update(step); p.hp = p.maxHp; if (boss.hp < boss.maxHp * 0.35) boss.hp = boss.maxHp * 0.35; }
    r.moves = [...new Set(mv)]; boss.hp = 1; G.applyDamage(p, boss, 9e8, 'deal'); for (let i = 0; i < 400; i++) G.update(step);
    p.recalc = rc; r.bossDead = boss.dead; r.complete = G.quests.complete(Q('trial3_' + t3));
    // 轉職
    ch.job = t2; G.quests.turnIn('trial3_' + t3); G.changeJob(t3); r.job = ch.job; r.ptsAfterChange = ch.skillPts; r.weapon = G.player.weaponType(); r.hasGift = G.inv.items.some((i) => ['holy_lance', 'archmage_rod', 'sniper_bow'].includes(i.id));
    out.jobs[t3] = r;
  }
  // 技能：學滿、被動與增益實際提升能力、主動技能全部施放
  out.skills = {};
  for (const t3 of ['templar', 'archmage', 'sniper']) {
    const t2 = DB.job[t3].prev, t1 = DB.job[t2].prev;
    ch.baseLv = 80; ch.job = 'novice'; ch.jobLv = 10; G.changeJob(t1); ch.jobLv = 40; G.changeJob(t2); ch.jobLv = 50; G.changeJob(t3); ch.jobLv = 50; ch.skills = { basic: 9 }; ch.skillPts = 999;
    for (let round = 0; round < 12; round++) for (const jid of [t1, t2, t3]) for (const id of DB.job[jid].skills) { let g = 0; while (g++ < 12 && G.canLearn(id)) G.learnSkill(id); }
    p.recalc(true); const d0 = { ...p.d.total }, def0 = p.d.def, crit0 = p.d.crit, hit0 = p.d.hit, matk0 = p.d.matkMax;
    const learned = DB.job[t3].skills.map((id) => id + ':' + (ch.skills[id] || 0));
    // 增益
    G.skillCd = {}; p.sp = p.maxSp = 9999; const buff = DB.job[t3].skills.find((id) => DB.skill[id].effect === 'buff'); G.useSkill(buff); for (let i = 0; i < 5; i++) G.update(step);
    const d1 = p.d.total; const r = { learned, buff, buffUp: { def: p.d.def - def0, int: d1.int - d0.int, crit: p.d.crit - crit0, hit: p.d.hit - hit0 } };
    // 主動技能施放（站在遺跡守衛旁，怪物無限血）
    G.loadMap('ruins', 10, 47); const m = G.monsters.filter((x) => !x.dead && !x.isMvp)[0]; m.hp = m.maxHp = 1e9; m.x = m.px = p.x + 2; m.y = m.py = p.y + 1; p.chase = m;
    r.casts = {};
    for (const id of DB.job[t3].skills.filter((i) => DB.skill[i].type === 'active' && DB.skill[i].effect !== 'buff')) {
      G.skillCd = {}; p.sp = p.maxSp; const h0 = m.hp; p.chase = m; G.useSkill(id); for (let i = 0; i < 60 * 8; i++) { G.update(step); p.hp = p.maxHp; if (!G.skills.cast && !G.skills.pending && i > 90) break; }
      for (let i = 0; i < 90; i++) G.update(step);
      r.casts[id] = Math.round(h0 - m.hp);
    }
    out.skills[t3] = r;
  }
  return out;
});
console.log(JSON.stringify(R));
