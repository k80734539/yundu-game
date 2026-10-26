import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

// 河神廟：可走區域遮罩（temple_walk_v44.png）——互動點可達、石井／廟牆／石泉擋得住、隨機亂走不會站進擋人處。
export async function templeWalk(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{seed:true});
 try{
  await pg.goto(url);await pg.waitForTimeout(1200);
  const q=await pg.evaluate(()=>{
   newGame();G_().dlg=null;G_().flags.reedSolved=1;loadMap('temple',10.5*T2,13.8*T2,'up');G_().dlg=null;
   const m=M_(),step=12,cols=Math.ceil(m.W/step),rows=Math.ceil(m.H/step),valid=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!blocked((i+.5)*step,(j+.5)*step);
   const sx=Math.floor(G_().x/step),sy=Math.floor(G_().y/step),queue=[[sx,sy]],seen=new Set([sy*cols+sx]);
   for(let p=0;p<queue.length;p++){const[i,j]=queue[p];for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj,id=b*cols+a;if(valid(a,b)&&!seen.has(id)){seen.add(id);queue.push([a,b])}}}
   const reachable=(x,y,r)=>queue.some(([i,j])=>Math.hypot((i+.5)*step-x,(j+.5)*step-y)<r);
   const points=m.inter.map(it=>[Math.round(it.x)+','+Math.round(it.y),it.x,it.y,it.r+12]).concat([['左路盡頭（石碑前）',128,425,20],['右路盡頭（石泉前）',790,515,20],['左路中段',320,408,14],['左路中段2',216,444,14],['左路中段3',155,462,14],['右路中段',745,470,14]]);
   const solids=[['hall wall',400,70],['well basin',512,355],['left lamp',438,300],['pool',850,462],['left tree',330,290],['right tree',650,290],['water west',60,300],['water south',300,690]].map(([n,x,y])=>[n,blocked(x,y)]);
   const open=[[512,500],[512,440],[512,250],[512,610],[200,470],[120,422],[760,490]].map(([x,y])=>!blocked(x,y));
   let s=7;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648,bad=[];let n=0;
   for(let k=0;k<1500;k++){const x=20+rnd()*(m.W-40),y=20+rnd()*(m.H-40);if(blocked(x,y))continue;n++;const a=rnd()*6.283,dt=k%5==0?3:1;clearK();loadMap('temple',x,y,'down');G_().x=x;G_().y=y;
    for(let i=0;i<260;i++){const c=Math.cos(a),d=Math.sin(a);keys.right=c>.38;keys.left=c<-.38;keys.down=d>.38;keys.up=d<-.38;update(dt);if(G_().mode!='map'||G_().dlg)break;if(blocked(G_().x,G_().y)){bad.push([x|0,y|0,k]);break}}clearK()}
   return{world:[m.W,m.H],reachable:points.map(([n,x,y,r])=>[n,reachable(x,y,r)]),solids,open,walk:{n,bad}};
  });
  assert.deepEqual(q.world,[960,720]);
  assert(q.reachable.length>=3&&q.reachable.every(([,ok])=>ok),`unreachable temple destinations: ${JSON.stringify(q.reachable)}`);
  assert(q.solids.every(([,ok])=>ok),`temple solid should block: ${JSON.stringify(q.solids)}`);
  assert(q.open.every(Boolean),`temple open ground must stay walkable: ${JSON.stringify(q.open)}`);
  assert(q.walk.n>150&&q.walk.bad.length==0,`random walks entered a solid: ${JSON.stringify(q.walk)}`);
  assert.deepEqual(await jsErrors(),[]);console.log('[temple-walk] walkable mask, destinations reachable, solids block, random walks stay out PASS');
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await templeWalk(b,s.url)}finally{await b.close();s.close()}}
