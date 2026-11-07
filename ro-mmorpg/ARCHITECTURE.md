# ARCHITECTURE — 晨曦物語（RO 風格單機網頁 MMORPG）

純 HTML5 Canvas + TypeScript + Vite，不使用遊戲引擎。遊戲畫面全部畫在一張 canvas 上；
視窗型 UI（背包、裝備、對話框…）用 DOM 疊在 canvas 上（文字清晰、拖曳容易，見 DECISIONS.md）。

## 指令
```
npm install
npm run dev        # 開發伺服器 http://localhost:5173
npm run build      # tsc 型別檢查 + vite build → dist/
npm run shot -- 1  # build 後用 Playwright 開遊戲截圖 → screenshots/階段1.png，並檢查 console 錯誤
```

## 資料夾
```
ro-mmorpg/
├─ index.html              入口（canvas + #ui 疊層）
├─ data/                   ★ 資料驅動：所有內容都在這裡
│  ├─ maps.json            地圖：大小、地形、彎曲道路（樣條曲線）、物件、傳送點、NPC、出怪表、MVP
│  ├─ monsters.json        怪物：能力值、AI（被動/主動）、外觀參數、掉落表
│  ├─ items.json           道具／裝備／卡片：價格、重量、效果、插槽、圖示參數
│  ├─ skills.json          技能：職業、等級上限、SP、詠唱、冷卻、威力、特效
│  ├─ jobs.json            職業：HP/SP 係數、攻速、可用武器、技能清單、外觀；經驗表參數
│  ├─ quests.json          任務：擊殺／收集、獎勵、前置
│  ├─ npcs.json            NPC：外觀、對話腳本（節點＋選項＋動作）
│  └─ shops.json           商店清單
├─ src/
│  ├─ main.ts              啟動：建立 Game
│  ├─ core/                引擎核心（與遊戲內容無關）
│  │  ├─ Game.ts           中樞：持有所有系統、地圖、實體；固定 60Hz 邏輯更新＋插值繪製
│  │  ├─ Loop.ts           requestAnimationFrame + deltaTime 累加器（固定步長 1/60 秒）
│  │  ├─ Input.ts          滑鼠／觸控／鍵盤（Alt+組合鍵、F1~F9、Insert）
│  │  ├─ Camera.ts         lerp 平滑跟隨、震動、世界↔螢幕座標
│  │  ├─ Pool.ts           物件池（傷害數字、粒子、投射物）
│  │  ├─ Events.ts         事件匯流排（UI 與系統解耦）
│  │  └─ math.ts           亂數（mulberry32）、雜湊雜訊、插值工具
│  ├─ render/
│  │  ├─ Renderer.ts       canvas 尺寸、devicePixelRatio、整數倍縮放、關閉平滑
│  │  ├─ iso.ts            等角投影（格 64×32）、螢幕→世界反投影
│  │  ├─ Ground.ts         地板：分塊（chunk）逐像素生成、快取；地形交界過渡（座標擾動＋邊緣描線）
│  │  ├─ textures.ts       各地形的像素紋理函式（每種 4 種變化）
│  │  ├─ pixel.ts          像素工具：alpha 二值化、1px 深色外框、色彩明暗
│  │  ├─ SpriteFactory.ts  程式生成角色／怪物 sprite sheet（192×192，4 列×10 格，腳底錨點 96,186）
│  │  ├─ PropArt.ts        樹、石、房屋、牆、傳送陣等物件圖（光源左上、接地陰影）
│  │  ├─ IconArt.ts        道具／技能圖示（24×24 像素）
│  │  ├─ Font.ts           像素數字字型（傷害數字）
│  │  ├─ Effects.ts        傷害數字、粒子、技能特效（物件池）
│  │  └─ Minimap.ts        小地圖、世界地圖繪製
│  ├─ entities/
│  │  ├─ Entity.ts         基底：位置（格座標浮點）、上一幀位置（插值）、深度＝x+y（腳底）
│  │  ├─ Actor.ts          可移動、有 HP、動畫、受擊閃白、死亡淡出、沿路徑移動
│  │  ├─ Player.ts         玩家：點擊移動、自動追擊、攻擊、施法
│  │  ├─ Monster.ts        怪物：AI 狀態機（閒晃／追擊／攻擊／返回）
│  │  ├─ Npc.ts            NPC
│  │  ├─ Prop.ts           靜態物件（樹、建築切片繪製、半透明）
│  │  ├─ Portal.ts         傳送點
│  │  ├─ GroundItem.ts     地上道具
│  │  └─ Projectile.ts     箭、法術彈
│  ├─ systems/
│  │  ├─ MapLoader.ts      由 maps.json 生成地形格、道路、物件、可走格
│  │  ├─ Pathfinding.ts    A*（8 方向、禁止切角、二元堆積）＋視線拉直
│  │  ├─ Stats.ts          RO 式衍生能力（ATK/MATK/HIT/FLEE/CRIT/ASPD/HP/SP）
│  │  ├─ Combat.ts         傷害計算、命中、爆擊、打擊停頓、震動、飄字
│  │  ├─ Exp.ts            經驗表、升級、能力點數、技能點數
│  │  ├─ Inventory.ts      背包、裝備、卡片插槽、精煉、重量
│  │  ├─ Skills.ts         技能施放：詠唱條、冷卻、SP、效果
│  │  ├─ Quests.ts         任務接取／進度／回報
│  │  ├─ Spawner.ts        出怪、重生、MVP 計時、全服公告
│  │  ├─ AI.ts             怪物 AI（被動／主動、追擊上限 3 隻）
│  │  ├─ Save.ts           localStorage 存檔：版本號、遷移、校驗碼、備份還原
│  │  └─ Audio.ts          Web Audio：程式合成 BGM（依地圖淡入淡出）與音效、音量
│  ├─ ui/
│  │  ├─ UI.ts             UI 管理器：視窗開關、快捷鍵對應
│  │  ├─ Window.ts         RO 風格視窗（拖曳、關閉、前置、位置記憶）
│  │  ├─ Hud.ts            基本資訊（HP/SP/等級/經驗條）、快捷列 F1~F9、選單列
│  │  ├─ Chat.ts           聊天框、系統訊息、公告橫幅
│  │  ├─ Windows*.ts       背包、裝備、能力值、技能、商店、任務、世界地圖、設定
│  │  └─ Dialog.ts         NPC 對話框（打字機效果、選項）
│  └─ data/
│     └─ index.ts          匯入 data/*.json 並提供型別（DB）
├─ tools/shot.mjs          Playwright 截圖＋console 錯誤檢查
└─ screenshots/            各階段截圖
```

