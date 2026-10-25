import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';
const speakers=[['陳青舟','風從河面吹來，渡船還停在蘆花渡。'],['白苓','別擔心，我會跟你一起走。'],['雲纖','前面便是河神廟，小心行事。']];
export async function portraitUI(browser,url,sizes=[...SIZES,[1024,768]],verify=true){
 for(const [w,h] of sizes){const {ctx,pg,jsErrors}=await newPage(browser,w,h,{seed:true});
 try{await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);await pg.evaluate(()=>{press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',50,26,6,2,12,['劍氣']));__sb(['小水妖','小水妖'],{noEsc:1});const B=G_().B;B.msgs=[];B.ph='cmd';B.ai=0});await pg.clock.runFor(700);
 if(verify){const portraits=await pg.evaluate(()=>{const result=[];for(const k of ['qz','bl','yx']){const im=I['pt_'+k],c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,512,512).data;let transparent=0,key=0,solid=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0)transparent++;if(d[i+3]>220){solid++;if(d[i]>220&&d[i+2]>220&&d[i+1]<50)key++}}result.push({k,w:im.naturalWidth,h:im.naturalHeight,transparent,solid,key,same:im.src===I['pt_'+k+'_battle'].src})}return result});
 for(const p of portraits){assert.equal(p.w,512);assert.equal(p.h,512);assert.ok(p.transparent>20000&&p.solid>20000,'transparent bust with visible subject '+p.k);assert.equal(p.key,0,'no opaque magenta '+p.k);assert.equal(p.same,true,'shared dialogue/battle artwork '+p.k)}
 const cards=await pg.evaluate(()=>G_().B.cards);for(const c of cards){assert.ok(c.portrait.x>=0&&c.portrait.y>=0&&c.portrait.x+c.portrait.w<=w&&c.portrait.y+c.portrait.h<=h,'portrait inside viewport');assert.ok(c.y<=c.portrait.y&&c.y+c.h>=c.portrait.y+c.portrait.h,'portrait covered by ally touch region')}
 }
 await pg.screenshot({path:outDir('portrait-ui',w+'x'+h)+'/battle.png'});
 if(verify){await pg.evaluate(()=>{const B=G_().B;G_().party.forEach(p=>p.hp=p.mhp-10);G_().inv.魚乾=1;B.ai=0;B.ph='target';B.tk='A';B.pend={t:'it',k:'魚乾'};B.msgs=[]});await pg.clock.runFor(34);const point=await pg.evaluate(()=>{const p=G_().B.cards[1].portrait;return{x:p.x+p.w/2,y:p.y+p.h*.3}});await pg.touchscreen.tap(point.x,point.y);await pg.clock.runFor(34);assert.equal(await pg.evaluate(()=>G_().party[1].hp===G_().party[1].mhp&&G_().party[0].hp<G_().party[0].mhp&&G_().inv.魚乾===0),true,'floating portrait selects intended ally')}
 for(const [name,line] of speakers){await pg.evaluate(({name,line})=>{G_().B=null;G_().mode='map';say([[name,line]])},{name,line});await pg.clock.runFor(150);await pg.screenshot({path:outDir('portrait-ui',w+'x'+h)+'/'+name+'.png'})}
 assert.deepEqual(await jsErrors(),[]);console.log('[portrait-ui '+w+'x'+h+'] '+(verify?'transparent artwork, ally portrait tap, dialogue/battle PASS':'baseline captures'));
 }finally{await ctx.close()}}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await portraitUI(b,s.url)}finally{await b.close();s.close()}}
