import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';
const scenes=[['reeds',['小水妖','小水妖','蘆葦精']],['river',['小水妖','小水妖']],['temple',['河伯']]];
export async function battleBackgrounds(browser,url,sizes=[...SIZES,[1024,768]],verify=true){
 for(const [w,h] of sizes){const {ctx,pg,jsErrors}=await newPage(browser,w,h,{seed:true});
 try{await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
 await pg.evaluate(()=>{press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',50,26,6,2,12,['劍氣']))});
 for(const [name,enemies] of scenes){
  await pg.evaluate(({name,enemies})=>{__sb(enemies,{noEsc:1,bg:'bg_'+name});const B=G_().B;B.msgs=[];B.ph='cmd';B.ai=0},{name,enemies});await pg.clock.runFor(700);
  if(verify){const state=await pg.evaluate(()=>{const B=G_().B;return{fit:B.bgFit,feet:[...B.L.feet,...B.L.en(B.en.length,B.en[0].boss&&B.en.length===1)]}});
   assert.equal(state.fit.key,'bg_'+name);assert.ok(state.fit.width>=1500&&state.fit.height>=900,'HD background loaded');
   const stage=JSON.parse(fs.readFileSync(path.join('docs/art/battle-backgrounds-v26',name+'-stage.json'),'utf8'));
   for(const p of state.feet){const u=(p[0]-state.fit.ox)/(state.fit.width*state.fit.s),v=(p[1]-state.fit.oy)/(state.fit.height*state.fit.s);
    assert.ok(u>=.05&&u<=.95&&v>=.24&&v<=.98,name+' feet on painted ground '+JSON.stringify({w,h,u,v}));
    for(const region of stage.protectedRegions){const [x0,y0,x1,y1]=region.box;assert.ok(!(u>=x0&&u<=x1&&v>=y0&&v<=y1),name+' feet avoid '+region.id)}
   }
  }
  await pg.screenshot({path:outDir('battle-backgrounds',w+'x'+h)+'/'+name+'.png'});
 }
 assert.deepEqual(await jsErrors(),[]);console.log('[battle-backgrounds '+w+'x'+h+'] '+(verify?'three scenes, ground contact, no errors PASS':'baseline captures only'));
 }finally{await ctx.close()}}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await battleBackgrounds(b,s.url)}finally{await b.close();s.close()}}
