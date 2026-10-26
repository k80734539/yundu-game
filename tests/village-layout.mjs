import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

export async function villageLayout(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{seed:true});
 try{
  await pg.goto(url);await pg.waitForTimeout(1200);
  const q=await pg.evaluate(()=>{
   newGame();G_().dlg=null;
   const m=M_(),step=12,cols=Math.ceil(m.W/step),rows=Math.ceil(m.H/step),valid=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!blocked((i+.5)*step,(j+.5)*step);
   const sx=Math.floor(G_().x/step),sy=Math.floor(G_().y/step),queue=[[sx,sy]],seen=new Set([sy*cols+sx]);
   for(let p=0;p<queue.length;p++){const[i,j]=queue[p];for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj,id=b*cols+a;if(valid(a,b)&&!seen.has(id)){seen.add(id);queue.push([a,b])}}}
   const reachable=(x,y,r)=>queue.some(([i,j])=>Math.hypot((i+.5)*step-x,(j+.5)*step-y)<r);
   const points=[...m.npcs.filter(n=>n.talk).map(n=>[n.n,n.x,n.y-14,32]),['家巷',10.8*T,5.8*T,34],['小石頭家',38*T,7.7*T,34],['渡口',21*T,23.1*T,46]];
   const solids=[['upper-left home',3.2,3],['west home',5,8],['main hall',22,3],['east home',38,3],['southwest home',4,17],['southeast home',36,16.5],['central tree trunk',14.8,11.8],['market tree trunk',28.8,10.2],['west-edge tree trunk',2.2,9.2],['well',12.7,12.1],['market stall',26,11.5],['yard fence',5.3,5.4],['market shrub island',21.4,15.2],['market shrub and wall',25,16]];
   const landmarkBlocked=solids.map(([name,x,y])=>[name,blocked(x*T,y*T)]),approaches=[[20,14],[19.8,15.2],[25,14.5],[29,16],[21.4,16.5],[30,17]].map(([x,y])=>!blocked(x*T,y*T));
   const levels=(()=>{const a=waterY(21*T);G_().flags.flood=1;const b=waterY(21*T);G_().flags.dawn=1;const c=waterY(21*T);return[a,b,c]})();
   return{world:[m.W,m.H],objects:m.obj.length,reachable:points.map(([n,x,y,r])=>[n,reachable(x,y,r)]),landmarkBlocked,approaches,levels};
  });
  assert.deepEqual(q.world,[42*32,28*32]);assert(q.objects>=45,`village dressing count ${q.objects}`);
  assert(q.reachable.every(([,ok])=>ok),`unreachable town destinations: ${JSON.stringify(q.reachable)}`);
  assert(q.landmarkBlocked.every(([,ok])=>ok),`landmark should block movement: ${JSON.stringify(q.landmarkBlocked)}`);assert(q.approaches.every(Boolean),'open routes around landmarks must remain walkable');
  assert(q.levels[1]<q.levels[0]-24&&q.levels[2]>q.levels[1]+24,'waterfront recedes after flood and recovers at dawn');
  assert.deepEqual(await jsErrors(),[]);console.log(`[village-layout] 42×28 world, ${q.objects} props, all village destinations reachable, flood shoreline changes PASS`);
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villageLayout(b,s.url)}finally{await b.close();s.close()}}
