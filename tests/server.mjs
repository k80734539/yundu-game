// npm run serve → 本機預覽 http://127.0.0.1:8080/
import {serve} from './lib.mjs';const s=await serve(+(process.env.PORT||8080));console.log('serving',s.url);
