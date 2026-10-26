// 存檔系統：手動存檔 → 重新整理 → 繼續遊戲，位置/道具/旗標一致；壞檔不當機；戰鬥中不能存。用法：node tests/save.mjs
import {serve,launch,newPage,wait,outDir} from './lib.mjs';
export async function saveTest(b,url,W,H){const tag=`${W}x${H}`,dir=outDir('save',tag);const {ctx,pg,E,P,jsErrors}=await newPage(b,W,H,{touch:true});
 const shot=n=>pg.screenshot({path:`${dir}/${n}.png`});const fail=[];const chk=(c,m)=>{if(!c)fail.push(m)};
 const flush=async()=>{for(let n=0;n<300&&await E('!!G.dlg');n++)await P('ok');await wait(pg,100)};
 const tap=async sel=>{await pg.locator(sel).first().scrollIntoViewIfNeeded().catch(()=>{});const bb=await pg.locator(sel).first().boundingBox();if(!bb){fail.push('missing '+sel);return}await pg.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2);await wait(pg,150)};
 const vis=s=>pg.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)});return !!e&&getComputedStyle(e).display!='none'})()`);
 await pg.goto(url);await wait(pg,1500);chk(!await vis('#svPanel'),'title panel shown with no saves');
 await P('ok');await wait(pg,200);chk(!await vis('#svBtn'),'menu button visible during dialogue');await flush();
 chk(!!await pg.evaluate("localStorage.getItem('yundu_save_auto')"),'no auto save after newGame');
 await pg.evaluate("TP(14*32,14*32,'left');G_().inv.清心草=3;G_().flags.quest=1;G_().flags.chief=1;G_().opened['reeds:18,1']=1");await wait(pg,200);
 chk(await vis('#svBtn'),'menu button hidden on map');await shot('map_button');
 const bb=await pg.locator('#svBtn').boundingBox();chk(bb&&bb.y>=0&&bb.x+bb.width<=W&&bb.y+bb.height<H*0.25,'menu button not top-right');
 await tap('#svBtn');chk(await E('!!0')===false,'');await shot('menu');chk((await pg.evaluate('SV.p'))==='menu','menu not open');
 await tap('#svBox .svI >> nth=3');chk((await pg.evaluate('SV.p'))==='records','records menu not open');
 await tap('#svBox .svI >> nth=0');await shot('save_slots');chk((await pg.evaluate('SV.p'))==='save','save list not open');
 await tap('#svBox .svI >> nth=0');await wait(pg,100);await flush();
 const want=await E("JSON.stringify({map:G.map,x:Math.round(G.x),y:Math.round(G.y),dir:G.dir,inv:G.inv,flags:G.flags,opened:G.opened,lv:G.party[0].lv})");
 chk(!!await pg.evaluate("localStorage.getItem('yundu_save_1')"),'slot 1 not written');
 // 戰鬥中不能存
 await pg.evaluate("__sb(['小水妖'])");await wait(pg,300);chk(!await vis('#svBtn'),'menu button visible in battle');await pg.evaluate("press('menu')");chk(!(await pg.evaluate('SV.p')),'menu opened in battle');
 // 壞檔
 await pg.evaluate("localStorage.setItem('yundu_save_2','{bad json');localStorage.setItem('yundu_save_3',JSON.stringify({ver:99}))");
 await pg.reload();await wait(pg,1500);chk(await vis('#svPanel'),'title menu missing after reload');await shot('title');
 await tap('#svBox .svI >> nth=1');await shot('load_slots');const txt=await pg.locator('#svBox').innerText();chk(txt.includes('損壞'),'corrupt slot not labeled');
 await tap('#svBox .svI >> nth=4');await tap('#svBox .svI >> nth=2');chk((await pg.evaluate('SV.p'))==='confirm','new game not confirmed');await shot('confirm_new');
 await tap('#svBox .svI >> nth=1');await tap('#svBox .svI >> nth=0');await wait(pg,200);await flush();
 const got=await E("JSON.stringify({map:G.map,x:Math.round(G.x),y:Math.round(G.y),dir:G.dir,inv:G.inv,flags:G.flags,opened:G.opened,lv:G.party[0].lv})");
 chk(got===want,'state mismatch '+want+' vs '+got);chk(await E('G.mode')==='map','not in map after continue');
 const errors=await jsErrors();chk(!errors.length,'js errors '+JSON.stringify(errors));await ctx.close();
 const ok=!fail.filter(Boolean).length;console.log(`[save ${tag}] ${ok?'PASS':'FAIL '+fail.filter(Boolean).join('; ')}`);return ok}
if(import.meta.url===`file://${process.argv[1]}`){const s=await serve(),b=await launch();let ok=true;for(const[w,h]of[[390,664],[844,390]])ok=await saveTest(b,s.url,w,h)&&ok;await b.close();s.close();process.exit(ok?0:1)}
