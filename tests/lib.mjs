// 共用：靜態伺服器 + 瀏覽器啟動 + JS 錯誤收集
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const OUT=process.env.OUT_DIR?path.resolve(process.env.OUT_DIR):path.join(ROOT,'tests','out');
export const SIZES=[[390,664],[375,553],[430,750],[664,390],[844,390]];
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.json':'application/json'};
// 使用同源 HTTP 載入資源與截圖；村莊／河神廟碰撞會以 getImageData 取樣可走遮罩。
export function serve(port=0){return new Promise(res=>{const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
 s.listen(port,'127.0.0.1',()=>res({url:`http://127.0.0.1:${s.address().port}/`,close:()=>s.close()}))})}
// 預設用 Playwright 內建 Chromium（npx playwright install chromium）；或設 CHROME_PATH=/usr/bin/google-chrome
export async function launch(){return chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']})}
export const SEED="{let s=12345;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}";
export async function newPage(b,W,H,{touch=true,dpr=2,seed=false}={}){const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:dpr,hasTouch:touch,isMobile:touch});const pg=await ctx.newPage();const errs=[];
 pg.on('pageerror',e=>errs.push(String(e)));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 if(seed)await pg.addInitScript(SEED);
 const E=e=>pg.evaluate('(()=>{const G=G_();return '+e+'})()');const P=k=>pg.evaluate(`press('${k}')`);
 const jsErrors=async()=>errs.concat(await pg.evaluate('window.__err||[]'));
 return {ctx,pg,E,P,errs,jsErrors}}
export const wait=(pg,ms)=>pg.waitForTimeout(ms);
export function outDir(...p){const d=path.join(OUT,...p);fs.mkdirSync(d,{recursive:true});return d}
