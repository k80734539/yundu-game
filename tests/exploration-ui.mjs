import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';
export async function explorationUI(browser,url){
 for(const[W,H,touch]of[[390,664,true],[375,553,true],[844,390,true],[1366,900,false]]){const{ctx,pg,jsErrors}=await newPage(browser,W,H,{touch,seed:true});const dir=outDir('exploration-ui',`${W}x${H}`);
 try{await pg.goto(url);await pg.waitForFunction('ready');await pg.evaluate(()=>{newGame();G_().dlg=null;TP(640,448,'down');G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));G_().party[0].hp=48;G_().inv.清心草=3});await pg.waitForTimeout(180);
  assert(await pg.locator('#exploreHud').isVisible());assert.equal(await pg.locator('#soundBtn').isVisible(),false);assert.equal(await pg.locator('#placeName').innerText(),'蘆花渡');assert((await pg.locator('#questSummary').innerText()).includes('村長'));
  const menu=await pg.locator('#svBtn').boundingBox(),quest=await pg.locator('#questBtn').boundingBox();assert(menu.height>=44&&quest.height>=44&&quest.x+quest.width<menu.x);await pg.screenshot({path:`${dir}/explore.png`});
  await pg.locator('#svBtn').click();assert.equal(await pg.evaluate('SV.p'),'menu');assert.equal(await pg.locator('.journey-hero').count(),2);assert((await pg.locator('#svBox').innerText()).includes('48 / 60'));await pg.waitForTimeout(100);await pg.screenshot({path:`${dir}/menu.png`});
  const paused=await pg.evaluate(()=>{const p=[G_().x,G_().y];keys.right=1;JOY.on=true;JOY.x=1;for(let i=0;i<30;i++)update(3);clearK();/* Desktop has no native joystick reset: restore this injected test input explicitly. */JOY.on=false;JOY.x=JOY.y=0;return p[0]===G_().x&&p[1]===G_().y});assert(paused,'menu pauses keyboard and touch movement');
  // Keyboard navigation must enter the selected page once, and Escape returns to the parent.
  await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');assert.equal(await pg.evaluate('SV.p'),'bag');assert((await pg.locator('.journey-inventory').innerText()).includes('× 3'));await pg.screenshot({path:`${dir}/bag.png`});await pg.keyboard.press('Escape');
  await pg.locator('#svBox .svI').nth(4).click();assert.equal(await pg.evaluate('SV.p'),'settings');const before=await pg.evaluate('MUSIC.muted');await pg.locator('#svBox .svI').nth(0).click();assert.equal(await pg.evaluate('MUSIC.muted'),!before);assert.equal(await pg.evaluate("localStorage.getItem('yundu_music')"),before?'on':'off');await pg.keyboard.press('Escape');await pg.keyboard.press('Escape');
  await pg.locator('#questBtn').click();assert.equal(await pg.evaluate('SV.p'),'quest');assert((await pg.locator('.journey-current').innerText()).includes('村長廳'));await pg.screenshot({path:`${dir}/quest.png`});await pg.keyboard.press('Escape');await pg.keyboard.press('Escape');
  // Long menus remain inside the viewport; every action can be reached by keyboard or scroll.
  await pg.keyboard.press('m');for(let i=0;i<8;i++)await pg.keyboard.press('Tab');assert(await pg.locator('#svPanel').evaluate(el=>el.contains(document.activeElement)));const box=await pg.locator('#svBox').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=W+1&&box.y+box.height<=H+1);await pg.keyboard.press('Escape');
  await pg.evaluate(()=>{G_().flags.chief=1;G_().flags.quest=1});await pg.waitForTimeout(60);assert((await pg.locator('#questSummary').innerText()).includes('渡口'));await pg.evaluate(()=>{const n=M_().npcs.find(n=>n.k==='chief');TP(n.x,n.y-28,'down')});assert.equal(await pg.evaluate('journeyAction()'),'交談');
  await pg.evaluate(()=>say([['系統','測試']]));await pg.waitForTimeout(60);assert.equal(await pg.locator('#exploreHud').isVisible(),false);assert.equal(await pg.locator('#svBtn').isVisible(),false);await pg.evaluate(()=>{G_().dlg=null;__sb(['小水妖'])});await pg.waitForTimeout(100);assert.equal(await pg.locator('#exploreHud').isVisible(),false);assert(await pg.locator('#soundBtn').isVisible());if(touch)assert(await pg.evaluate('JOY.hidden'));
  assert.deepEqual(await jsErrors(),[]);console.log(`[exploration-ui ${W}x${H}] HUD, real party/inventory/quest, settings persistence, menu pause, keyboard focus and screenshots PASS`);
 }finally{await ctx.close()}}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await explorationUI(b,s.url)}finally{await b.close();s.close()}}
