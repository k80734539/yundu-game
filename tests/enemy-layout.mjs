import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export async function enemyLayout(b,url,sizes=[...SIZES,[1024,768]]){
for(const [w,h] of sizes){const {ctx,pg,jsErrors}=await newPage(b,w,h,{seed:true});await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);await pg.evaluate(()=>{press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',50,26,6,2,12,['劍氣']))});
for(const [label,names] of [['single',['小水妖']],['pair',['小水妖','小水妖']],['trio',['小水妖','小水妖','蘆葦精']],['boss',['河伯']]]){await pg.evaluate(names=>{__sb(names,{noEsc:1});const B=G_().B;B.msgs=[];B.ph='cmd';B.ai=0},names);await pg.clock.runFor(700);
const layout=await pg.evaluate(()=>{const B=G_().B;return{party:B.L.feet,en:B.L.en(B.en.length,B.en[0].boss&&B.en.length===1),rects:B.en.map(e=>B.po(e)),U:B.L.U,hudTop:B.L.py,labelPad:FS()+16}});
const lane=Math.min(...layout.party.map(p=>p[0]))-Math.max(...layout.en.map(p=>p[0]));
assert.ok(lane>=((h>w)?80*layout.U:w*.25),'central lane stays open between opposing ranks');
for(const rank of [layout.en,layout.party])for(let i=1;i<rank.length;i++){assert.ok(rank[i][0]>rank[i-1][0]&&rank[i][1]<rank[i-1][1],'both ranks rise toward the right')}
assert.ok(Math.max(...layout.en.map(p=>p[1]))+layout.labelPad<layout.hudTop,'enemy labels stay above portrait HUD');
for(const q of layout.rects){assert.ok(q[0]-q[2]/2>=0&&q[0]+q[2]/2<=w&&q[1]-q[3]/2>=0&&q[1]+q[3]/2<h,'enemy visible')}
await pg.screenshot({path:outDir('enemy-layout',`${w}x${h}`)+'/'+label+'.png'});}
assert.deepEqual(await jsErrors(),[]);await ctx.close();console.log('Enemy formation '+w+'x'+h+' PASS')}return true}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await enemyLayout(b,s.url)}finally{await b.close();s.close()}}
