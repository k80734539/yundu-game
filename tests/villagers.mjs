import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';
const people=[['lin','林嬸'],['zhou','老周'],['granny','阿婆'],['chief','村長'],['wang','王大叔']];
export async function villagers(browser,url,sizes=[[390,664],[844,390],[1024,768]]){
 for(const [w,h] of sizes){const {ctx,pg,jsErrors}=await newPage(browser,w,h,{seed:true}),dir=outDir('villagers',w+'x'+h);
  try{await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);await pg.evaluate(()=>{newGame();G_().dlg=null});
   for(const [key,name] of people){
    const state=await pg.evaluate(({key,name})=>{
     G_().scene=null;G_().dlg=null;loadMap('village',15*T,15*T,'down');const npc=M_().npcs.find(n=>n.k===key);G_().x=npc.x+40;G_().y=npc.y+50;
     const image=I[key],portrait=I['pt_'+key],c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.drawImage(portrait,0,0);const data=x.getImageData(0,0,512,512).data;let opaqueKey=0,clear=0;
     for(let i=0;i<data.length;i+=4){if(data[i+3]===0)clear++;if(data[i+3]>220&&data[i]>180&&data[i+1]<80&&data[i+2]>180)opaqueKey++}
     return{sprite:[image.naturalWidth,image.naturalHeight],portrait:[portrait.naturalWidth,portrait.naturalHeight],key:PORT[name],routes:['down','up','left','right'].map(d=>spriteKey(key,d,0)),height:image.naturalHeight*sprK(key),foot:sprFeet(key),collider:M_().sol.some(r=>r[0]===npc.x-11&&r[1]===npc.y-9&&r[2]===22&&r[3]===10),opaqueKey,clear};
    },{key,name});
    assert.deepEqual(state.sprite,[192,192]);assert.deepEqual(state.portrait,[512,512]);assert.equal(state.key,key);assert.deepEqual(state.routes,Array(4).fill(key),'all facing choices retain supplied villager');
    assert.ok(state.height>60&&state.height<75,'NPC draws at map scale');assert.equal(state.foot,180);assert.ok(state.collider,'art does not enlarge collision');assert.equal(state.opaqueKey,0);assert.ok(state.clear>20000,'portrait has transparent backdrop');
    await pg.clock.runFor(50);await pg.screenshot({path:dir+'/'+key+'-map.png'});
    await pg.evaluate(key=>M_().npcs.find(n=>n.k===key).talk(),key);await pg.clock.runFor(1400);
    assert.equal(await pg.evaluate(()=>G_().dlg.l[G_().dlg.i][0]),name);await pg.screenshot({path:dir+'/'+key+'-dialog.png'});
   }
   assert.deepEqual(await jsErrors(),[]);console.log('[villagers '+w+'x'+h+'] five supplied identities, transparent busts, scale, feet, dialogue and collisions PASS');
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villagers(b,s.url)}finally{await b.close();s.close()}}
