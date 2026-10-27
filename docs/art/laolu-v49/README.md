# 老蘆葦精戰鬥素材（v49）

## 素材

- `assets/img/laolu_idle0.webp`：站立姿勢，512×512 RGBA。
- `assets/img/laolu_idle1.webp`：待機變化姿勢，512×512 RGBA。
- `assets/img/laolu_cast.webp`：聚氣施法，512×512 RGBA。
- `assets/img/laolu_attack.webp`：攻擊姿勢，512×512 RGBA。
- `assets/img/laolu_hit.webp`：受擊姿勢，512×512 RGBA。
- `assets/img/laolu_down.webp`：倒地姿勢，512×512 RGBA。
- `assets/img/laolu.webp`：待機小圖，512×512 RGBA，供既有敵人小圖用途。
- `source.png`：image_gen 產生並去背的 1536×1024 六格來源圖。
- `battle-390x664.png`、`battle-844x390.png`：Playwright 實際遊戲戰鬥截圖。

六格切圖順序依序為 idle0、idle1、cast、attack、hit、down。工具先依 alpha 裁出每格角色，再等比縮小至最多 450×450，置中並把 alpha 腳底對齊在 y=474，保留透明畫布；使用無損 WebP 匯出。切圖腳本：`tools/slice-laolu-v49.py`。

## 風格與提示詞

來源：OpenAI 內建 `image_gen` 原創生成。第一章夜景色盤以墨綠灰蘆葦、藍黑暗部、灰青水氣為主，左上主光，右下柔影；水彩手繪與淡墨線參考 `assets/img/lu_idle0.webp` 及 `docs/art/style-guide.md`。輸出 RGBA alpha；檢查了切圖接縫、邊緣 alpha、姿勢辨識與腳底錨點。六個姿勢保持同一老蘆葦妖的枝葉主體、蒼白臉與身形；attack/hit/down 的重心有姿勢變化，手臂及枝葉輪廓隨動作改變。

首輪提示詞：

> Use case: illustration-story. Asset type: enemy sprite animation sheet for a 2D Chinese fantasy RPG. Create a single perfectly transparent RGBA image, 3 columns by 2 rows, six equal square 512x512 panels with no gutters and no panel lines. Every panel shows the exact same elderly reed spirit, centered consistently with feet/root base anchored at y=455, same scale and facing 3/4 toward viewer: an old, large, threatening waterlogged reed-and-marsh-grass yokai, more weathered and imposing than a small reed spirit, with tangled dry reeds, dark pond weeds, a few mossy strands and cloudy dim eyes. Six poses in order: idle, subtle alternate idle, gather mist spell, lunge attack, recoiling hit, collapsed defeated. Maintain identical face, reed clumps, silhouette details, proportions and palette across all six. Style: hand-painted watercolor with fine soft ink outlines, detailed paper pigments, matching the game's existing lu_* enemies, chapter-one moonlit night palette of ink-green-gray reeds, blue-black shadows, muted gray-cyan moisture, tiny restrained warm highlights; consistent upper-left key light and soft shadows down-right. Full body, no crop, no text or symbols, no props, no ground shadow outside the creature, no scenery. Do not include bright magenta or any background; true alpha transparency.

去背處理提示詞（保留主體、移除生成時誤出的底色）：

> Use case: background-extraction. Precisely remove the solid dark brown-gray studio background from this existing 3-column by 2-row game enemy sprite sheet and replace it with true transparent alpha. Preserve every monster pixel, pose, color, outline, silhouette, texture, size, alignment and panel position exactly. Do not redraw or alter the six monster poses. Keep all six equally sized 512x512 cells in the 1536x1024 sheet. Carefully retain fine reed strands and soft edge details without dark background halos; inspect edges. Output RGBA.

使用退回方案：否。六姿勢輪廓有動作差異但辨識為同一隻妖；逐格 alpha bbox 正規化後皆落在共用腳底 y=474，保留新圖而非放大改色 `lu_*`。EART 倍率 0.42，頭目世界倍率 0.68，錨點 (256,474)。

實際手機直式與橫式戰鬥畫面見上述兩張截圖。
