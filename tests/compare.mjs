// 視覺回歸比對：node tests/compare.mjs <baselineDir> [currentDir=tests/out]
// 只比對 fx/ 與 screens/（定格、固定亂數）；play/ 與 touch/ 是即時跑的，不做逐像素比對。
import fs from 'node:fs';import path from 'node:path';import {PNG} from 'pngjs';import pixelmatch from 'pixelmatch';import {OUT} from './lib.mjs';
const [base,cur=OUT]=process.argv.slice(2);if(!base){console.log('usage: node tests/compare.mjs <baselineDir> [currentDir]');process.exit(2)}
let n=0,bad=0;const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const sub of['fx','screens']){const bd=path.join(base,sub);if(!fs.existsSync(bd))continue;
 for(const f of walk(bd).filter(f=>f.endsWith('.png'))){const rel=path.relative(base,f),c=path.join(cur,rel);n++;
  if(!fs.existsSync(c)){console.log('MISSING',rel);bad++;continue}
  const a=PNG.sync.read(fs.readFileSync(f)),b=PNG.sync.read(fs.readFileSync(c));
  if(a.width!==b.width||a.height!==b.height){console.log('SIZE',rel);bad++;continue}
  const d=pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:.1});if(d){console.log('DIFF',rel,d,'px');bad++}}}
console.log(`compared ${n} images, ${bad} differ`);process.exit(bad?1:0)
