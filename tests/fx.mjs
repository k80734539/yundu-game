// 戰鬥 VFX 定格截圖（固定時鐘 + 固定亂數種子 → 可逐像素比對）。輸出 tests/out/fx/<W>x<H>/<effect>_<ms>.png
import {serve,launch,newPage,wait,outDir,SIZES} from './lib.mjs';
const CASES=[["sb","G_().party[0].hp=30;__ex({t:'atk'},G_().B.en[0])","slash",[90,60]],
 ["sb","G_().B.ai=1;__ex({t:'atk'},G_().B.en[1])","claw",[120,60]],
 ["sb","__ex({t:'sk',s:'橫掃'},null)","sweep",[220,100]],
 ["sb","G_().B.ai=1;__ex({t:'sk',s:'狐火'},G_().B.en[0])","foxfire",[180,170]],
 ["sb","G_().party[0].hp=10;G_().party[1].hp=10;G_().B.ai=1;__ex({t:'sk',s:'春霖'},null)","rain",[350,200]],
 ["sb","G_().party[0].hp=10;G_().B.ai=0;press('down');press('down');press('down');press('ok')","guard",[150]],
 ["sb","__ep()","splash",[190]],
 ["sb","G_().B.en[0].hp=1;G_().B.en[0].def=0;__ex({t:'atk'},G_().B.en[0])","ko",[300,200]],
 ["__sb(['蘆葦精'],{})","__ep()","leaf",[230]],
 ["__sb(['河伯'],{noEsc:1,bg:'bg_temple'})","G_().B.turn=1;__ep()","tail",[200]],
 ["__sb(['河伯'],{noEsc:1,bg:'bg_temple'})","G_().B.turn=3;__ep()","wave",[250,300,150]]];
export async function fx(b,url,sizes=[[390,664],[844,390]]){let ok=true;
 for(const[W,H]of sizes){const dir=outDir('fx',`${W}x${H}`);const {ctx,pg,jsErrors}=await newPage(b,W,H,{seed:true});
  await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);await wait(pg,500);
  await pg.evaluate("press('ok')");await wait(pg,300);
  await pg.evaluate("G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
  for(const[setup,act,name,times]of CASES){await pg.evaluate(setup==='sb'?"__sb(['小水妖','小水妖'],{noEsc:1})":setup);await pg.clock.runFor(100);
   await pg.evaluate("G_().B.msgs=[];G_().B.ph='cmd';G_().B.ai=0");await pg.evaluate(act);let acc=0;
   for(const t of times){await pg.clock.runFor(t);acc+=t;await pg.screenshot({path:`${dir}/${name}_${acc}.png`})}await pg.clock.runFor(1600)}
  const errors=await jsErrors();await ctx.close();ok=ok&&!errors.length;console.log(`[fx ${W}x${H}] ${CASES.length} effects errors=${JSON.stringify(errors)} → ${errors.length?'FAIL':'PASS'}`)}
 return ok}
if(import.meta.url===`file://${process.argv[1]}`){const s=await serve(),b=await launch();const all=process.argv.includes('--all');const ok=await fx(b,process.env.URL||s.url,all?SIZES:undefined);await b.close();s.close();process.exit(ok?0:1)}
