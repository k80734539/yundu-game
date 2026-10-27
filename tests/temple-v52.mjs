import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

// 河神廟三張圖（v52 階段一）：路線可達、條件邊與鎮水門、轉場、燈籠只能點亮一次、舊存檔搬家、亂走不進擋人處。
export async function templeV52(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,844,390,{touch:false,seed:true});
 try{
  await pg.goto(url);await pg.waitForFunction('ready');await pg.waitForTimeout(500);

  // 1. 路線可達：各張圖從入口出發，BFS 走得到所有節點、出口、互動點。
  const reach=await pg.evaluate(()=>{
   const out={};
   const bfs=(key,flags)=>{
    newGame();G.dlg=null;Object.assign(G.flags,flags);
    const L=TEMPLE_LAYOUTS[key];loadMap(L.id,...templePos(key,'arrival'),'up');G.dlg=null;
    const m=M,step=8,cols=Math.ceil(m.W/step),rows=Math.ceil(m.H/step),ok=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!blocked((i+.5)*step,(j+.5)*step);
    const sx=Math.floor(G.x/step),sy=Math.floor(G.y/step),q=[[sx,sy]],seen=new Set([sy*cols+sx]);
    for(let p=0;p<q.length;p++){const[i,j]=q[p];for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const A=i+a,B=j+b,id=B*cols+A;if(ok(A,B)&&!seen.has(id)){seen.add(id);q.push([A,B])}}}
    const near=(x,y,r)=>q.some(([i,j])=>Math.hypot((i+.5)*step-x,(j+.5)*step-y)<r);
    return{near,nodes:L.nodes,zones:L.zones,L,inter:m.inter.map(it=>[Math.round(it.x),Math.round(it.y),it.r,!!it.vxSpot]),npcs:m.npcs.map(n=>[n.k,n.x,n.y])};
   };
   const open={templeLamps:7,templeSeal:1,steleSeen:1,templeShorePole:1,templeSluice:1};
   for(const key of['shore','court','hall']){
    const b=bfs(key,open),miss=[];
    for(const[n,[x,y]]of Object.entries(b.nodes))if(!b.near(x,y,20))miss.push('node:'+n);
    for(const[n,[x,y,w,h]]of Object.entries(b.zones))if(!b.near(x+w/2,y+h/2,Math.max(w,h)))miss.push('zone:'+n);
    for(const it of b.inter)if(!b.near(it[0],it[1],it[2]+8))miss.push('inter:'+it[0]+','+it[1]);
    out[key]={miss,inter:b.inter.length};
   }
   // 條件：燈沒亮 → 鎮水門以北（水府入口）走不到；封印沒開 → 河伯所在走不到。
   const closed=bfs('court',{});out.wardClosed=!closed.near(672,130,40);out.channelClosed=!closed.near(672,450,30);
   const hallClosed=bfs('hall',{templeLamps:7});out.bossClosed=!hallClosed.near(672,150,40);
   const courtOpen=bfs('court',{templeLamps:7});out.wardOpen=courtOpen.near(672,130,40);out.channelOpen=courtOpen.near(672,450,30);
   return out;
  });
  for(const k of['shore','court','hall'])assert.deepEqual(reach[k].miss,[],`unreachable on ${k}: ${JSON.stringify(reach[k])}`);
  assert(reach.wardClosed&&reach.channelClosed,'with lamps unlit, the ward gate and flooded channel stay closed');
  assert(reach.wardOpen&&reach.channelOpen,'with all lamps lit, the ward gate and the channel shortcut open');
  assert(reach.bossClosed,'the boss approach stays closed until the seal is weakened');

  // 2. 轉場：用真的移動走進出入口。
  const travel=await pg.evaluate(async()=>{
   const walk=(key,dir,n)=>{const m0=G.map;clearK();keys[dir]=1;for(let i=0;i<n;i++){update(1);if(G.map!==m0||G.mode!=='map'||G.dlg)break}clearK()};
   const r=[];
   newGame();G.dlg=null;G.flags.templeLamps=7;
   loadMap('temple_shore',...templePos('shore','gate'),'right');G.dlg=null;walk('shore','right',80);r.push(G.map);
   G.dlg=null;walk('court','down',120);r.push(G.map);   // 回淺灘
   G.dlg=null;loadMap('temple_court',...templePos('court','upN'),'up');G.dlg=null;walk('court','up',120);r.push(G.map);   // 去水府
   G.dlg=null;walk('hall','down',140);r.push(G.map);   // 回中庭
   // 燈沒全亮：北門擋住，不會轉場。
   newGame();G.dlg=null;G.flags.templeLamps=3;loadMap('temple_court',...templePos('court','upN'),'up');G.dlg=null;walk('court','up',120);r.push(G.map);
   return r;
  });
  assert.deepEqual(travel,['temple_court','temple_shore','temple_hall','temple_court','temple_court'],`transitions: ${JSON.stringify(travel)}`);

  // 3. 燈籠：先讀碑才能點；A 要白苓燒符；B 要先排水；C 右才對，左錯會引來水妖；點亮後不再有互動。
  const lamps=await pg.evaluate(()=>{
   const out={};
   const flush=()=>{let n=0;while(G.dlg&&n++<40){const cb=G.dlg.cb;G.dlg=null;if(cb)cb()}},finish=()=>{for(let i=0;i<40&&G.B;i++)bKey('ok');flush()};
   newGame();G.dlg=null;loadMap('temple_court',...templePos('court','arrival'),'up');G.dlg=null;
   const lampInter=()=>M.inter.filter(it=>it.lampBit!=null);
   out.start=lampInter().length;
   lampInter()[0].act();out.noStele=(G.flags.templeLamps||0)===0&&G.dlg.l[0][1].includes('石碑');G.dlg=null;
   G.flags.steleSeen=1;
   // 燈 A：兩段（封符→狐火燒開），要把對白走完才亮。
   const A=lampInter().find(it=>it.lampBit===0);A.act();out.aFirst=G.dlg.l.map(l=>l[1]).join('|');out.aBefore=G.flags.templeLamps||0;flush();out.aAfter=G.flags.templeLamps;
   // 燈 B：先排水（水閘）。
   out.sluiceBefore=!!G.flags.templeSluice;
   const lever=M.inter.find(it=>it.act===templeSluice);lever.act();flush();out.sluiceAfter=!!G.flags.templeSluice;
   lampInter().find(it=>it.lampBit===1).act();flush();out.bAfter=G.flags.templeLamps;
   // 燈 C 左（錯）：開戰，不亮。
   const wrong=M.inter.find(it=>it.lampBit==null&&it.r===40);wrong.act();flush();
   out.wrongBattle=!!G.B&&G.B.en.map(e=>e.e).join(',');out.wrongMask=G.flags.templeLamps;
   if(G.B){G.B.en.forEach(e=>e.hp=0);win();finish()}
   out.afterWrongBattle=!G.B;
   // 燈 C 右（對）
   lampInter().find(it=>it.lampBit===2).act();flush();
   out.afterLit=lampInter().length;out.mask=G.flags.templeLamps;
   out.repeatFormat=S.lanternRepeat.every(x=>Array.isArray(x)&&x.every(l=>Array.isArray(l)&&l.length===2));
   out.channelOpen=templeIsOpen('lamps');
   return out;
  });
  assert.equal(lamps.start,3,'three real lamps are interactive at the start (the decoy is tracked separately)');
  assert(lamps.noStele,'lamps need the stele to be read first');
  assert(lamps.aFirst.includes('封住')&&lamps.aBefore===0&&lamps.aAfter===1,`lamp A needs the fox-fire scene: ${JSON.stringify([lamps.aFirst,lamps.aBefore,lamps.aAfter])}`);
  assert(!lamps.sluiceBefore&&lamps.sluiceAfter&&lamps.bAfter===3,`lamp B follows the sluice: ${JSON.stringify([lamps.sluiceBefore,lamps.sluiceAfter,lamps.bAfter])}`);
  assert.equal(lamps.wrongBattle,'shui,shui','the wrong lamp starts a two-water-spirit fight');assert.equal(lamps.wrongMask,3,'the wrong lamp does not light');assert(lamps.afterWrongBattle);
  assert.equal(lamps.afterLit,0,'a lit lamp has no interaction left');assert.equal(lamps.mask,7,'all three lamps lit');assert(lamps.channelOpen);
  assert(lamps.repeatFormat,'S.lanternRepeat items are whole dialogue lists');

  // 3b. 機關：棧橋缺口與淹水區在條件滿足前擋住。
  const gates=await pg.evaluate(()=>{
   const out={};
   const bfs=(key,flags,pts)=>{newGame();G.dlg=null;Object.assign(G.flags,flags);const L=TEMPLE_LAYOUTS[key];loadMap(L.id,...templePos(key,'arrival'),'up');G.dlg=null;
    const m=M,step=8,cols=Math.ceil(m.W/step),rows=Math.ceil(m.H/step),ok=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!blocked((i+.5)*step,(j+.5)*step);
    const sx=Math.floor(G.x/step),sy=Math.floor(G.y/step),q=[[sx,sy]],seen=new Set([sy*cols+sx]);
    for(let p=0;p<q.length;p++){const[i,j]=q[p];for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const A=i+a,B=j+b,id=B*cols+A;if(ok(A,B)&&!seen.has(id)){seen.add(id);q.push([A,B])}}}
    return pts.map(([x,y])=>q.some(([i,j])=>Math.hypot((i+.5)*step-x,(j+.5)*step-y)<16))};
   // 淺灘：走淺灘路免撐篙到得了廟門；棧橋西段不用撐篙；缺口那一格（520,300）在撐篙前擋住。棧橋東端接匯合點，所以從淺灘繞過去也到得了棧橋——撐篙是「不用打那場戰鬥」的另一條路。
   out.shoreClosed=bfs('shore',{},[[1190,480],[520,300],[400,300]]);
   out.shoreOpen=bfs('shore',{templeShorePole:1},[[1190,480],[520,300],[400,300]]);
   out.courtClosed=bfs('court',{steleSeen:1},[[1194,700],[1194,330]]);
   out.courtOpen=bfs('court',{steleSeen:1,templeSluice:1},[[1194,700],[1194,330]]);
   // 撐篙互動：互動後缺口變可走並移除互動。
   newGame();G.dlg=null;loadMap('temple_shore',...templePos('shore','arrival'),'up');G.dlg=null;
   const pole=M.inter.find(it=>it.templePole);out.hasPole=!!pole;pole.act();while(G.dlg){G.dlg=null}out.poleFlag=!!G.flags.templeShorePole;out.poleGone=!M.inter.some(it=>it.templePole);
   return out;
  });
  assert.deepEqual(gates.shoreClosed,[true,false,true],`shore gap closed: ${JSON.stringify(gates.shoreClosed)}`);
  assert.deepEqual(gates.shoreOpen,[true,true,true],'shore: the pier opens after the pole is used');
  assert.deepEqual(gates.courtClosed,[false,true],`court flooded nook closed: ${JSON.stringify(gates.courtClosed)}`);
  assert.deepEqual(gates.courtOpen,[true,true],'court: the nook opens after the sluice');
  assert(gates.hasPole&&gates.poleFlag&&gates.poleGone,'the pole interaction opens the gap once');

  // 3c. 戰鬥：固定戰鬥只觸發一次、走進去才觸發；戰敗重來點；逃跑也算完成。
  const fights=await pg.evaluate(()=>{
   const out={};
   const flush=()=>{let n=0;while(G.dlg&&n++<40){const cb=G.dlg.cb;G.dlg=null;if(cb)cb()}},finish=()=>{for(let i=0;i<40&&G.B;i++)bKey('ok');flush()};
   const walk=(dir,n)=>{const m0=G.map;clearK();keys[dir]=1;for(let i=0;i<n;i++){update(1);if(G.map!==m0||G.dlg||G.B)break}clearK()};
   newGame();G.dlg=null;loadMap('temple_shore',...templePos('shore','lowA'),'right');G.dlg=null;
   walk('right',90);out.trigger=!!G.dlg;out.cp=JSON.parse(G.cp).o;flush();out.enemies=G.B?G.B.en.map(e=>e.e).join(','):null;
   if(G.B){G.B.en.forEach(e=>e.hp=0);win();finish()}
   out.flag=!!G.flags.templeShoreFight;
   loadMap('temple_shore',...templePos('shore','lowA'),'right');G.dlg=null;walk('right',90);out.again=!!G.dlg||!!G.B;
   // 逃跑也算完成（走中庭西戰鬥）
   newGame();G.dlg=null;loadMap('temple_court',...templePos('court','lowC'),'left');G.dlg=null;
   walk('left',160);flush();out.westEnemies=G.B?G.B.en.map(e=>e.e).join(','):null;
   if(G.B){const oldR=Math.random;Math.random=()=>0;G.B.ai=0;G.B.ph='cmd';G.B.sel=4;bKey('ok');bKey('ok');Math.random=oldR;flush()}
   out.westFlag=!!G.flags.templeFightW;out.westCp=JSON.parse(G.cp).o;
   return out;
  });
  assert(fights.trigger,'walking into the shore choke starts the fixed fight');
  assert.deepEqual([fights.cp.map,fights.cp.x,fights.cp.y],['temple_shore',300,780],`shore checkpoint: ${JSON.stringify(fights.cp)}`);
  assert.equal(fights.enemies,'shui,shui,lu','shore fight: two water spirits and a reed spirit');assert(fights.flag,'winning completes the shore fight');assert(!fights.again,'the shore fight never repeats');
  assert.equal(fights.westEnemies,'lu,lu','court west fight: two reed spirits');assert(fights.westFlag,'escaping also completes the fight');
  assert.deepEqual([fights.westCp.map,fights.westCp.x,fights.westCp.y],['temple_court',672,830],'court fights retry from the court entrance');

  // 3d. 神龕：先劇情、再打河伯水影，贏了才削弱封印；水影不會觸發河伯的階段變化。
  const shrine=await pg.evaluate(()=>{
   const out={};
   const flush=()=>{let n=0;while(G.dlg&&n++<40){const cb=G.dlg.cb;G.dlg=null;if(cb)cb()}},finish=()=>{for(let i=0;i<40&&G.B;i++)bKey('ok');flush()};
   newGame();G.dlg=null;Object.assign(G.flags,{steleSeen:1,templeLamps:3});loadMap('temple_hall',...templePos('hall','arrival'),'up');G.dlg=null;
   const shrineAct=M.inter.find(it=>it.act===templeShrine);shrineAct.act();flush();out.noLamps=!G.B&&!G.flags.templeSeal;
   G.flags.templeLamps=7;shrineAct.act();flush();out.shadow=G.B?G.B.en.map(e=>e.e+':'+e.n).join(','):null;out.sealBefore=!!G.flags.templeSeal;out.cp=JSON.parse(G.cp).o;
   out.hasSprites=!!I.hebos&&!!EART.hebos;
   if(G.B){const e=G.B.en[0];e.hp=Math.floor(e.mhp*.3);act([]);out.noHeboPhase=!G.B.heboPhase2;e.hp=0;win();finish()}
   out.after=[!!G.flags.templeHallShadow,!!G.flags.templeSeal,templeIsOpen('seal')];
   shrineAct.act();flush();out.noSecondFight=!G.B;
   return out;
  });
  assert(shrine.noLamps,'the shrine does nothing until all three lamps are lit');
  assert.equal(shrine.shadow,'hebos:河伯水影','the shrine starts the Hebo shadow fight');assert(!shrine.sealBefore);assert(shrine.hasSprites,'shadow sprites exist');
  assert.deepEqual([shrine.cp.map,shrine.cp.x,shrine.cp.y],['temple_hall',672,830]);
  assert(shrine.noHeboPhase,'the shadow does not trigger the real Hebo phase change');
  assert.deepEqual(shrine.after,[true,true,true],'winning weakens the seal and opens the barrier');assert(shrine.noSecondFight);

  // 3e. 疊水、踏板、鎖門的繪製不報錯。
  const draw=await pg.evaluate(()=>{const r=[];for(const k of['shore','court','hall']){newGame();G.dlg=null;loadMap(TEMPLE_LAYOUTS[k].id,...templePos(k,'arrival'),'up');G.dlg=null;try{X.save();drawTempleOverlays(performance.now());X.restore();r.push(true)}catch(e){r.push(String(e))}}return r});
  assert.deepEqual(draw,[true,true,true],`overlay drawing: ${JSON.stringify(draw)}`);

  // 4. 舊存檔：id temple 依旗標搬到新的三張圖，並補旗標。
  const legacy=await pg.evaluate(()=>{
   const r=[];
   for(const flags of[{},{steleSeen:1},{templeLamps:3},{templeSeal:1},{boss:1}]){newGame();G.dlg=null;Object.assign(G.flags,flags);loadMap('temple',500,500,'down');G.dlg=null;r.push([G.map,G.flags.templeLamps||0,!blocked(G.x,G.y)])}
   newGame();G.dlg=null;G.flags.boss=1;loadMap('temple_hall',...templePos('hall','arrival'),'up');G.dlg=null;const hebo=M.npcs.some(n=>n.boss);
   newGame();G.dlg=null;loadMap('temple_hall',...templePos('hall','arrival'),'up');G.dlg=null;const hebo2=M.npcs.some(n=>n.boss);
   return{r,hebo,hebo2};
  });
  assert.deepEqual(legacy.r.map(x=>x[0]),['temple_shore','temple_court','temple_court','temple_hall','temple_hall'],`legacy redirect: ${JSON.stringify(legacy.r)}`);
  assert.equal(legacy.r[3][1],7);assert(legacy.r.every(x=>x[2]),'legacy redirect lands on walkable ground');
  assert(!legacy.hebo&&legacy.hebo2,'Hebo only waits in the hall until he is defeated');

  // 5. 亂走不進擋人處（含 dt=3 的大步）。
  const walks=await pg.evaluate(()=>{
   let s=11;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648,out={};
   for(const key of['shore','court','hall']){
    newGame();G.dlg=null;Object.assign(G.flags,{templeLamps:7,templeSeal:1,steleSeen:1,templeShorePole:1,templeSluice:1,templeShoreFight:1,templeFightW:1,templeFightE:1});
    const L=TEMPLE_LAYOUTS[key];loadMap(L.id,...templePos(key,'arrival'),'up');G.dlg=null;
    const bad=[];let n=0;
    for(let k=0;k<700;k++){const x=20+rnd()*(M.W-40),y=20+rnd()*(M.H-40);if(blocked(x,y))continue;n++;
     const a=rnd()*6.283,dt=k%5==0?3:1;clearK();G.x=x;G.y=y;
     for(let i=0;i<220;i++){const c=Math.cos(a),d=Math.sin(a);keys.right=c>.38;keys.left=c<-.38;keys.down=d>.38;keys.up=d<-.38;update(dt);
      if(G.map!==L.id||G.dlg){break}
      if(blocked(G.x,G.y)){bad.push([x|0,y|0,k]);break}}
     clearK();if(G.map!==L.id){loadMap(L.id,...templePos(key,'arrival'),'up')}G.dlg=null}
    out[key]={n,bad};
   }
   return out;
  });
  for(const k of['shore','court','hall']){assert(walks[k].n>60,`${k}: enough walkable samples (${walks[k].n})`);assert.equal(walks[k].bad.length,0,`${k}: random walks entered a solid: ${JSON.stringify(walks[k].bad)}`)}

  // 6. 試玩入口：templeJump／網址 hash 直接站到三張圖的入口，狀態合理。
  const jump=await pg.evaluate(()=>{
   const out=[];
   for(const k of['shore','court','hall']){templeJump(k);out.push([G.map,G.party.length,!blocked(G.x,G.y),G.flags.reedSolved,G.flags.templeLamps||0,G.party[0].lv])}
   history.replaceState(null,'','#temple-court');G.dlg=null;newGame();templeHashJump();const viaHash=G.map;
   history.replaceState(null,'','#nonsense');newGame();G.dlg=null;const before=G.map;templeHashJump();const ignored=G.map===before;
   history.replaceState(null,'','#');
   return{out,viaHash,ignored}
  });
  assert.deepEqual(jump.out.map(x=>x[0]),['temple_shore','temple_court','temple_hall']);
  assert(jump.out.every(x=>x[1]===2&&x[2]&&x[3]&&x[5]===3),`jump state: ${JSON.stringify(jump.out)}`);
  assert.equal(jump.out[2][4],7,'the hall jump arrives with all lamps lit');assert.equal(jump.viaHash,'temple_court');assert(jump.ignored,'unrelated hashes do nothing');
  assert.deepEqual(await jsErrors(),[]);
  console.log('[temple-v52] three maps, routes reachable, conditional gates, transitions, lamps once, legacy saves, random walks PASS');
 }finally{await ctx.close()}

 // 6. ?debug=col：三張圖都畫得出紅色擋人區。
 const dbg=await newPage(browser,844,390,{touch:false,seed:true});
 try{
  await dbg.pg.goto(url+'?debug=col');await dbg.pg.waitForFunction('ready');
  const ok=await dbg.pg.evaluate(()=>['temple_shore','temple_court','temple_hall'].map(id=>{newGame();G.dlg=null;loadMap(id,...templePos(TEMPLE_IDS[id],'arrival'),'up');G.dlg=null;return!!(M.walkRed&&M.walkRed.width===M.W)}));
  assert(ok.every(Boolean),'debug=col builds the blocked-area overlay on all three maps');
  await dbg.pg.waitForTimeout(600);assert.deepEqual(await dbg.jsErrors(),[]);
  console.log('[temple-v52] ?debug=col overlay on all three maps PASS');
 }finally{await dbg.ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await templeV52(b,s.url)}finally{await b.close();s.close()}}
