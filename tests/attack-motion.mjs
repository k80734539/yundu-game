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
   assert.equal(await pg.evaluate("['qz_pole','qz_atk_windup','qz_atk_strike','qz_atk_recover'].every(k=>ASSETS[k]&&I[k].naturalWidth>32)"),true);
   assert.equal(await pg.evaluate(()=>Object.values(QZ_POSES).every(a=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.drawImage(I[a.key],0,0);const p=x.getImageData(Math.round(a.hand[0]),Math.round(a.hand[1]),1,1).data;return p[3]>200&&p[0]>p[2]*1.2})),true,'Weapon sockets must lie on the painted hands');
   const setup=async(boss=false,ko=false,enemyCount=3)=>{await pg.evaluate(({boss,ko,enemyCount})=>{
    __sb(boss?['河伯']:['小水妖','小水妖','蘆葦精'].slice(0,enemyCount),{noEsc:1});
    const B=G_().B;Math.random=()=>.5;B.msgs=[];B.ph='cmd';B.ai=0;B.en.forEach(e=>e.hp=e.mhp=ko?1:9999);
    drawBattle(performance.now());
   },{boss,ko,enemyCount});await pg.clock.runFor(500)};
   const start=async(index)=>pg.evaluate(index=>{
    const B=G_().B;press('ok');for(let i=0;i<index;i++)press('right');press('ok');drawBattle(performance.now());
    const sp=B.qzMotion;return {at:sp.at,hit:B.fx[0].at,target:B.en.indexOf(sp.tg[0]),hp:B.en.map(e=>e.hp)};
   },index);
   const sample=async()=>pg.evaluate(()=>{
    drawBattle(performance.now());const B=G_().B,p=B.qzPose;
    return {p:p&&{x:p.x,y:p.y,end:p.end,origin:p.origin,phase:p.phase,art:p.art,hand:p.hand,tip:p.tip,pole:p.pole,artH:p.artH,trail:p.trail,target:B.en.indexOf(p.target)},
     contact:p&&B.po(p.target).slice(0,2).map((v,i)=>i?v-B.po(p.target)[3]*.3:v),
     others:p&&B.en.filter(e=>e!==p.target&&e.hp>0).map(e=>{const q=B.po(e);return{x:q[0],top:q[1]-q[3]/2,bottom:q[1]+q[3]/2,half:q[2]/2}}),
     pending:B.fx.filter(f=>f.at>performance.now()).length,fired:!!B.vx?.[0]?.fired,
     hp:B.en.map(e=>e.hp),motion:!!B.qzMotion};
   });
   for(const enemyCount of [1,2,3])for(let index=0;index<enemyCount;index++){
    await setup(false,false,enemyCount);const a=await start(index);assert.equal(a.target,index);assert.equal(a.hit-a.at,340);
    const first=await sample();assert.deepEqual([first.p.x,first.p.y],first.p.origin);
    assert.equal(first.pending,1);assert.equal(first.fired,false);
    const panelY=Math.ceil(first.p.origin[1]+4),clip={x:0,y:panelY,width:W,height:H-panelY};
    const panel=await pg.screenshot({clip});
    await pg.clock.runFor(60);let q=await sample();assert.equal(q.p.art,'windup');
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/windup.png`});
    if(enemyCount===3&&index>0)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/target-${index+1}-windup.png`});
    await pg.clock.runFor(90);q=await sample();assert.equal(q.p.phase,'dash');
    if(enemyCount===3&&index>0)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/target-${index+1}-dash.png`});
    if(W===390&&H===664&&enemyCount===3&&index===1){const visible=await pg.evaluate(()=>{const B=G_().B,p=B.qzPose,c=document.createElement('canvas');c.width=SW;c.height=SH;const ctx=c.getContext('2d'),fs=FS();const labels=B.en.map(e=>{const r=B.po(e),bw=Math.max(Math.min(90,r[2]*.9),ctx.measureText(e.n).width+8);return{x:r[0]-bw/2,y:r[1]+r[3]/2+3,w:bw,h:fs+18}});drawQzAttack(I.qz_left0,p,I.qz_left0.width*(1.55*Math.min(SW,SH)/400),I.qz_left0.height*(1.55*Math.min(SW,SH)/400),Math.min(SW,SH)/400,1,{left:0,right:SW,top:0,bottom:SH,labels},ctx);const a=ctx.getImageData(0,0,SW,SH).data;let count=0;for(const r of labels)for(let y=Math.max(0,Math.floor(r.y));y<Math.min(SH,Math.ceil(r.y+r.h));y++)for(let x=Math.max(0,Math.floor(r.x));x<Math.min(SW,Math.ceil(r.x+r.w));x++)if(a[(y*SW+x)*4+3])count++;return count});assert.ok(visible>0,'Qingzhou and his weapon remain drawn through the enemy name/HP region during the dash') }
    await pg.clock.runFor(80);q=await sample();assert.equal(q.p.phase,'swing');assert.equal(q.p.target,index);
    assert.deepEqual([q.p.x,q.p.y],q.p.end);assert.notDeepEqual(q.p.end,q.p.origin);
    if(index>0){const left=q.p.x-q.p.artH*.405,right=q.p.x+q.p.artH*.405,top=q.p.y-q.p.artH*224/256,bottom=q.p.y;for(const e of q.others)assert.ok(!(left<e.x+e.half&&right>e.x-e.half&&top<e.bottom&&bottom>e.top),`Attack target ${index+1}/${enemyCount} must not overlap a neighboring enemy`)}
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/approach.png`});

    await pg.clock.runFor(55);q=await sample();assert.equal(q.p.art,'strike');
    assert.ok(q.p.trail.length>8);const tip=q.p.trail.at(-1);assert.ok(Math.hypot(tip[0]-q.p.tip[0],tip[1]-q.p.tip[1])<.001);
    assert.ok(Math.abs(Math.hypot(q.p.tip[0]-q.p.hand[0],q.p.tip[1]-q.p.hand[1])-q.p.pole*.69)<.001);
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/swing.png`});
    if(enemyCount===3&&index>0)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/target-${index+1}-swing.png`});
    await pg.clock.runFor(54);q=await sample();assert.equal(q.pending,1);assert.equal(q.fired,false);
    await pg.clock.runFor(1);q=await sample();assert.equal(q.pending,0);assert.equal(q.fired,true);
    assert.deepEqual(q.hp,a.hp); // Drawing never applies damage again.
    assert.ok(Math.hypot(q.p.tip[0]-q.contact[0],q.p.tip[1]-q.contact[1])<8,'Pole tip must meet selected enemy at impact');
    const after=await pg.screenshot({clip}),pa=PNG.sync.read(panel),pb=PNG.sync.read(after);
    const diff=pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:.1});
    if(diff){fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-before.png`,panel);fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-after.png`,after)}
    assert.equal(diff,0,`Attack target ${index} must not draw into the bottom panel`);
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/impact.png`});
    if(enemyCount===3&&index>0)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/target-${index+1}-impact.png`});
    await pg.clock.runFor(80);q=await sample();assert.equal(q.p.art,'recover');
    if(index===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/recover.png`});
    if(enemyCount===3&&index>0)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/target-${index+1}-recover.png`});
    await pg.clock.runFor(229);q=await sample();assert.equal(q.p.phase,'return');
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
   // Missing new art must fall back without interrupting battle; retain the particle cap.
   await setup();await pg.evaluate("I.qz_pole=null;I.qz_atk_windup=null;I.qz_atk_strike=null;I.qz_atk_recover=null");await start(0);await pg.clock.runFor(340);await sample();
   assert.equal(await pg.evaluate('VPT.length<=VMAX&&VMAX===160'),true);
   assert.deepEqual(await jsErrors(),[]);console.log(`[attack-motion ${W}x${H}] 1/2/3 enemy slots, dash label visibility, neighbor clearance, 340ms impact, 650ms return, KO, skip, resize, skills → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await attackMotion(b,s.url)}finally{await b.close();s.close()}
}
