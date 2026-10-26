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
   const solids=[['upper-left home',3.2,3],['west home',5,8],['main hall',22,3],['east home',38,3],['southwest home',4,17],['southeast home',36,16.5],['central tree trunk',14.8,11.8],['market tree trunk',28.8,10.2],['west-edge tree trunk',2.2,9.2],['well',12.7,12.1],['market stall',26,11.5],['yard fence',5.3,5.4],['reported tree position',906/T,446/T],['market shrub and wall',25,16]];
   const landmarkBlocked=solids.map(([name,x,y])=>[name,blocked(x*T,y*T)]),approaches=[[690,520],[920,408],[1034,492],[920,606]].map(([x,y])=>!blocked(x,y));
   const movement=[['down',906,406],['up',920,606],['right',830,446],['left',1020,446]].map(([dir,x,y])=>{clearK();G_().x=x;G_().y=y;keys[dir]=1;const samples=[];for(let i=0;i<120;i++){update(1);samples.push([G_().x,G_().y])}clearK();return{dir,x:G_().x,y:G_().y,clear:samples.every(([a,b])=>!blocked(a,b))}});
   loadMap('village',906,446,'down');const restored={x:G_().x,y:G_().y,clear:!blocked(G_().x,G_().y)};
   const levels=(()=>{const a=waterY(21*T);G_().flags.flood=1;const b=waterY(21*T);G_().flags.dawn=1;const c=waterY(21*T);return[a,b,c]})();
   return{world:[m.W,m.H],objects:m.obj.length,reachable:points.map(([n,x,y,r])=>[n,reachable(x,y,r)]),landmarkBlocked,approaches,movement,restored,levels};
  });
  assert.deepEqual(q.world,[42*32,28*32]);assert(q.objects>=45,`village dressing count ${q.objects}`);
  assert(q.reachable.every(([,ok])=>ok),`unreachable town destinations: ${JSON.stringify(q.reachable)}`);
  assert(q.landmarkBlocked.every(([,ok])=>ok),`landmark should block movement: ${JSON.stringify(q.landmarkBlocked)}`);assert(q.approaches.every(Boolean),'open routes around landmarks must remain walkable');
  assert(q.movement.every(m=>m.clear),`movement entered a solid: ${JSON.stringify(q.movement)}`);
  assert(q.movement[0].y<=414&&q.movement[1].y>=551&&q.movement[2].x<=838&&q.movement[3].x>=1002,`four approaches crossed the reported tree: ${JSON.stringify(q.movement)}`);
  assert(q.restored.clear&&Math.hypot(q.restored.x-906,q.restored.y-446)>0,'old save inside the new blocker must move to clear ground');
  assert(q.levels[1]<q.levels[0]-24&&q.levels[2]>q.levels[1]+24,'waterfront recedes after flood and recovers at dawn');
  assert.deepEqual(await jsErrors(),[]);console.log(`[village-layout] 42×28 world, ${q.objects} props, all village destinations reachable, flood shoreline changes PASS`);
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villageLayout(b,s.url)}finally{await b.close();s.close()}}
