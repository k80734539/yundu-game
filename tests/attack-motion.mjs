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
   assert.equal(await pg.evaluate("QZB.names.every(n=>ASSETS['qzb_'+n]&&I['qzb_'+n].naturalWidth===480&&I['qzb_'+n].naturalHeight===360)&&!ASSETS.qz_pole&&!Object.keys(ASSETS).some(k=>k.startsWith('qz_atk'))&&typeof clipQzStage==='undefined'"),true);
   const setup=async(boss=false,ko=false,names=['小水妖','小水妖','蘆葦精'])=>{await pg.evaluate(({boss,ko,names})=>{
    __sb(boss?['河伯']:names,{noEsc:1});
    const B=G_().B;Math.random=()=>.5;B.msgs=[];B.ph='cmd';B.ai=0;B.en.forEach(e=>e.hp=e.mhp=ko?1:9999);
    drawBattle(performance.now());
   },{boss,ko,names});await pg.clock.runFor(500)};
   const start=async(index)=>pg.evaluate(index=>{
    const B=G_().B;press('ok');for(let i=0;i<index;i++)press('right');press('ok');drawBattle(performance.now());
    const sp=B.qzMotion;return {at:sp.at,hit:B.fx[0].at,target:B.en.indexOf(sp.tg[0]),hp:B.en.map(e=>e.hp)};
   },index);
   const sample=async()=>pg.evaluate(()=>{
    drawBattle(performance.now());const B=G_().B,p=B.qzPose,sp=B.vx&&B.vx[0];
    return {p:p&&{x:p.x,y:p.y,end:p.end,origin:p.origin,phase:p.phase,name:p.name,fd:p.fd,tilt:p.tilt,tip:p.tip,trail:p.trail,land:p.land,target:B.en.indexOf(p.target)},
     contact:p&&B.po(p.target).slice(0,2).map((v,i)=>i?v-B.po(p.target)[3]*.3:v),
     pending:B.fx.filter(f=>f.at>performance.now()).length,fired:!!sp?.fired,
     hp:B.en.map(e=>e.hp),motion:!!B.qzMotion};
   });
   // 落點檢查：身體圖框不與任何敵人圖框重疊；竹篙尖端落在目標前緣；全在畫面內、不蓋到下方指令面板
   const geometry=async()=>pg.evaluate(()=>{const B=G_().B,p=B.qzPose,L=p.land,k=qzK(),fd=L.fd;
    const L0=L.x+fd*QZB.bodyL*k,R0=L.x+fd*QZB.bodyR*k,body={l:Math.min(L0,R0),r:Math.max(L0,R0),t:L.y-QZB.figH*k,b:L.y};
    const boxes=B.en.map(e=>{const [cx,cy,w,h]=B.po(e);return {l:cx-w/2,r:cx+w/2,t:cy-h/2,b:cy+h/2,tg:e===p.target}});
    const ov=boxes.map(o=>Math.max(0,Math.min(body.r,o.r)-Math.max(body.l,o.l))*Math.max(0,Math.min(body.b,o.b)-Math.max(body.t,o.t)));
    const T=boxes.find(o=>o.tg);
    return {ov,tipIn:L.tip[0]>=T.l-6&&L.tip[0]<=T.r+6&&L.tip[1]>=T.t&&L.tip[1]<=T.b+8,tip:L.tip,T,body,SW,SH,tilt:L.tilt};});
   const shot=async(i,n)=>{if(i===1)await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/${n}.png`})};
   for(const names of [['小水妖','小水妖','蘆葦精'],['小水妖','蘆葦精']])for(const index of names.keys()){
    await setup(false,false,names);const a=await start(index);assert.equal(a.target,index);assert.equal(a.hit-a.at,340);
    const first=await sample();assert.deepEqual([first.p.x,first.p.y],first.p.origin);assert.equal(first.p.name,'charge');
    assert.equal(first.pending,1);assert.equal(first.fired,false);
    const panelY=Math.ceil(first.p.origin[1]+4);
    // 彩繪圖中竹篙尾端最多低於腳底 30 frame px（隔著 94% 不透明的面板只剩殘影）；比對面板時略過這段，其下不得有任何變化
    const tail=Math.ceil(30*(await pg.evaluate('qzK()')))+2,clip={x:0,y:panelY+tail,width:W,height:H-panelY-tail};
    const panel=await pg.screenshot({clip});
    await pg.clock.runFor(60);let q=await sample();assert.equal(q.p.phase,'charge');await shot(index,'charge');
    await pg.clock.runFor(70);q=await sample();assert.equal(q.p.phase,'dash');const n1=q.p.name;assert.match(n1,/^dash[01]$/);
    await pg.clock.runFor(65);q=await sample();assert.notEqual(q.p.name,n1);assert.equal(q.p.target,index);
    assert.notDeepEqual(q.p.end,q.p.origin);await shot(index,'dash');
    await pg.clock.runFor(35);q=await sample();assert.equal(q.p.phase,'thrust');assert.equal(q.p.name,'thrust');
    assert.deepEqual([q.p.x,q.p.y],q.p.end);
    // 失誤 A：落點在敵列前方，不碰任何鄰近敵人；尖端到目標前緣；全在畫面內
    const g=await geometry();assert.deepEqual(g.ov,g.ov.map(()=>0),`body overlaps an enemy box ${JSON.stringify(g)}`);
    assert.ok(g.tipIn,`tip must reach target ${JSON.stringify(g)}`);assert.ok(g.body.l>=0&&g.body.r<=g.SW&&g.body.t>=0&&g.body.b<=panelY,`body inside screen ${JSON.stringify(g.body)}`);
    assert.ok(g.tilt<=.37);
    assert.ok(q.p.trail.length>8);const tip=q.p.trail.at(-1);assert.ok(Math.hypot(tip[0]-q.p.tip[0],tip[1]-q.p.tip[1])<.001);
    await shot(index,'thrust');
    await pg.clock.runFor(109);q=await sample();assert.equal(q.pending,1);assert.equal(q.fired,false);
    await pg.clock.runFor(1);q=await sample();assert.equal(q.pending,0);assert.equal(q.fired,true);
    assert.deepEqual(q.hp,a.hp); // Drawing never applies damage again.
    assert.ok((await geometry()).tipIn,'Pole tip must meet selected enemy at impact');
    const after=await pg.screenshot({clip}),pa=PNG.sync.read(panel),pb=PNG.sync.read(after);
    const diff=pixelmatch(pa.data,pb.data,null,pa.width,pa.height,{threshold:.1});
    if(diff){fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-before.png`,panel);fs.writeFileSync(`${outDir('attack-motion',`${W}x${H}`)}/panel-after.png`,after)}
    assert.equal(diff,0,`Attack target ${index} must not draw into the bottom panel`);
    await shot(index,'impact');
    await pg.clock.runFor(50);q=await sample();assert.equal(q.p.name,'recover');await shot(index,'recover');
    await pg.clock.runFor(90);q=await sample();assert.equal(q.p.phase,'return');assert.match(q.p.name,/^dash[01]$/);
    await pg.clock.runFor(169);q=await sample();assert.equal(q.p.phase,'return');
    await pg.clock.runFor(1);q=await sample();assert.equal(q.p,null);assert.equal(q.motion,false);
    assert.deepEqual(q.hp,a.hp);
    await pg.clock.runFor(100);
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
   await pg.setViewportSize({width:H,height:W});await pg.clock.runFor(1);
   let q=await sample();assert.equal(q.p.target,2);
   await pg.clock.runFor(65);q=await sample();assert.equal(q.p.phase,'thrust');assert.deepEqual([q.p.x,q.p.y],q.p.end);
   const g2=await geometry();assert.deepEqual(g2.ov,g2.ov.map(()=>0));assert.ok(g2.tipIn);
   await pg.clock.runFor(410);assert.equal((await sample()).motion,false);
   await pg.setViewportSize({width:W,height:H});
   // 橫掃（青舟）＝ sweepwind → sweep；其他技能時間軸維持原樣、不使用青舟演出
   await setup();await pg.evaluate("__ex({t:'sk',s:'橫掃'},null);drawBattle(performance.now())");
   {let q=await sample();assert.equal(q.p.name,'sweepwind');assert.equal(q.p.phase,'wind');
    const imp=await pg.evaluate("G_().B.fx[0].at-G_().B.vx[0].at");assert.equal(imp,460);
    await pg.clock.runFor(270);q=await sample();assert.equal(q.p.name,'sweep');assert.equal(q.p.phase,'swing');await pg.screenshot({path:`${outDir('attack-motion',`${W}x${H}`)}/sweep.png`});
    await pg.clock.runFor(400);q=await sample();assert.equal(q.p,null);assert.equal(q.motion,false);await pg.clock.runFor(600)}
   for(const [pend,actor,key,impact] of [[{t:'atk'},1,'claw',150],[{t:'sk',s:'狐火'},1,'foxfire',330]]){
    await setup();const result=await pg.evaluate(({pend,actor})=>{
     const B=G_().B;B.ai=actor;__ex(pend,B.en[0]);drawBattle(performance.now());
     const sp=B.vx[0];return {key:sp.k,impact:B.fx[0].at-sp.at,motion:!!B.qzMotion};
    },{pend,actor});assert.deepEqual(result,{key,impact,motion:false});
   }
   // 缺圖時退回舊 sprite，戰鬥不中斷；粒子上限不變
   await setup();await pg.evaluate("QZB.names.forEach(n=>I['qzb_'+n]=null)");await start(0);await pg.clock.runFor(340);await pg.evaluate("drawBattle(performance.now())");
   assert.equal(await pg.evaluate('VPT.length<=VMAX&&VMAX===160'),true);
   assert.deepEqual(await jsErrors(),[]);console.log(`[attack-motion ${W}x${H}] targets A/B/C × 2–3 enemies, no neighbour overlap, 340ms impact, 650ms return, KO, skip, resize, sweep → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await attackMotion(b,s.url)}finally{await b.close();s.close()}
}
