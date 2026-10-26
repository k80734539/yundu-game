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
   const points=[...m.npcs.filter(n=>n.talk).map(n=>[n.n,n.x,n.y-14,32]),['家巷',10.8*T,5.8*T,34],['小石頭家',38.6*T,10.3*T,34],['渡口',21*T,23.1*T,46]];
   const solids=[['upper-left home',3.2,3],['west home',5,8],['main hall',22,3],['east home',38,3],['southwest home',4,17],['southeast home',36,16.5],['central tree trunk',16.6,10.9],['market tree trunk',28.8,10.2],['west-edge tree trunk',2.2,9.2],['well',12.7,12.1],['market stall',26,11.5],['yard fence',5.3,5.4],['reported tree position',906/T,446/T],['market shrub and wall',25,16]];
   const landmarkBlocked=solids.map(([name,x,y])=>[name,blocked(x*T,y*T)]),approaches=[[690,520],[690,380],[640,448],[690,660]].map(([x,y])=>!blocked(x,y));
   // 從可走區域隨機出發，用真正的 update() 朝各方向走，最後一定不能站進擋人處（含 dt=3 的卡頓大步）。
   const movement=(()=>{let s=7;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648,bad=[];let n=0;
    for(let k=0;k<1500;k++){const x=20+rnd()*(m.W-40),y=20+rnd()*(m.H-40);if(blocked(x,y))continue;n++;const a=rnd()*6.283,dt=k%5==0?3:1;clearK();loadMap('village',x,y,'down');G_().x=x;G_().y=y;
     for(let i=0;i<260;i++){const c=Math.cos(a),d=Math.sin(a);keys.right=c>.38;keys.left=c<-.38;keys.down=d>.38;keys.up=d<-.38;update(dt);if(G_().mode!='map'||G_().dlg)break;if(blocked(G_().x,G_().y)){bad.push([x|0,y|0,k]);break}}clearK()}
    return{n,bad}})();
   loadMap('village',906,446,'down');const restored={x:G_().x,y:G_().y,clear:!blocked(G_().x,G_().y)};
   const levels=(()=>{const a=waterY(21*T);G_().flags.flood=1;const b=waterY(21*T);G_().flags.dawn=1;const c=waterY(21*T);return[a,b,c]})();
   return{world:[m.W,m.H],objects:m.obj.length,reachable:points.map(([n,x,y,r])=>[n,reachable(x,y,r)]),landmarkBlocked,approaches,movement,restored,levels};
  });
  assert.deepEqual(q.world,[42*32,28*32]);assert(q.objects>=45,`village dressing count ${q.objects}`);
  assert(q.reachable.every(([,ok])=>ok),`unreachable town destinations: ${JSON.stringify(q.reachable)}`);
  assert(q.landmarkBlocked.every(([,ok])=>ok),`landmark should block movement: ${JSON.stringify(q.landmarkBlocked)}`);assert(q.approaches.every(Boolean),'open routes around landmarks must remain walkable');
  assert(q.movement.n>150&&q.movement.bad.length==0,`random walks entered a solid: ${JSON.stringify(q.movement)}`);
  assert(q.restored.clear&&Math.hypot(q.restored.x-906,q.restored.y-446)>0,'old save inside the new blocker must move to clear ground');
  assert(q.levels[1]<q.levels[0]-24&&q.levels[2]>q.levels[1]+24,'waterfront recedes after flood and recovers at dawn');
  assert.deepEqual(await jsErrors(),[]);console.log(`[village-layout] 42×28 world, ${q.objects} props, all village destinations reachable, flood shoreline changes PASS`);
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villageLayout(b,s.url)}finally{await b.close();s.close()}}
