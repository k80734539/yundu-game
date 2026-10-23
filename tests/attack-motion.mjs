import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';

export async function attackMotion(browser,url,sizes=SIZES){
 for(const [W,H] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{seed:true});
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
   const setup=async(boss=false,ko=false)=>{await pg.evaluate(({boss,ko})=>{
    __sb(boss?['河伯']:['小水妖','小水妖','蘆葦精'],{noEsc:1});
    const B=G_().B;Math.random=()=>.5;B.msgs=[];B.ph='cmd';B.ai=0;B.en.forEach(e=>e.hp=e.mhp=ko?1:9999);
    drawBattle(performance.now());
   },{boss,ko});await pg.clock.runFor(500)};
   const start=async(index)=>pg.evaluate(index=>{
    const B=G_().B;press('ok');for(let i=0;i<index;i++)press('right');press('ok');drawBattle(performance.now());
    const sp=B.qzMotion;return {at:sp.at,hit:B.fx[0].at,target:B.en.indexOf(sp.tg[0]),hp:B.en.map(e=>e.hp)};
   },index);
   const sample=async()=>pg.evaluate(()=>{
    drawBattle(performance.now());const B=G_().B,p=B.qzPose;
    return {p:p&&{x:p.x,y:p.y,end:p.end,origin:p.origin,phase:p.phase,target:B.en.indexOf(p.target)},
     pending:B.fx.filter(f=>f.at>performance.now()).length,fired:!!B.vx?.[0]?.fired,
     hp:B.en.map(e=>e.hp),motion:!!B.qzMotion};
   });
   for(const index of [0,1,2]){
    await setup();const a=await start(index);assert.equal(a.target,index);assert.equal(a.hit-a.at,340);
    const first=await sample();assert.deepEqual([first.p.x,first.p.y],first.p.origin);
    assert.equal(first.pending,1);assert.equal(first.fired,false);
    const panelY=Math.ceil(first.p.origin[1]+4),clip={x:0,y:panelY,width:W,height:H-panelY};
    const panel=await pg.screenshot({clip});
    await pg.clock.runFor(230);let q=await sample();assert.equal(q.p.phase,'swing');assert.equal(q.p.target,index);
    assert.deepEqual([q.p.x,q.p.y],q.p.end);assert.notDeepEqual(q.p.end,q.p.origin);
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/approach.png`});
    await pg.clock.runFor(109);q=await sample();assert.equal(q.pending,1);assert.equal(q.fired,false);
    await pg.clock.runFor(1);q=await sample();assert.equal(q.pending,0);assert.equal(q.fired,true);
    assert.deepEqual(q.hp,a.hp); // Drawing never applies damage again.
    const after=await pg.screenshot({clip}),pa=PNG.sync.read(panel),pb=PNG.sync.read(after);
    const diff=pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:.1});
    if(diff){fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-before.png`,panel);fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-after.png`,after)}
    assert.equal(diff,0,`Attack target ${index} must not draw into the bottom panel`);
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/impact.png`});
    await pg.clock.runFor(309);q=await sample();assert.equal(q.p.phase,'return');
    await pg.clock.runFor(1);q=await sample();assert.equal(q.p,null);assert.equal(q.motion,false);
    assert.deepEqual(q.hp,a.hp);
   }
   await setup(true,true);let a=await start(0);assert.equal(await pg.evaluate('G_().B.en[0].dieAt'),a.hit);
   await pg.clock.runFor(340);assert.equal((await sample()).fired,true);
   await pg.clock.runFor(310);assert.equal((await sample()).motion,false);
   // Skip immediately, including a message that has not reached its first render.
   await setup();await pg.evaluate("press('ok');press('right');press('ok');press('ok')");
   assert.equal((await sample()).motion,false);
   assert.equal(await pg.evaluate('G_().B.fx.length'),1);
   assert.equal(await pg.evaluate('G_().B.fx[0].at<=performance.now()'),true);
   await setup();await start(2);await pg.clock.runFor(180);
   await pg.setViewportSize({width:H,height:W});await pg.clock.runFor(80);
   let q=await sample();assert.equal(q.p.target,2);assert.deepEqual([q.p.x,q.p.y],q.p.end);
   await pg.clock.runFor(390);assert.equal((await sample()).motion,false);
   await pg.setViewportSize({width:W,height:H});
   // Other skill timelines retain the original constants and never acquire QZ motion.
   for(const [pend,actor,key,impact] of [[{t:'sk',s:'橫掃'},0,'sweep',200],[{t:'atk'},1,'claw',150],[{t:'sk',s:'狐火'},1,'foxfire',330]]){
    await setup();const result=await pg.evaluate(({pend,actor})=>{
     const B=G_().B;B.ai=actor;__ex(pend,pend.s==='橫掃'?null:B.en[0]);drawBattle(performance.now());
     const sp=B.vx[0];return {key:sp.k,impact:B.fx[0].at-sp.at,motion:!!B.qzMotion};
    },{pend,actor});assert.deepEqual(result,{key,impact,motion:false});
   }
   assert.deepEqual(await jsErrors(),[]);console.log(`[attack-motion ${W}x${H}] targets, 340ms impact, 650ms return, KO, skip, resize, skills → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await attackMotion(b,s.url)}finally{await b.close();s.close()}
}
