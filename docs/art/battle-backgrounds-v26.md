# v26 斜視戰鬥背景

原問題：三張 640×480 背景是正面遠景，與斜視角色／橫向對陣站位不一致；河心戰直接把人物放在水面。舊圖放大後也有粗顆粒感。

本次使用內建 image_gen（art_source: host_image，非 CLI）原創生成三張場地。輸出皆為 1672×941、RGB、不透明，保持水彩乾筆、淡墨輪廓、左上月光與夜藍／灰青色盤；環境物件放在外圍，中央留平坦站立面。後兩張以第一張新蘆葦蕩為畫風參考，舊背景僅供色盤與場景身份參考。

| 場景 | 遊戲素材 | 地面 |
| --- | --- | --- |
| 蘆葦蕩 | assets/img/bg_reeds_v26.webp | 開闊泥地，蘆葦在外緣 |
| 河心夜渡 | assets/img/bg_river_v26.webp | 渡船甲板，河水只在上緣 |
| 河神廟 | assets/img/bg_temple_v26.webp | 石板前庭，燈籠／祭壇在上緣 |

battle-backgrounds-v26/ 保留三張 *-original.png、完整 *-prompt.txt、provenance.json（來源路徑、參考列表、SHA256、實際尺寸與檔案大小）。模型與估算費用未由內建工具揭露，沒有填造數值。WebP quality=92，三張合計約 1.52 MB；舊 JPG 留存不覆蓋。

場景為 baked_scene_mode 背景畫片，不是新的可行走地圖，沒有新增地圖碰撞或導航。*-stage.json 記錄目視標註的地面、禁站區、腳底參考位置與 cover 投影；guide-landscape/ 為採用的構圖指引，幾何檢查 pass。三組 qa-*/stage-qa.json 的自動狀態均為 needs-visual-review，沒有 warn/fail 檢查；工具不會自動認可美術。已檢視每組八張構圖代理圖（review-contact.png）及實際角色合成。遊戲採 bLayout 響應式站位，不使用代理圖的通用 UI／角色框。

drawBattleBackground 採均勻 cover、中心 (0.5,0.5)，將縮放與裁切記錄為 B.bgFit。移除舊 22% 黑藍濾層，保留已調色場地的亮度。角色、數值、站位與命中時序不變，版本與圖片快取升為 26。

tests/battle-backgrounds.mjs 以實際遊戲腳底反投影至圖片 UV，檢查人工標註的站立面與禁站區；不是自動辨識圖片地形。範圍：三個場景 × 390×664、375×553、430×750、664×390、844×390、1024×768。修正前截圖在 tests/baseline-v25/battle-backgrounds/，修正後在 tests/out/battle-backgrounds/。

CREDITS.txt、遊戲素材來源畫面、docs/art/audit.md、AGENTS.md 已同步更新。

2026-10-25 驗收：完整 npm test → ALL PASS；三背景 × 六尺寸落點檢查、六尺寸站位、三尺寸戰鬥動作、直橫通關、觸控、畫面、特效、存檔、演出、走路、遮擋、舊快取回退均通過。18 組前後截圖差異 29.90%–54.05%，主要為重繪背景與裁切；角色及 UI 位置未變。game-preview.jpg 為三場實際戰鬥預覽。
