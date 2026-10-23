// 多尺寸截圖：標題、對話、村莊、渡口、戰鬥選單（固定時鐘/亂數）。輸出 tests/out/screens/<W>x<H>/*.png
import {serve,launch,newPage,wait,outDir,SIZES} from './lib.mjs';
export async function screens(b,url){let ok=true;
 for(const[W,H]of SIZES){const dir=outDir('screens',`${W}x${H}`);const {ctx,pg,E,P,jsErrors}=await newPage(b,W,H,{seed:true});
  const shot=n=>pg.screenshot({path:`${dir}/${n}.png`});const run=ms=>pg.clock.runFor(ms);
  await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await run(1500);await wait(pg,500);
  await run(100);await shot('title');await P('ok');await run(300);await shot('dialog');
  for(let i=0;i<300&&await E('!!G.dlg');i++)await P('ok');
  await pg.evaluate("TP(20*32,12.5*32,'down')");await run(300);await shot('village');
  await pg.evaluate("TP(15.5*32,18.3*32,'down')");await run(300);await shot('dock');
  await pg.evaluate("G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));__sb(['小水妖','小水妖'],{noEsc:1})");await run(400);
  await pg.evaluate("G_().B.msgs=[];G_().B.ph='cmd';G_().B.ai=0");await run(200);await shot('battle_menu');
  const errors=await jsErrors();await ctx.close();ok=ok&&!errors.length;console.log(`[screens ${W}x${H}] errors=${JSON.stringify(errors)} → ${errors.length?'FAIL':'PASS'}`)}
 return ok}
if(import.meta.url===`file://${process.argv[1]}`){const s=await serve(),b=await launch();const ok=await screens(b,process.env.URL||s.url);await b.close();s.close();process.exit(ok?0:1)}
