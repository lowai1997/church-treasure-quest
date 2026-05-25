# 教會尋寶王 Church Treasure Quest

給教會團契團員玩的手機網頁遊戲。團員可登入、收集金幣、購買裝備、開神秘盒、加入世界怪獸戰鬥並查看排行榜；導師可登入後台，直接幫團員新增金幣、修正金幣、調整裝備或刪除團員帳號。

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
WORLD_BOSS_MAX_HP=2000000
WORLD_BOSS_SETTLE_SECONDS=10
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
| `/api/openBox` | POST | 團員花費 50 金幣抽取神秘盒獲得隨機裝備 |
| `/api/equipItem` | POST | 團員或導師穿戴背包中的裝備 |
| `/api/unequipItem` | POST | 團員或導師卸下已穿戴裝備 |
| `/api/sellItem` | POST | 團員賣出自己的裝備並取得金幣回收 |
| `/api/tradePlayers` | GET | 團員取得可交換裝備的其他團員清單 |
| `/api/trades` | GET / POST | 團員查看或送出裝備交換申請 |
| `/api/trades/:tradeId/accept` | POST | 收到申請的團員接受交換 |
| `/api/trades/:tradeId/decline` | POST | 收到申請的團員拒絕交換 |
| `/api/trades/:tradeId/cancel` | POST | 送出申請的團員取消交換 |
| `/api/getRank` | GET | 依照裝備戰力排序玩家 |
| `/api/worldBoss/status` | GET | 取得世界怪獸血量、參戰名單與合計戰力 |
| `/api/worldBoss/join` | POST | 團員加入世界怪獸戰鬥 |
| `/api/worldBoss/reset` | POST | 導師重置世界怪獸戰鬥 |
| `/api/removePlayer` | DELETE | 導師刪除團員玩家帳號 |

## 角色與權限

- 團員：可進入商店、購買裝備、開神秘盒、穿戴裝備、按稀有度整理背包、賣出裝備、向其他團員送出交換申請、加入世界怪獸、查看排行榜。
- 導師：可進入尋寶管理、直接新增或修正金幣、替團員調整裝備、重置世界怪獸、刪除團員玩家、查看排行榜。
- 導師註冊帳號時需輸入 `TEACHER_REGISTER_KEY`，預設為 `Amen2026`。
- 金幣不計入戰力；排行榜只依照已穿戴裝備的戰力排序。
- 神秘盒固定 50 金幣一次，機率為 N 50%、R 25%、S 15%、SS 8%、SSS 2%。
- 裝備賣出：N 回收 20 金幣、R 回收 40 金幣，S 或以上回收原價 50%；交換裝備採申請制，需要對方接受才會互換。
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
WORLD_BOSS_MAX_HP=2000000
WORLD_BOSS_SETTLE_SECONDS=10
```

## 平衡設定

假設每位團員每週可獲得 300 金幣，神秘盒固定 50 金幣一次，因此每週可抽 6 次。抽箱期望戰力為：

```text
N  50% x 5   = 2.5
R  25% x 12  = 3.0
S  15% x 25  = 3.75
SS 8%  x 55  = 4.4
SSS 2% x 120 = 2.4
合計每抽期望戰力 = 16.05
每週 6 抽期望背包戰力 = 96.3
```

商店採用「可指定購買，所以價格高於抽箱期望」的設計：

| 稀有度 | 戰力 | 商店價格 | 以每週 300 金幣估算 |
| --- | ---: | ---: | --- |
| N | 5 | 100 | 每週可買 3 件 |
| R | 12 | 250 | 約每週 1 件 |
| S | 25 | 600 | 約 2 週 1 件 |
| SS | 55 | 1400 | 約 4.7 週 1 件 |
| SSS | 120 | 3200 | 約 10.7 週 1 件 |

裝備欄共 8 格。若全身 N 約 40 戰力、全身 R 約 96、全身 S 約 200、全身 SS 約 440、全身 SSS 約 960。這讓團員每週都有抽箱成長感，但高稀有指定裝備仍需要長期累積。

世界怪獸預設血量為 2,000,000。每秒扣血 = 已加入團員的最新裝備戰力總和；瀏覽器每秒只做畫面倒數，伺服器預設每 10 秒才批次結算一次血量，並用 `lastSettledAt` 防止多個裝置同時重複扣血。估算例子：

| 參戰情境 | 合計戰力 / 每秒扣血 | 擊敗 2,000,000 HP 約需時間 |
| --- | ---: | --- |
| 20 人，每人 40 戰力 | 800 | 約 41.7 分鐘 |
| 20 人，每人 100 戰力 | 2,000 | 約 16.7 分鐘 |
| 30 人，每人 150 戰力 | 4,500 | 約 7.4 分鐘 |

啟動指令：

```bash
npm start
```

## 測試檢查

```bash
npm run check
```

若沒有設定 MongoDB，前端仍可載入，但 API 會回傳 `503` 並提示資料庫尚未連線。
