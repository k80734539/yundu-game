# v24 敵人六姿勢更新

美術來源：使用者提供的三張 1536×1024 桃紅底姿勢圖（art_source: existing；route: supplied sheets → generate2dsprite soft chroma key → lossless WebP）。未生成新美術。

- 河伯：hebo-original.png，採用 hebo-v2/ 處理結果。舊 hebo/ 為切割修正前的留存，不供遊戲使用。
- 蘆葦精：lu-original.png → lu/。
- 小水妖：shui-original.png → shui/。

依左上到右下對應 idle0、idle1、cast、attack、hit、down。每種輸出六張 assets/img/<敵人>_<姿勢>.webp，512×512 RGBA、固定腳底 (256,474)，同一敵人六姿勢使用同一縮放倍率；runtime.json 記錄倍率。idle0 另匯出既有 key 的基礎圖，身高仍為小水妖 120、蘆葦精 170、河伯 300 素材像素，維持既有碰撞／特效中心及場景引用。

河伯上排切至原圖 y=500，避免下一排尾巴混入；下排河伯與蘆葦精按姿勢邊界切割，保留跨過等寬格的龍鬚與葉片。HD finish；不做像素化、不改配色。尺寸差異依原始姿勢保留，不將倒下圖拉高。

戰鬥待機每 600ms 換幀；敵人特效開始時播放 cast→attack，河伯濁浪使用 cast。受擊姿勢只在命中時刻後播放 450ms；死亡在 dieAt 命中時刻後切 down，沿用 650ms 消散。缺少單張動作圖時回退基礎圖。傷害、回合、命中時間不變。

去背採 soft matte + 1px edge despill。三組最終 qa_status 均為 pass，opaque_key_px=0、outer_ring_spill_fraction=0、enclosed_key_pockets=0。半透明像素比例：小水妖 0.0605765，蘆葦精 0.1357317，河伯 0.0762319。完整檢查見 accepted-qa.json；所有最終 QA checks 無 warn/fail。preview.png 是深色底姿勢總覽。

處理工具：tools/prepare-enemy-sheets.py、generate2dsprite.py process（2×3，preserve，bbox feet anchor，512px，strict-qc）、tools/export-enemies.py。UI 與素材快取版本一併升為 24；素材來源已補入 CREDITS.txt。

新圖輪廓較寬，因此三敵人組合的直式第三位向左挪 10 設計像素、橫式水平間距由 80 增為 90，避免小水妖與蘆葦精互相重疊。

動作整合另外修正衝刺停止距離：沿前進路徑逐點檢查敵人範圍與角色身體範圍，遇到第一個阻擋即停止，避免較寬的新圖或路徑中其他敵人被穿越。只調整畫面位移，不改傷害與命中時間。

驗收：2026-10-24 完整 npm test → ALL PASS（直橫通關、五尺寸觸控與畫面、特效、存檔、演出、三尺寸戰鬥動作、走路與遮擋、舊快取回退）。tests/review-enemies.mjs 另產生三種敵人各自的 390×664／844×390 截圖，均無 JS errors。已目視檢查姿勢總覽、直式河伯與橫式蘆葦精。
