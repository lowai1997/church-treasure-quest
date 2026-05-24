# 教會尋寶王 Church Treasure Quest

給教會團契學生玩的手機網頁遊戲。學生可登入、收集金幣、購買裝備、開神秘盒並查看排行榜；教師可登入後台，用活動密碼幫學生新增金幣、修正金幣或刪除學生帳號。

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
TREASURE_EVENT_CODE=amen2026
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
| `/api/register` | POST | 建立新帳號（學生或教師） |
| `/api/login` | POST | 登入並回傳角色資訊與 Token |
| `/api/me` | GET | 取得目前登入者 |
| `/api/addGold` | POST | 教師新增金幣（需 JWT、教師角色、活動密碼） |
| `/api/updateGold` | POST | 教師修改金幣數量 |
| `/api/players` | GET | 教師取得學生玩家名單 |
| `/api/getItems` | GET | 取得商店物品清單 |
| `/api/buyItem` | POST | 學生購買物品，更新裝備與金幣 |
| `/api/openBox` | POST | 學生抽取神秘盒獲得隨機裝備 |
| `/api/getRank` | GET | 依照總戰力排序玩家 |
| `/api/removePlayer` | DELETE | 教師刪除學生玩家帳號 |

## 角色與權限

- 學生：可進入商店、購買裝備、開神秘盒、查看排行榜。
- 教師：可進入尋寶管理、用活動密碼新增金幣、直接修正金幣、刪除學生玩家、查看排行榜。
- 若設定 `TEACHER_REGISTER_KEY`，註冊教師帳號時需輸入正確金鑰。

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
TREASURE_EVENT_CODE=教師發金幣用的活動密碼
```

4. 部署完成後，Render 會提供公開網址，例如：

```text
https://church-treasure-quest.onrender.com
```

5. 第一次部署完成後，可在 Render Shell 或本機執行一次 seed：

```bash
npm run seed
```

伺服器啟動時也會自動建立預設商店物品；若資料庫已有物品，不會重複新增。

部署環境需設定：

```env
MONGODB_URI=你的 MongoDB Atlas 連線字串
JWT_SECRET=請使用長且隨機的字串
TREASURE_EVENT_CODE=教師發金幣用的活動密碼
NODE_ENV=production
```

啟動指令：

```bash
npm start
```

## 測試檢查

```bash
npm run check
```

若沒有設定 MongoDB，前端仍可載入，但 API 會回傳 `503` 並提示資料庫尚未連線。