## 主要類別與資料流
```
main.ts → new Game(canvas, uiRoot)
Game
 ├─ renderer: Renderer      ├─ camera: Camera        ├─ input: Input
 ├─ map: GameMap            （地形格、可走格、物件、傳送點、Ground 快取）
 ├─ entities: Entity[]      （player、monsters、npcs、items、projectiles）
 ├─ player: Player
 ├─ combat / skills / inventory / quests / spawner / audio / save
 └─ ui: UI                  （DOM，訂閱 events）

每一幀：Loop.tick(dt) → 累加器 → 0~N 次 Game.update(1/60)（打擊停頓時跳過）
       → Game.render(alpha)：插值位置 → 相機 lerp → 地板 chunk → 陰影 → 依腳底深度排序物件 → 特效 → 小地圖
```

### 座標系
- 世界座標以「格」為單位的浮點數 `(x, y)`；格中心是 `(i+0.5, j+0.5)`。
- 等角投影：`sx = (x - y) * 32`、`sy = (x + y) * 16`（格 64×32，45 度視角的 2:1 菱形）。
- 深度 = `x + y`（腳底）。建築依螢幕 x 切成 16px 寬的直條，每條用「前緣最高點」的深度參與排序，
  所以角色在建築左右前後都能正確遮擋；角色在建築後方且重疊時，建築淡出成半透明。
- 繪製一律取整數像素；canvas 實際像素 = CSS 尺寸 × devicePixelRatio，整體只做整數倍縮放。

### Sprite 規格（可直接替換成美術圖）
- 每格 192×192，腳底錨點 (96,186)，站立身高 128px。
- 4 列：面向下、左、右、上；10 格：0~1 待機、2~5 走路、6~9 攻擊。
- 目前由 `SpriteFactory` 程式生成同格式的 sheet；之後放入 PNG 只要在 jobs.json / monsters.json 指定 `sheet` 路徑。

### 存檔
`localStorage['rom.save']` = `{ v: 版本, t: 時間, sum: 校驗碼, data }`；寫入前把上一份好的存檔複製到
`rom.save.bak`。讀取時校驗失敗就用備份；版本較舊時依序跑 `migrations[v]` 升到最新。
