# 靈命之戰

給教會團契團員玩的夢幻輕奇幻手機網頁遊戲。團員可登入、收集金幣、購買裝備、開神秘盒、升級聖器、培養寵物、加入星光挑戰並查看排行榜；導師可登入後台，直接幫團員新增金幣、修正金幣、調整裝備與寵物、管理挑戰或刪除團員帳號。

## 技術

- Frontend: HTML, CSS, JavaScript ES Modules
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Auth: JWT + bcrypt password hashing

## 專案結構

```text
church-treasure-quest
├── frontend
│   ├── assets
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── utils
│   ├── seed.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## 快速開始

1. 安裝套件

```bash
npm install
```

2. 建立環境變數

```bash
cp .env.example .env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

請至少設定：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/church-treasure-quest
JWT_SECRET=please-change-this-secret
TEACHER_REGISTER_KEY=Amen2026
WORLD_BOSS_MAX_HP=3024000000
WORLD_BOSS_SETTLE_SECONDS=10
WORLD_BOSS_DEADLINE_HOURS=120
```

3. 建立預設商店物品

```bash
npm run seed
```

4. 啟動專案

```bash
npm run dev
```

開啟：

```text
http://localhost:3000
```

## API

| 路徑 | 方法 | 功能 |
| --- | --- | --- |
| `/api/register` | POST | 建立新帳號（團員或導師） |
| `/api/login` | POST | 登入並回傳角色資訊與 Token |
| `/api/me` | GET | 取得目前登入者 |
| `/api/addGold` | POST | 導師新增金幣（需 JWT 與導師角色） |
| `/api/updateGold` | POST | 導師修改金幣數量 |
| `/api/players` | GET | 導師取得團員玩家名單 |
| `/api/getItems` | GET | 取得每日商店 5 件物品 |
| `/api/buyItem` | POST | 團員購買物品，更新裝備與金幣 |
| `/api/openBox` | POST | 團員花費 100 金幣抽取神秘盒獲得隨機裝備 |
| `/api/equipItem` | POST | 團員或導師穿戴背包中的裝備 |
| `/api/unequipItem` | POST | 團員或導師卸下已穿戴裝備 |
| `/api/sellItem` | POST | 團員賣出自己的裝備並取得金幣回收 |
| `/api/tradePlayers` | GET | 團員取得可交換裝備的其他團員清單 |
| `/api/trades` | GET / POST | 團員查看或送出交換邀請，先選自己的裝備與對方玩家 |
| `/api/trades/:tradeId/accept` | POST | 收到邀請的團員選擇自己的裝備並接受交換 |
| `/api/trades/:tradeId/decline` | POST | 收到申請的團員拒絕交換 |
| `/api/trades/:tradeId/cancel` | POST | 送出申請的團員取消交換 |
| `/api/profilePhoto` | POST | 團員上傳或移除個人照片，會顯示在頭像與排行榜 |
| `/api/upgradeItem` | POST | 團員花費金幣依成功率嘗試升級裝備 |
| `/api/petCatalog` | GET | 取得可領養寵物清單 |
| `/api/adoptPet` | POST | 團員領養寵物 |
| `/api/feedPet` | POST | 團員答聖經題後嘗試升級寵物；答錯也會消耗金幣與機會 |
| `/api/unlockPetSlot` | POST | 團員花費金幣解鎖額外寵物欄位 |
| `/api/getRank` | GET | 依照裝備與寵物總戰力排序玩家 |
| `/api/weeklyMissions` | GET / POST | 取得每週任務；導師可建立每週重複任務 |
| `/api/weeklyMissions/:missionId` | PATCH / DELETE | 導師更新或移除每週任務內容、獎勵與啟用狀態 |
| `/api/weeklyMissions/:missionId/report` | POST | 團員每週提交一次指定任務完成 |
| `/api/weeklyMissionReports/:reportId/approve` | POST | 導師通過回報並發放獎勵 |
| `/api/weeklyMissionReports/:reportId/reject` | POST | 導師退回回報，團員可重新完成並提交 |
| `/api/worldBoss/status` | GET | 取得討伐三隻 Boss、預計完成時間、公告板、戰線位置、擊殺數、強度、期限、血量、參戰名單與合計戰力 |
| `/api/worldBoss/join` | POST | 團員選擇其中一隻討伐 Boss 加入戰鬥 |
| `/api/worldBoss/reset` | POST | 導師重置單一或全部討伐 Boss |
| `/api/worldBoss/config` | POST | 導師調整討伐擊殺數、Boss 強度、Boss 時限與戰線位置 |
| `/api/teacher/pets/add` | POST | 導師替團員新增活動獎勵寵物 |
| `/api/teacher/pets/update` | POST | 導師修改團員寵物資料 |
| `/api/removePlayer` | DELETE | 導師刪除團員玩家帳號 |

## 角色與權限

- 團員：可進入商店、購買裝備、開神秘盒、穿戴裝備、按稀有度整理背包、賣出裝備、向其他團員送出交換邀請、升級武器、培養寵物、加入討伐、查看排行榜。
- 導師：可進入尋寶管理、直接新增或修正金幣、替團員調整裝備與寵物、重置或調整討伐、調整 Boss 時限與戰線位置、刪除團員玩家、查看排行榜。
- 導師註冊帳號時需輸入 `TEACHER_REGISTER_KEY`，預設為 `Amen2026`。
- 金幣不計入戰力；排行榜依照已穿戴裝備與寵物合計戰力排序。
- 神秘盒固定 100 金幣一次，機率為 N 50%、R 25%、S 15%、SS 8%、SSS 2%。
- 裝備賣出價格：N 30、R 50、S 100、SS 250、SSS 500 金幣。
- 裝備交換採邀請制：發起者只選自己的裝備與對方玩家，收到邀請者接受時再選自己要交換的裝備，避免同名裝備造成衝突。
- 裝備可升級至 +9；每次嘗試花費 50 金幣，升級成功率每級降低 10%，成功後該裝備戰力 +10。升級後的裝備會在各頁面顯示 `+x`，交換給其他團員時也會保留升級等級。
- 寵物升級前需要答對一題聖經問題；答錯會消耗 50 金幣與本次寵物升級機會，不會提升寵物；答對後寵物戰力 +10。
- 每週任務由導師建立，內容與獎勵可自行設定，並會按週重複。團員同一任務每週只能回報一次；導師通過後會自動發放獎勵到團員帳戶。
- 每位玩家預設 1 個寵物欄位，可用 1000 金幣各解鎖第 2、第 3 欄；寵物戰力會加入玩家總戰力。
- 裝備欄位限制：2 武器、1 頭盔、1 胸甲、1 褲、1 鞋、2 裝飾品。

## 部署提示

此專案由 Express 同時提供 API 與 `frontend` 靜態檔案，適合部署到 Render、Railway、Fly.io 或支援 Node.js 的伺服器。

### 使用 Render 部署到網路

1. 先建立 MongoDB Atlas database，取得 Node.js connection string，格式通常像：

```env
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/church-treasure-quest?retryWrites=true&w=majority
```

2. 到 Render 建立 Blueprint 或 Web Service，選擇此 GitHub repo：

```text
https://github.com/lowai1997/church-treasure-quest
```

3. Render 會讀取根目錄的 `render.yaml`。部署時請填入：

```env
MONGODB_URI=你的 MongoDB Atlas connection string
TEACHER_REGISTER_KEY=Amen2026
```

4. 部署完成後，Render 會提供公開網址，例如：

```text
https://church-treasure-quest.onrender.com
```

5. 第一次部署完成後，可在 Render Shell 或本機執行一次 seed：

```bash
npm run seed
```

伺服器啟動時也會自動同步預設裝備清單；每日商店會從裝備池中固定刷新 5 件。

部署環境需設定：

```env
MONGODB_URI=你的 MongoDB Atlas 連線字串
JWT_SECRET=請使用長且隨機的字串
TEACHER_REGISTER_KEY=Amen2026
NODE_ENV=production
WORLD_BOSS_MAX_HP=3024000000
WORLD_BOSS_SETTLE_SECONDS=10
WORLD_BOSS_DEADLINE_HOURS=120
```

## 平衡設定

假設每位團員每週可獲得 300 金幣，神秘盒固定 100 金幣一次，因此每週可抽 3 次。抽箱期望戰力為：

```text
N  50% x 5   = 2.5
R  25% x 12  = 3.0
S  15% x 25  = 3.75
SS 8%  x 55  = 4.4
SSS 2% x 120 = 2.4
合計每抽期望戰力 = 16.05
每週 3 抽期望背包戰力 = 48.15
```

商店採用「可指定購買，所以價格高於抽箱期望」的設計，但仍讓低階裝備容易入手，方便新玩家快速補齊裝備格：

| 稀有度 | 戰力 | 商店價格 | 以每週 300 金幣估算 |
| --- | ---: | ---: | --- |
| N | 5 | 50 | 每週可買 6 件 |
| R | 12 | 100 | 每週可買 3 件 |
| S | 25 | 200 | 約每週 1.5 件 |
| SS | 55 | 500 | 約 1.7 週 1 件 |
| SSS | 120 | 1000 | 約 3.3 週 1 件 |

賣出價格設定為低於或等於購入價的一半，避免反覆買賣洗金幣，同時讓多餘裝備能回收成下一次升級或抽箱資源：

| 稀有度 | 賣出價格 | 相對商店價格 |
| --- | ---: | ---: |
| N | 30 | 60% |
| R | 50 | 50% |
| S | 100 | 50% |
| SS | 250 | 50% |
| SSS | 500 | 50% |

裝備欄共 8 格。若全身 N 約 40 戰力、全身 R 約 96、全身 S 約 200、全身 SS 約 440、全身 SSS 約 960。武器最多兩把，每把升到 +9 可額外增加 90 戰力，因此全武器升滿最多再增加 180 戰力。寵物預設基礎戰力 20，每次餵食花費 50 金幣並增加 10 戰力，讓團員即使暫時抽不到好裝備，也能穩定把金幣轉成長期戰力。

討伐預設同時開放 3 隻 Boss，並加入 25 步戰線故事。戰線位置 `0` 是我方主城，`25` 是敵方主世界，預設從中線 `13` 開始。每隻 Boss 的血量 = `WORLD_BOSS_MAX_HP` x 導師設定的強度；每秒扣血 = 已加入該 Boss 團員的最新總戰力。畫面會以目前剩餘 HP 和合計戰力估算「預計完成時間」，並標示是否可能逾時。瀏覽器每秒只做畫面倒數，伺服器預設每 10 秒才批次結算一次血量，並用 `lastSettledAt` 防止多個裝置同時重複扣血。

每隻 Boss 預設有 `WORLD_BOSS_DEADLINE_HOURS=120`，也就是 5 天期限：

- 期限內擊殺 Boss：戰線向敵方主世界推進 1 步，並累加擊殺數。
- 期限到仍未擊殺：敵軍向我方主城推進 1 步，並累加失守次數。
- Boss 結算後會自動更換新 Boss，並重新開始 5 天期限。
- 導師可在後台調整 Boss 時限與戰線位置；若只改時限而不重置 Boss，現有 Boss 會用新時限重新計算 deadline。
- 討伐公告板會顯示最近戰報、過去 7 日失守戰鬥，以及目前參戰團員的貢獻戰力。

預設基準是 10 位團員、平均 700 戰力時，約 5 天擊敗一隻強度 1 的 Boss：

```text
10 人 x 700 戰力 = 每秒 7,000 傷害
5 天 = 432,000 秒
需要血量 = 7,000 x 432,000 = 3,024,000,000 HP
```

以強度 1、3,024,000,000 HP 估算：

| 參戰情境 | 合計戰力 / 每秒扣血 | 擊敗 3,024,000,000 HP 約需時間 |
| --- | ---: | --- |
| 10 人，每人 700 戰力 | 7,000 | 約 5 天 |
| 20 人，每人 700 戰力 | 14,000 | 約 2.5 天 |
| 10 人，每人 350 戰力 | 3,500 | 約 10 天 |
| 30 人，每人 1,000 戰力 | 30,000 | 約 1.17 天 |

啟動指令：

```bash
npm start
```

## 圖片更新方法

個人照片已經內建在遊戲畫面：登入後按左上角頭像，選「上傳個人照片」，系統會自動縮圖並存到玩家資料，排行榜也會顯示同一張照片。

裝備與 Boss 圖片不會存入資料庫。請用 Windows 工具更新本機網站檔案：

1. 執行：

```text
tools/photo-setup/SetupGearPhoto.exe
```

2. 選擇 `Gear` 或 `Boss`。
3. 輸入遊戲內顯示的完整名稱，例如 `大衛之石刃` 或 `墮翼‧阿茲撒爾`。
4. 選擇圖片檔，工具會自動複製到：

```text
frontend/assets/custom/gear/
frontend/assets/custom/bosses/
```

5. 工具會更新：

```text
frontend/assets/custom/gear-images.json
frontend/assets/custom/boss-images.json
```

6. 完成後 commit、push 並重新部署，網站就會用名稱對應圖片。這個方法只把圖片與對應表放在網站檔案中，不會把裝備或 Boss 圖片放入 MongoDB。

## 測試檢查

```bash
npm run check
```

若沒有設定 MongoDB，前端仍可載入，但 API 會回傳 `503` 並提示資料庫尚未連線。
