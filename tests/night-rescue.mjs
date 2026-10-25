import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';
export async function nightRescue(browser,url,sizes=[...SIZES,[1894,870]]){
 for(const [w,h] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,w,h,{seed:true,touch:w<1000}),dir=outDir('night-rescue',w+'x'+h);
  try{await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate(()=>{newGame();startNight();window.nightScript=JSON.stringify(S);window.nightParty=JSON.stringify(G_().party)});
   for(const [label,beat,age] of [['standing',1,1300],['floating',5,1300],['reach',8,1300],['pull',9,1100],['aboard',10,1300]]){
    await pg.evaluate(beat=>G_().dlg.i=beat,beat);await pg.clock.runFor(20);await pg.clock.runFor(age);
    const state=await pg.evaluate(()=>{const s=activeScene(),n=s.night,f=n.frame,a=n.actors;return{...n,dialog:dialogLayout(),qz:[f.ox+a.qz.x*f.scale,f.oy+a.qz.y*f.scale],bl:a.bl?[f.ox+a.bl.x*f.scale,f.oy+a.bl.y*f.scale]:null}});
    assert.ok(state.actors.qz.x>=510&&state.actors.qz.x<=535&&state.actors.qz.y<=386,'feet inside painted deck');
    for(const [p,head] of [[state.qz,95],...(state.bl?[[state.bl,78]]:[])]){
     assert.ok(p[0]>28&&p[0]<w-35,'actor stays inside viewport');
     assert.ok(p[1]-head*state.frame.scale>=state.frame.top-10,'head clears upper dialogue');
     assert.ok(p[1]+5*state.frame.scale<=state.frame.bottom+10,'feet clear lower dialogue');
    }
    if(label==='floating'){assert.ok(state.actors.bl.x>667&&state.actors.bl.waterY<state.actors.bl.y,'girl is outside boat, partially submerged')}
    if(label==='reach'||label==='pull'){const hook=state.pole.hook,girl=state.actors.bl;assert.ok(Math.abs(hook[0]-girl.x-18)<1&&Math.abs(hook[1]-girl.y+22)<2,'pole stays attached to clothing');}
    if(label==='aboard'){assert.deepEqual([state.actors.bl.x,state.actors.bl.y],[570,386],'girl settles inside deck');assert.ok(Math.abs(state.actors.bl.rot)<1e-9,'girl rests without sideways rotation')}
    await pg.screenshot({path:dir+'/'+label+'.png'});
   }
   // Beat 9 must interpolate continuously rather than swapping a rotated standing sprite.
   const motion=await pg.evaluate(()=>[0,500,1100,1800,2200].map(t=>nightActors(9,t)));
   for(let i=1;i<motion.length;i++){assert.ok(motion[i].bl.x<motion[i-1].bl.x);assert.ok(Math.abs(motion[i].bl.rot)<=Math.abs(motion[i-1].bl.rot))}
   assert.equal(await pg.evaluate(()=>JSON.stringify(S)===nightScript&&JSON.stringify(G_().party)===nightParty),true,'visual staging does not change script or party');
   await pg.setViewportSize({width:h,height:w});await pg.clock.runFor(80);await pg.setViewportSize({width:w,height:h});await pg.clock.runFor(80);
   await pg.evaluate(()=>{while(G_().mode==='boat'&&G_().dlg)press('ok')});await pg.clock.runFor(30);assert.equal(await pg.evaluate(()=>G_().mode),'battle','fast skip still enters water battle');
   assert.deepEqual(await jsErrors(),[]);console.log('[night-rescue '+w+'x'+h+'] deck anchors, framing, water mask, attached pole, recovery and skip PASS');
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await nightRescue(b,s.url)}finally{await b.close();s.close()}}
