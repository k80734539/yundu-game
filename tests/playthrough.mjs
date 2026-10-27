// 完整第一章通關（headless）。用法：node tests/playthrough.mjs [W H touch(1/0)]；無參數 = 直式 390x664 + 橫式 844x390
import {serve,launch,newPage,wait,outDir} from './lib.mjs';
import {pathToFileURL} from 'node:url';
const T=32,T2=48;
export async function playthrough(b,url,W,H,touch=true){
 const tag=`${W}x${H}`,dir=outDir('play',tag);const {ctx,pg,E,P,jsErrors}=await newPage(b,W,H,{touch});
 const shot=n=>pg.screenshot({path:`${dir}/${n}.png`});
 const flush=async()=>{for(let n=0;n<300&&await E('!!G.dlg');n++)await P('ok')};
 const tp=(x,y,d)=>pg.evaluate(`TP(${x},${y},'${d}')`);
 const hold=async(k,ms)=>{await pg.keyboard.down(k);await wait(pg,ms);await pg.keyboard.up(k)};
 const fight=async()=>{let n=0;while(await E('G.mode')==='battle'&&n<3000){const ph=await E('G.B.ph');
   if(ph==='cmd'){const u=await E('G.party[G.B.ai]');
     if(u.hp<u.mhp*.4&&await E('G.inv.魚乾')>0){await P('down');await P('down');await P('ok');await P('ok');await pg.evaluate('G_().B.sel=G_().B.ai');await P('ok')}
     else if(u.n==='白苓'&&u.mp>=4){await P('down');await P('ok');await P('ok');await P('ok')}else{await P('ok');await P('ok')}}
   else await P('ok');n++;
   if(await E('G.mode')==='over'){await shot('over');await P('ok');await flush()}}await flush()};
 await pg.goto(url);await wait(pg,1500);
 await shot('title');await P('ok');await wait(pg,200);await shot('intro_dlg');await flush();
 await hold('ArrowRight',700);
 await tp(21.4*T,19.7*T-14,'right');await P('ok');await flush();await tp(21.4*T,8.5*T-14,'up');await P('ok');await wait(pg,150);await shot('chief_dlg');await flush();
 await tp(36.3*T,10.6*T-14,'up');await P('ok');await flush();
 await tp(20*T,14.5*T,'down');await wait(pg,300);await shot('village');await tp(22*T,18.3*T,'down');await wait(pg,300);await shot('dock');
 // v51：第一次走到渡口先觸發開場小戰（2 隻小水妖），打完才能真正登船。
 await tp(21*T,22.4*T,'down');await hold('ArrowDown',900);await flush();await wait(pg,300);if(await E("G.mode==='battle'")){await shot('battle_ferry');await fight()}else throw Error('opening ferry fight did not start on the first boarding attempt');
 if(!await E('G.flags.ferryFight'))throw Error('ferry fight did not complete');
 await tp(21*T,22.4*T,'down');await hold('ArrowDown',900);await P('ok');await flush();await P('ok');await P('ok');await wait(pg,200);await shot('boat');await flush();
 await wait(pg,300);await shot('battle_river');await fight();
 await flush();await tp(100,122,'right');await wait(pg,300);await shot('reeds_start');
 await tp(800,122,'right');await wait(pg,300);await shot('reeds');
 let got=false;const t0=Date.now();
 while(Date.now()-t0<40000&&!got){for(const k of['ArrowRight','ArrowLeft']){await pg.keyboard.down(k);for(let i=0;i<25;i++){await wait(pg,60);if(await E('G.mode')==='battle'){got=true;break}}await pg.keyboard.up(k);if(got)break}}
 if(got){await wait(pg,900);await P('ok');await wait(pg,300);await shot('battle');await fight()}
 for(const[x,y]of[[1215,142],[140,354]]){await tp(x,y,'up');await P('ok');await flush()}
 await tp(670,300,'down');await wait(pg,200);await shot('reeds_tal');await hold('ArrowDown',500);await flush();
 await tp(670,390,'down');for(let i=0;i<3;i++){await P('ok');await flush()}
 await tp(922,390,'down');const guardStart=Date.now();while(Date.now()-guardStart<15000&&await E("G.mode!=='battle'")){await hold('ArrowDown',250);if(await E('G.dlg'))await flush()}
 const reedBoss=await E("G.mode==='battle'&&G.B.en.some(e=>e.e==='laolu')");if(reedBoss){await wait(pg,500);await shot('battle_reed_boss');await fight()}if(!reedBoss)throw Error('fixed old reed spirit did not guard the route to camp');
 await tp(750,580,'left');await hold('ArrowLeft',400);await wait(pg,200);await shot('reeds_camp');await flush();
 await tp(660,778,'up');await P('ok');await flush();
 await tp(1220,760,'right');await hold('ArrowRight',600);await wait(pg,500);await shot('temple_intro');await flush();await wait(pg,2700);
 await tp(2.5*T2,8.5*T2,'up');await P('ok');await flush();for(const[x,y]of await E('CFG.templeLanterns.map(q=>q.stand)')){await tp(x*T2,y*T2,'down');await P('ok');await flush()}
 await tp(10.5*T2,6.25*T2,'down');await P('ok');await flush();if(!(await E('G.flags.templeSeal')))throw Error('three lanterns did not allow the seal to be weakened');
 await tp(12.5*T2,11*T2,'up');await wait(pg,300);await shot('temple');
 await tp(10.5*T2,5.3*T2,'up');await wait(pg,200);await shot('temple_boss');await P('ok');await flush();await wait(pg,400);await shot('battle_boss');await fight();
 await wait(pg,300);await shot('dawn');await flush();await tp(36.3*T,10.6*T-14,'up');await P('ok');await wait(pg,150);await shot('cure');await flush();await wait(pg,1300);
 const mode=await E('G.mode'),party=await E("G.party.map(p=>p.n+' Lv'+p.lv)"),errors=await jsErrors(),fl=await E('JSON.parse(JSON.stringify(G.flags))');await shot('end');await ctx.close();
 const ok=mode==='end'&&errors.length===0&&got&&!!fl.flood&&!!fl.reedSolved&&!!fl.camp&&!!fl.templeSeal&&!!fl.cure&&!!fl.tal&&!!fl.boss;
 console.log(`[playthrough ${tag}] mode=${mode} encounter=${got} party=${party.join(',')} flags=${Object.keys(fl||{}).join('+')} errors=${JSON.stringify(errors)} → ${ok?'PASS':'FAIL'}`);return ok}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();const a=process.argv.slice(2);
 const runs=a.length?[[+a[0],+a[1],a[2]!=='0']]:[[390,664,true],[844,390,true]];let ok=true;
 for(const[W,H,t]of runs)ok=await playthrough(b,process.env.URL||s.url,W,H,t)&&ok;await b.close();s.close();process.exit(ok?0:1)}
