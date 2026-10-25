// npm test：完整通關(直/橫) + 5 尺寸觸控戰鬥 + 5 尺寸截圖 + VFX 定格 + 存檔(直/橫) + 第一章演出。任何 JS 錯誤或流程失敗 → exit 1
import {serve,launch} from './lib.mjs';import {playthrough} from './playthrough.mjs';import {touchBattle} from './touch-battle.mjs';import {screens} from './screens.mjs';import {fx} from './fx.mjs';import {saveTest} from './save.mjs';import {polish} from './polish.mjs';
import {diagBattle} from './diag-battle.mjs';
import {qzSprite} from './qz-sprite.mjs';
import {spriteSize} from './sprite-size.mjs';
import {enemyLayout} from './enemy-layout.mjs';
import {battleBackgrounds} from './battle-backgrounds.mjs';
import {heroAssets} from './hero-assets.mjs';
import {portraitUI} from './portrait-ui.mjs';
const s=await serve(),b=await launch();let ok=true;
ok=await portraitUI(b,s.url)&&ok;
ok=await heroAssets(b,s.url)&&ok;
ok=await battleBackgrounds(b,s.url)&&ok;
ok=await enemyLayout(b,s.url)&&ok;
ok=await diagBattle(b,s.url)&&ok;
ok=await playthrough(b,process.env.URL||s.url,390,664,true)&&ok;ok=await playthrough(b,process.env.URL||s.url,844,390,true)&&ok;
ok=await touchBattle(b,s.url)&&ok;ok=await screens(b,s.url)&&ok;ok=await fx(b,s.url)&&ok;for(const[w,h]of[[390,664],[844,390]])ok=await saveTest(b,s.url,w,h)&&ok;
ok=await polish(b,s.url)&&ok;

ok=await qzSprite(b,s.url)&&ok;
ok=await spriteSize(b,s.url)&&ok;
await b.close();s.close();console.log(ok?'ALL PASS':'SOME TESTS FAILED');process.exit(ok?0:1)
