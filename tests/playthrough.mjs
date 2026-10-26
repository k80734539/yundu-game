// 完整第一章通關（headless）。用法：node tests/playthrough.mjs [W H touch(1/0)]；無參數 = 直式 390x664 + 橫式 844x390
import {serve,launch,newPage,wait,outDir} from './lib.mjs';
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
 await tp(19*T,19.2*T,'right');await P('ok');await flush();await tp(21*T,10.3*T,'up');await P('ok');await wait(pg,150);await shot('chief_dlg');await flush();
 await tp(35*T,10.4*T,'up');await P('ok');await flush();
 await tp(20*T,14.5*T,'down');await wait(pg,300);await shot('village');await tp(22*T,18.3*T,'down');await wait(pg,300);await shot('dock');
 await tp(21*T,22.4*T,'down');await hold('ArrowDown',900);await P('ok');await flush();await P('ok');await P('ok');await wait(pg,200);await shot('boat');await flush();
 await wait(pg,300);await shot('battle_river');await fight();
 await flush();await tp(1.5*T2,1.85*T2,'down');await wait(pg,300);await shot('reeds_start');
 await tp(8.5*T2,7.6*T2,'right');await wait(pg,300);await shot('reeds');
 let got=false;const t0=Date.now();
 while(Date.now()-t0<40000&&!got){for(const k of['ArrowRight','ArrowLeft']){await pg.keyboard.down(k);for(let i=0;i<25;i++){await wait(pg,60);if(await E('G.mode')==='battle'){got=true;break}}await pg.keyboard.up(k);if(got)break}}
 if(got){await wait(pg,900);await P('ok');await wait(pg,300);await shot('battle');await fight()}
 for(const[[cx,cy],d]of[[[18,2],'up'],[[2,7],'left'],[[4,11],'right']]){await tp((cx+.5)*T2,(cy+.5)*T2+10,d);await P('ok');await flush()}
 await tp(6.5*T2,6.7*T2,'up');await wait(pg,200);await shot('reeds_tal');await hold('ArrowUp',500);await flush();
 await tp(10.5*T2,7.5*T2,'up');for(let i=0;i<3;i++){await P('ok');await flush()}
 await tp(11.5*T2,9.5*T2+6,'right');await hold('ArrowRight',400);await wait(pg,200);await shot('reeds_camp');await flush();
 await tp(18.5*T2,11.6*T2,'down');await hold('ArrowDown',600);await wait(pg,500);await shot('temple_intro');await flush();await wait(pg,2700);
 await tp(2.5*T2,11.6*T2,'up');await P('ok');await flush();await tp(10.5*T2,6.25*T2,'down');await P('ok');await flush();
 await tp(12.5*T2,11*T2,'up');await wait(pg,300);await shot('temple');
 await tp(10.5*T2,5.3*T2,'up');await wait(pg,200);await shot('temple_boss');await P('ok');await flush();await wait(pg,400);await shot('battle_boss');await fight();
 await wait(pg,300);await shot('dawn');await flush();await tp(35*T,10.4*T,'up');await P('ok');await wait(pg,150);await shot('cure');await flush();await wait(pg,1300);
 const mode=await E('G.mode'),party=await E("G.party.map(p=>p.n+' Lv'+p.lv)"),errors=await jsErrors(),fl=await E('JSON.parse(JSON.stringify(G.flags))');await shot('end');await ctx.close();
 const ok=mode==='end'&&errors.length===0&&got&&!!fl.flood&&!!fl.reedSolved&&!!fl.camp&&!!fl.templeSeal&&!!fl.cure&&!!fl.tal&&!!fl.boss;
 console.log(`[playthrough ${tag}] mode=${mode} encounter=${got} party=${party.join(',')} flags=${Object.keys(fl||{}).join('+')} errors=${JSON.stringify(errors)} → ${ok?'PASS':'FAIL'}`);return ok}
if(import.meta.url===`file://${process.argv[1]}`){const s=await serve(),b=await launch();const a=process.argv.slice(2);
 const runs=a.length?[[+a[0],+a[1],a[2]!=='0']]:[[390,664,true],[844,390,true]];let ok=true;
 for(const[W,H,t]of runs)ok=await playthrough(b,process.env.URL||s.url,W,H,t)&&ok;await b.close();s.close();process.exit(ok?0:1)}
