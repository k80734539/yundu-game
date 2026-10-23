// 動作生命週期、命中時序、快速跳訊息與直／橫式截圖。
import assert from 'node:assert/strict';
import {newPage,outDir,SIZES} from './lib.mjs';
export async function motion(b,url){
 for(const [W,H] of SIZES){
  const {ctx,pg,jsErrors}=await newPage(b,W,H,{seed:true});
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1600);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
   const reset=async()=>{await pg.evaluate("G_().party.forEach(p=>{p.hp=p.mhp;p.mp=p.mmp});__sb(['河伯'],{noEsc:1});G_().B.ai=0;G_().B.ph='cmd';G_().B.msgs=[]");await pg.clock.runFor(500);};
   const dir=outDir('motion',`${W}x${H}`);
   for(const [name,actor,pend] of [['qz_attack',0,{t:'atk'}],['bl_attack',1,{t:'atk'}],['qz_cast',0,{t:'sk',s:'橫掃'}],['bl_cast',1,{t:'sk',s:'狐火'}],['bl_rain',1,{t:'sk',s:'春霖'}]]){
    await reset();await pg.evaluate(({actor,pend})=>{G_().B.ai=actor;__ex(pend,G_().B.en[0]);},{actor,pend});
    await pg.clock.runFor(20);
    const state=await pg.evaluate(actor=>{const a=G_().B.motion.find(a=>a.p===G_().party[actor]);return {at:a.at,impact:a.impact,dur:a.dur,hits:G_().B.fx.map(f=>f.at),cast:battlePose(a.p,performance.now()).cast};},actor);
    assert(state.dur>=500&&state.dur<=900);assert.equal(state.cast,pend.t==='sk');
    assert.equal(state.hits[0],state.at+state.impact);
    await pg.clock.runFor(state.impact);
    await pg.screenshot({path:`${dir}/${name}.png`});
    await pg.clock.runFor(state.dur+30);
    assert.equal(await pg.evaluate(actor=>battlePose(G_().party[actor],performance.now()),actor),null,'必須回到原位');
   }
   await reset();await pg.evaluate("G_().B.turn=3;__ep()");await pg.clock.runFor(20);
   assert.equal(await pg.evaluate("G_().party.some(p=>battlePose(p,performance.now()))"),false,'命中前不後仰');
   const impacts=await pg.evaluate("G_().B.motion.map(a=>a.at)");assert.equal(impacts[1]-impacts[0],90);
   await pg.clock.runFor(700);await pg.screenshot({path:`${dir}/hurt.png`});
   assert.equal(await pg.evaluate("battlePose(G_().party[1],performance.now()).k"),'hurt');
   await pg.clock.runFor(600);assert.equal(await pg.evaluate("G_().party.some(p=>battlePose(p,performance.now()))"),false);
   await reset();await pg.evaluate("__ex({t:'atk'},G_().B.en[0]);press('ok')");await pg.clock.runFor(20);
   assert(await pg.evaluate("G_().B.motion.some(a=>a.p===G_().party[0])"),'跳過訊息仍啟動動作');
   await pg.evaluate("__sb(['小水妖'],{})");assert.equal(await pg.evaluate("(G_().B.motion||[]).length"),0,'新戰鬥清除動作');
   assert.deepEqual(await jsErrors(),[]);console.log(`[motion ${W}x${H}] timing, return, skip, reset; errors=[] → PASS`);
  }finally{await ctx.close();}
 }
 return true;
}
