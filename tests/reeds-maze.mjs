import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';

export async function reedsMaze(browser,url,sizes=[[390,664],[844,390]]){
 for(const[W,H]of sizes){const{ctx,pg,jsErrors}=await newPage(browser,W,H,{touch:true,seed:true}),dir=outDir('reeds-maze',`${W}x${H}`);
 try{
  await pg.goto(url);await pg.waitForFunction('ready');
  await pg.evaluate(()=>{
   newGame();G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));loadMap('reeds',...REEDS_LAYOUT.nodes.spawn,'right');Math.random=()=>.99;
   window.__mazeFlush=()=>{for(let i=0;i<400&&G_().dlg;i++)press('ok')};
   window.__mazeRoute=(target,reach=8)=>{
    const step=8,cols=Math.ceil(M_().W/step),rows=Math.ceil(M_().H/step),sx=Math.floor(G_().x/step),sy=Math.floor(G_().y/step),start=sy*cols+sx;
    const parent=new Int32Array(cols*rows);parent.fill(-1);parent[start]=start;const queue=[start];let found=-1;
    for(let p=0;p<queue.length;p++){const id=queue[p],x=id%cols,y=Math.floor(id/cols),px=(x+.5)*step,py=(y+.5)*step;if(Math.hypot(px-target[0],py-target[1])<=reach){found=id;break}
     for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||parent[n]!=-1||blocked((nx+.5)*step,(ny+.5)*step))continue;parent[n]=id;queue.push(n)}}
    if(found<0)return null;const path=[];for(let n=found;;n=parent[n]){path.push([(n%cols+.5)*step,(Math.floor(n/cols)+.5)*step]);if(n===start)break}return path.reverse();
   };
   window.__mazeWalk=target=>{const path=window.__mazeRoute(target,4);if(!path)throw Error('No route to '+target);const map=G_().map;let distance=0,ticks=0;
    for(const[x,y]of path)for(let i=0;i<20;i++){const dx=x-G_().x,dy=y-G_().y,d=Math.hypot(dx,dy);if(d<.75)break;clearK();if(Math.abs(dx)>.1)keys[dx>0?'right':'left']=1;if(Math.abs(dy)>.1)keys[dy>0?'down':'up']=1;const a=G_().x,b=G_().y;update(Math.min(1,d/2.5));ticks++;clearK();const moved=Math.hypot(G_().x-a,G_().y-b);distance+=moved;if(G_().map!==map)return{distance,ticks,transition:G_().map};if(G_().B)return{distance,ticks,battle:true,x:G_().x,y:G_().y};if(blocked(G_().x,G_().y))throw Error('Controller entered solid at '+[G_().x,G_().y]);window.__mazeFlush();if(moved<.01)throw Error('Controller stalled at '+[a,b]+' toward '+[x,y])}
    return{distance,ticks,x:G_().x,y:G_().y};
   };
  });
  const locked=await pg.evaluate(()=>({world:[M_().W,M_().H],spawnClear:!blocked(G_().x,G_().y),north:!!__mazeRoute([1215,142]),west:!!__mazeRoute([140,354]),talisman:!!__mazeRoute([670,338]),roots:REEDS_LAYOUT.gates.map(g=>!!__mazeRoute(g.approach)),camp:!!__mazeRoute([718,590]),exit:!!__mazeRoute([1260,760]),water:[[550,230],[800,445],[110,600],[1050,700]].map(([x,y])=>!!blocked(x,y)),gates:REEDS_LAYOUT.gates.map(g=>!!blocked(g.x,g.y))}));
  assert.deepEqual(locked.world,[1344,896]);assert(locked.spawnClear&&locked.north&&locked.west&&locked.talisman&&locked.roots.every(Boolean));assert(!locked.camp&&!locked.exit,'roots must physically prevent access to the south');assert(locked.water.every(Boolean)&&locked.gates.every(Boolean),'water and root bridges block before clearing');
  const migration=await pg.evaluate(()=>{const flags=JSON.stringify(G_().flags),opened=JSON.stringify(G_().opened);loadMap('reeds',600,600,'down');return{position:[G_().x,G_().y],preserved:flags===JSON.stringify(G_().flags)&&opened===JSON.stringify(G_().opened)}});assert.deepEqual(migration.position,[100,122],'an old save below locked bridges must return to the entrance');assert(migration.preserved,'map migration preserves quest and treasure progress');
  const gateMoves=await pg.evaluate(()=>{const result=[];for(const x of [670,922]){TP(x,390,'down');clearK();keys.down=1;for(let i=0;i<40;i++)update(3);clearK();result.push({y:G_().y,clear:!blocked(G_().x,G_().y)})}TP(...REEDS_LAYOUT.nodes.spawn,'right');return result});assert(gateMoves.every(p=>p.clear&&p.y<=432),'both root barriers stop the real controller at the maximum frame step');
  // Walk the actual controller into each optional branch; chest identities remain save-compatible.
  for(const target of [[1215,142],[140,354]]){await pg.evaluate(t=>__mazeWalk(t),target);await pg.evaluate(()=>{G_().dir='up';press('ok');__mazeFlush()})}
  await pg.evaluate(()=>__mazeWalk([670,338]));assert.equal(await pg.evaluate('!!G_().flags.tal'),true,'walking into the paper clearing triggers its story');
  await pg.evaluate(()=>__mazeWalk([670,390]));await pg.waitForTimeout(80);await pg.screenshot({path:`${dir}/roots-locked.png`});
  await pg.evaluate(()=>{for(let i=0;i<3;i++){G_().dir='down';press('ok');__mazeFlush()}});
  const opened=await pg.evaluate(()=>({solved:!!G_().flags.reedSolved,gates:REEDS_LAYOUT.gates.map(g=>!blocked(g.x,g.y)),camp:!!__mazeRoute([718,590]),exit:!!__mazeRoute([1260,760]),south:!!__mazeRoute([660,778])}));
  assert(opened.solved&&!opened.gates[0]&&opened.gates[1]&&opened.camp&&opened.exit&&opened.south,'clearing roots opens the east crossing and southern paths, while the shortcut remains guarded by the boss');await pg.screenshot({path:`${dir}/shortcut-boss-locked.png`});
  // Refusing an early departure must put the player on the road, never in the canal.
  await pg.evaluate(()=>{TP(1220,760,'right');clearK();keys.right=1;for(let i=0;i<8&&!G_().dlg;i++)update(1);clearK()});
  assert.equal(await pg.evaluate("G_().map==='reeds'&&!!G_().dlg&&!blocked(G_().x,G_().y)"),true);await pg.evaluate('__mazeFlush()');
  await pg.evaluate(()=>{G_().party.forEach(p=>{p.hp=1;p.mp=0})});const guarded=await pg.evaluate(()=>__mazeWalk([718,590]));assert(guarded.battle,'the real controller is intercepted by the fixed boss before it can reach the camp');
  await pg.evaluate(()=>{G_().B.en[0].hp=0;win();for(let i=0;i<12&&(G_().B||G_().dlg);i++)press('ok');__mazeFlush()});await pg.evaluate(()=>__mazeWalk([718,590]));
  const camp=await pg.evaluate(()=>{const cp=JSON.parse(G_().cp);return{rest:!!G_().flags.camp,healed:G_().party.every(p=>p.hp===p.mhp&&p.mp===p.mmp),savedFlag:!!cp.flags.camp,checkpointClear:!blocked(cp.o.x,cp.o.y)}});
  assert(camp.rest&&camp.healed&&camp.savedFlag&&camp.checkpointClear,'camp heals and stores a safe checkpoint with completed rest flag: '+JSON.stringify(camp));await pg.waitForTimeout(80);await pg.screenshot({path:`${dir}/camp.png`});
  await pg.evaluate(()=>{__mazeWalk([660,778]);G_().dir='up';press('ok');__mazeFlush()});const treasure=await pg.evaluate(()=>({keys:Object.keys(CHESTS).every(k=>G_().opened[k]&&REEDS_LAYOUT.chests.some(c=>c.key===k)),fish:G_().inv.魚乾,charm:G_().inv.護身符,cloth:G_().inv.刻字布條,arm:G_().party[0].arm,flag:G_().flags.foundCloth}));assert(treasure.keys&&treasure.fish>=2&&treasure.charm===1&&treasure.cloth===1&&treasure.arm===2&&treasure.flag,'three original chest keys award the intended rewards: '+JSON.stringify(treasure));await pg.screenshot({path:`${dir}/treasure-branch.png`});
  // Patrol each normal bank using real movement, including a diagonal attempt at the edge.
  const banks=await pg.evaluate(()=>{const result=[];for(const joy of [false,true]){TP(800,122,'down');clearK();if(joy){JOY.on=true;JOY.x=.7;JOY.y=.7}else keys.down=1;for(let i=0;i<100;i++)update(1);clearK();result.push({clear:!blocked(G_().x,G_().y),y:G_().y})}return result});assert(banks.every(p=>p.clear&&p.y<=146),'keyboard and diagonal joystick cannot leave the raised bank');
  const edges=await pg.evaluate(()=>[[800,122,'up'],[800,122,'down'],[414,230,'left'],[414,230,'right'],[800,338,'up'],[800,338,'down'],[1220,660,'left'],[1220,660,'right'],[530,760,'up'],[530,760,'down']].map(([x,y,dir])=>{TP(x,y,dir);clearK();keys[dir]=1;for(let i=0;i<30;i++)update(3);clearK();return{dir,clear:!blocked(G_().x,G_().y),distance:Math.hypot(G_().x-x,G_().y-y)}}));assert(edges.every(e=>e.clear&&e.distance<=35),'ten independently sampled road edges stop movement toward the water: '+JSON.stringify(edges));
  await pg.evaluate(()=>__mazeWalk([1260,760]));assert.equal(await pg.evaluate('G_().map'),'temple_shore','walking through the gateway enters the temple shore');assert.deepEqual(await jsErrors(),[]);
  console.log(`[reeds-maze ${W}x${H}] actual walks, three treasures, locked/open shortcuts, shoreline, touch input, safe camp, temple transition PASS`);
 }finally{await ctx.close()}}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await reedsMaze(b,process.env.URL||s.url)}finally{await b.close();s.close()}}
