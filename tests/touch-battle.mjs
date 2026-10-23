// 觸控戰鬥測試：5 種尺寸，全用 touchscreen.tap 點底部面板指令／敵人；檢查搖桿戰鬥中隱藏、戰後恢復
import {serve,launch,newPage,wait,outDir,SIZES} from './lib.mjs';
export async function touchBattle(b,url){let ok=true;const dir=outDir('touch');
 for(const[W,H]of SIZES){const {ctx,pg,E,P,jsErrors}=await newPage(b,W,H,{dpr:3});
  await pg.goto(url);await wait(pg,1200);await P('ok');await wait(pg,100);
  for(let i=0;i<40&&await E('!!G.dlg');i++)await P('ok');
  await pg.evaluate("G_().flags.chief=1;G_().flags.quest=1;TP(15*32,18.6*32,'down')");
  await pg.keyboard.down('ArrowDown');await wait(pg,900);await pg.keyboard.up('ArrowDown');
  for(let i=0;i<40&&await E('G.mode')!=='battle';i++){await P('ok');await wait(pg,50)}
  await pg.evaluate("G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
  const tap=async(x,y)=>{await pg.touchscreen.tap(x,y);await wait(pg,250)};
  const hits=()=>E('G.B.hit.map(h=>[h.x+h.w/2,h.y+h.h/2])');
  for(let i=0;i<30&&await E('G.B.ph')!=='cmd';i++)await tap(W/2,H/3);
  const hidIn=await E('JOY.hidden');await wait(pg,300);await pg.screenshot({path:`${dir}/${W}x${H}_menu.png`});
  let h=await hits();await tap(...h[1]);const ph1=await E('G.B.ph');await pg.screenshot({path:`${dir}/${W}x${H}_skill.png`});
  h=await hits();await tap(...h.at(-1));h=await hits();await tap(...h[0]);const ph2=await E('G.B.ph');await pg.screenshot({path:`${dir}/${W}x${H}_target.png`});
  h=await hits();await tap(...h[0]);
  for(let i=0;i<200&&await E('G.mode')==='battle';i++){if(await E('G.B.ph')==='msg')await tap(W/2,H/3);else{h=await hits();await tap(...h[0])}}
  const mode=await E('G.mode'),hidOut=await E('JOY.hidden'),errors=await jsErrors();await ctx.close();
  const pass=hidIn===true&&ph1==='skill'&&ph2==='target'&&mode==='map'&&!hidOut&&!errors.length;ok=ok&&pass;
  console.log(`[touch ${W}x${H}] joyHiddenInBattle=${hidIn} skillMenu=${ph1} target=${ph2} end=${mode} joyBack=${!hidOut} errors=${JSON.stringify(errors)} → ${pass?'PASS':'FAIL'}`)}
 return ok}
if(import.meta.url===`file://${process.argv[1]}`){const s=await serve(),b=await launch();const ok=await touchBattle(b,process.env.URL||s.url);await b.close();s.close();process.exit(ok?0:1)}
