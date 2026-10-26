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
   const foliageBlocked=blocked(25*T,16*T),approachClear=!blocked(25*T,14.5*T)&&!blocked(29*T,16*T);
   const levels=(()=>{const a=waterY(21*T);G_().flags.flood=1;const b=waterY(21*T);G_().flags.dawn=1;const c=waterY(21*T);return[a,b,c]})();
   return{world:[m.W,m.H],objects:m.obj.length,reachable:points.map(([n,x,y,r])=>[n,reachable(x,y,r)]),foliageBlocked,approachClear,levels};
  });
  assert.deepEqual(q.world,[42*32,28*32]);assert(q.objects>=45,`village dressing count ${q.objects}`);
  assert(q.reachable.every(([,ok])=>ok),`unreachable town destinations: ${JSON.stringify(q.reachable)}`);
  assert(q.foliageBlocked,'market-side foliage must block the reported pass-through spot');assert(q.approachClear,'open approaches around market-side foliage remain walkable');
  assert(q.levels[1]<q.levels[0]-24&&q.levels[2]>q.levels[1]+24,'waterfront recedes after flood and recovers at dawn');
  assert.deepEqual(await jsErrors(),[]);console.log(`[village-layout] 42×28 world, ${q.objects} props, all village destinations reachable, flood shoreline changes PASS`);
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villageLayout(b,s.url)}finally{await b.close();s.close()}}
