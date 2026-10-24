# v21 陳青舟戰鬥彩繪姿勢

## 素材
`assets/img/qzb_{idle0,idle1,charge,dash0,dash1,thrust,recover,sweepwind,sweep,hit,down,win}.webp`
- 480×360 RGBA（webp q85 含透明），角色朝右，腳底基準線 y=292，身體中心 x=240，竹篙已畫在圖內。
- 舊的 `qz_pole`、`qz_atk_windup/strike/recover` 已刪除；`clipQzStage`（evenodd 挖洞）已移除。

## 戰鬥顯示
- 待機：idle0/idle1 每 600ms 輪替；受擊 → hit；HP 0 → down；勝利 → win。
- 比例：可見身高約為白苓/雲纖 192px 背面圖的 1.1×（測試限制 1.0–1.25）。
- 普攻 650ms：charge(0–100) → dash0/dash1(–230) → thrust(–390，340ms 命中) → recover(–470) → 返回 dash(–650) → idle。
- 橫掃 660ms：sweepwind(0–260) → sweep（460ms 命中）。

## 失誤 A（打到旁邊敵人）
`qzLanding()` 依目標前緣計算落點：篙尖（`QZB.tip`）抵達目標 box 前緣，身體站在敵列前方的空位，
任何敵人 box 與身體 box 都不重疊；並限制在畫面內、底部面板之上。戰場橫向太窄時，敵列上移（n>1 且非 Boss）。
篙尖朝目標略為傾斜（上限 .25 rad，繞篙尾），不足時以此補足距離。

## 失誤 B（角色被切）
移除 evenodd clip；敵人名稱／血條改在角色之後繪製（`labs`），角色永遠完整。

## 已知限制
- 側面彩繪與白苓/雲纖背面像素圖風格、視角不一致（刻意保留，先驗證）。
- 篙尾在部分幀畫在腳線下方，會被 .94 透明底面板蓋住大部分。
- 橫掃只在原地揮篙，範圍由弧形特效覆蓋敵人。
