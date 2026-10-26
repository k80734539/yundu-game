# 蘆葦蕩小迷宮 v43

以手繪水彩夜景構成可探索的小迷宮。世界範圍 1344×896（3:2），角色身高約 68 世界像素、腳底碰撞寬 16／深 6；遊戲相機沿用現有手機比例，驗收 390×664 直式與 844×390 橫式。

## 路線與任務

入口 → 古碑 → 北側環形岔路 → 妖符空地 → 妖根橋 → 南側營火 → 東南牌坊 → 河神廟。

三條寶箱支線分別位於東北、左側和西南，保留原本 `reeds:18,1`、`reeds:1,7`、`reeds:5,11` 存檔識別。北側有一個環路；清除妖根後，東側通路與中央木橋同時開通，中央橋形成營火返回前段的捷徑。營火前後的主線順序不變。探索約 5～8 分鐘是初步設計目標，尚未量測玩家初見的完成時間。

## 美術與資料

- `layout.json` 是路線、橋、地標、碰撞與互動點的主資料。`tools/build-reeds-map.py` 產生 `src/reeds_layout.js`，以及開橋／封橋兩份 map bundle。
- 原始生成草圖保存在 `docs/art/reeds-v43/generation-guide.png`。底圖生成後依實際道路中心校正位置與安全寬度，再對照圖像驗收；可行走走廊寬 48px，內含角色腳底的淨寬。
- `src/reeds_map.js` 依道路矩形與空地橢圓的聯集判定腳底是否站在陸地。水道、蘆葦島和河岸預設不可通行；五座橋只有橋面可走。妖根碰撞依 `flags.reedSolved` 即時解除。
- 樹叢、欄杆等固定邊界畫在不可走區；寶箱、妖符、妖根和營火動畫由遊戲分層繪製。兩張新素材 `art_source=host_image`，使用 Codex 內建 image_gen；原圖與提示詞見 `docs/art/reeds-v43/`。
- 新夜景已有月光調色，遊戲僅疊 18% 夜色以保留道路與角色可讀性。
- 劇情全隊回復更名為 `healParty()`，避免被戰鬥的 `heal(t,h)` 覆蓋。營火記錄的座標避開火堆，並在存檔前設定休息旗標。

## 驗收

`tests/reeds-maze.mjs` 不以瞬移代替主要路線：搜尋路線後呼叫實際 `update()` 逐步移動，實走三條寶箱支線、妖符、清除妖根、營火與出口；每一步檢查腳底未進入障礙。另以最大單幀步長測兩座妖根橋和十處岸邊，並測試斜向搖桿、營火全回復及安全重來點。

`map_bundle.py validate` 兩種狀態均 pass、0 errors／0 warnings。`nav-open/nav-report.json` 為 pass、6/6 目的地可達、0 thin gaps。`preview/` 與 `preview-locked/` 為自包含可行走 HTML；使用已安裝 Chrome 執行 `window.__scene.traverseAll()`，兩者 `ok:true`，每份 6 個目標均完成；結果見各自 `chrome-verification.json`、`scene-snapshot.json`。預覽使用 8px 圓形腳底，實際遊戲的 16×6px 腳底另以遊戲控制器驗收。

封橋狀態有一項符合關卡設計的警告，原樣記錄：`id=unreachable_walkable_area; status=warn; value={"pockets":1,"cells":4053}; threshold="reported"; file=nav-locked/nav-report.json`。這一塊就是被兩座妖根橋隔離的南區，尚未列為封橋前的任務目標；開橋後警告消失，所有地圖目的地均可達。地圖工具未連入河神廟 bundle，跨圖到達以實際遊戲通關測試確認。

美術和碰撞已目視比對，仍需玩家實際操作回饋；自動可達性證明不代表逐像素辨識整張圖的可走地形。
- 舊存檔相容：未清除妖根卻位於南區的舊座標會回到入口，保留任務及寶箱旗標；已開橋的存檔沿用鄰近空地校正。
