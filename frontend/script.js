const state = {
  token: localStorage.getItem('ctqToken'),
  player: null,
  view: 'shop',
  authMode: 'login',
  authRole: 'student',
  items: [],
  storeDate: '',
  rank: [],
  players: [],
  worldBoss: null,
  tradePlayers: [],
  incomingTrades: [],
  outgoingTrades: [],
  inventorySort: localStorage.getItem('ctqInventorySort') || 'rarity-desc',
  addGoldAmount: 100,
  busy: false
};

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
let bossVisualTimer = null;
let bossPollTimer = null;

const formatNumber = (value) => new Intl.NumberFormat('zh-Hant-TW').format(Number(value || 0));

const totalPower = (player) => Number(player?.totalPower ?? 0);
const rarityRank = { N: 1, R: 2, S: 3, SS: 4, SSS: 5 };

const sortInventoryItems = (items = []) => {
  return [...items].sort((left, right) => {
    if (state.inventorySort === 'rarity-asc') {
      return (
        (rarityRank[left.rarity] || 0) - (rarityRank[right.rarity] || 0) ||
        Number(left.power || 0) - Number(right.power || 0) ||
        String(left.name).localeCompare(String(right.name), 'zh-Hant')
      );
    }

    if (state.inventorySort === 'power-desc') {
      return (
        Number(right.power || 0) - Number(left.power || 0) ||
        (rarityRank[right.rarity] || 0) - (rarityRank[left.rarity] || 0) ||
        String(left.name).localeCompare(String(right.name), 'zh-Hant')
      );
    }

    return (
      (rarityRank[right.rarity] || 0) - (rarityRank[left.rarity] || 0) ||
      Number(right.power || 0) - Number(left.power || 0) ||
      String(left.name).localeCompare(String(right.name), 'zh-Hant')
    );
  });
};

const gearSellValue = (item) => Math.max(0, Math.floor(Number(item?.price || 0) * 0.5));

const equipmentSlots = [
  { key: 'weapon', label: '武器', limit: 2 },
  { key: 'helmet', label: '頭盔', limit: 1 },
  { key: 'armor', label: '胸甲', limit: 1 },
  { key: 'pants', label: '褲', limit: 1 },
  { key: 'shoes', label: '鞋', limit: 1 },
  { key: 'accessory', label: '裝飾品', limit: 2 }
];

const typeToSlot = {
  武器: 'weapon',
  頭盔: 'helmet',
  胸甲: 'armor',
  褲: 'pants',
  鞋: 'shoes',
  裝飾品: 'accessory',
  weapon: 'weapon',
  staff: 'weapon',
  helmet: 'helmet',
  armor: 'armor',
  shield: 'armor',
  cloak: 'armor',
  boots: 'shoes',
  ring: 'accessory'
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const escapeAttr = escapeHtml;

const itemIcon = () => `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.8 15.2 9l6.8 1-4.9 4.8 1.2 6.8L12 18.4l-6.1 3.2 1.2-6.8L2.2 10l6.8-1L12 2.8Z" fill="currentColor" opacity=".9"/>
  </svg>
`;

const crestIcon = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 5 54 14v16c0 14.3-8.8 24.6-22 29C18.8 54.6 10 44.3 10 30V14L32 5Z" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M32 15v34M21 27h22M25 20l7-5 7 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"/>
  </svg>
`;

const setBodyView = (view) => {
  document.body.dataset.view = view;
};

const showToast = (message, type = 'success') => {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  window.setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
};

const getLiveBossHp = (boss = state.worldBoss) => {
  if (!boss) {
    return 0;
  }

  const calculatedAt = Date.parse(boss.calculatedAt || '');
  const elapsedSeconds =
    boss.defeatedAt || !Number.isFinite(calculatedAt)
      ? 0
      : Math.max(0, Math.floor((Date.now() - calculatedAt) / 1000));

  return Math.max(0, Number(boss.hp || 0) - elapsedSeconds * Number(boss.totalPower || 0));
};

const bossHpPercent = (boss = state.worldBoss) => {
  if (!boss || !Number(boss.maxHp)) {
    return 0;
  }

  return Math.max(0, Math.min(100, (getLiveBossHp(boss) / Number(boss.maxHp)) * 100));
};

const updateBossLiveHp = () => {
  if (!state.worldBoss || state.view !== 'boss') {
    return;
  }

  const hp = getLiveBossHp();
  const hpTexts = document.querySelectorAll('[data-boss-hp]');
  const hpBar = document.querySelector('[data-boss-hp-bar]');
  const statusText = document.querySelector('[data-boss-status]');

  hpTexts.forEach((hpText) => {
    hpText.textContent = formatNumber(hp);
  });

  if (hpBar) {
    hpBar.style.width = `${bossHpPercent()}%`;
  }

  if (statusText && hp <= 0) {
    statusText.textContent = '已擊敗';
  }
};

const stopBossTimers = () => {
  window.clearInterval(bossVisualTimer);
  window.clearInterval(bossPollTimer);
  bossVisualTimer = null;
  bossPollTimer = null;
};

const syncBossTimers = () => {
  stopBossTimers();

  if (state.view !== 'boss' || !state.worldBoss || !state.token) {
    return;
  }

  updateBossLiveHp();
  bossVisualTimer = window.setInterval(updateBossLiveHp, 1000);
  bossPollTimer = window.setInterval(async () => {
    if (state.view !== 'boss' || !state.token) {
      stopBossTimers();
      return;
    }

    try {
      await loadWorldBoss();
      renderShell();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, Math.max(5, Number(state.worldBoss.settleEverySeconds || 10)) * 1000);
};

const api = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || '操作失敗，請稍後再試。');
  }

  return data;
};

const setSession = ({ token, player }) => {
  state.token = token;
  state.player = player;
  localStorage.setItem('ctqToken', token);
  state.view = player.role === 'teacher' ? 'hunt' : 'shop';
};

const clearSession = () => {
  state.token = null;
  state.player = null;
  state.items = [];
  state.rank = [];
  state.players = [];
  state.worldBoss = null;
  state.tradePlayers = [];
  state.incomingTrades = [];
  state.outgoingTrades = [];
  localStorage.removeItem('ctqToken');
};

const roleText = (role) => (role === 'teacher' ? '導師' : '團員');

const renderAuth = () => {
  stopBossTimers();
  setBodyView('login');
  app.innerHTML = `
    <section class="auth-screen">
      <div>
        <div class="brand-lockup">
          <div class="brand-mark">${crestIcon()}</div>
          <h1>教會尋寶王</h1>
          <p class="subtitle">信仰同行，完成任務、收集金幣、裝備你的尋寶隊伍。</p>
        </div>

        <div class="panel">
          <div class="auth-tabs" role="tablist" aria-label="登入或註冊">
            <button class="tab-button ${state.authMode === 'login' ? 'active' : ''}" type="button" data-auth-mode="login">登入</button>
            <button class="tab-button ${state.authMode === 'register' ? 'active' : ''}" type="button" data-auth-mode="register">註冊</button>
          </div>

          <form id="auth-form">
            <div class="field">
              <label for="name">帳號名稱</label>
              <input id="name" name="name" autocomplete="username" required placeholder="請輸入玩家名稱" />
            </div>
            <div class="field">
              <label for="password">密碼</label>
              <input id="password" name="password" type="password" autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}" required minlength="6" placeholder="至少 6 個字元" />
            </div>

            ${
              state.authMode === 'register'
                ? `
                  <div class="role-picker" aria-label="選擇角色">
                    <button class="role-button ${state.authRole === 'student' ? 'active' : ''}" type="button" data-auth-role="student">團員</button>
                    <button class="role-button ${state.authRole === 'teacher' ? 'active' : ''}" type="button" data-auth-role="teacher">導師</button>
                  </div>
                  <div class="field ${state.authRole === 'teacher' ? '' : 'is-hidden'}">
                    <label for="teacherKey">導師註冊金鑰</label>
                    <input id="teacherKey" name="teacherKey" placeholder="請輸入 Amen2026" />
                  </div>
                `
                : ''
            }

            <button class="primary-button" type="submit">${state.authMode === 'login' ? '登入' : '建立帳號'}</button>
          </form>
          <p class="help-text">登入後會依照角色開啟團員商店或導師尋寶管理畫面。</p>
        </div>
      </div>
    </section>
  `;
};

const renderLoading = () => {
  stopBossTimers();
  app.innerHTML = '<div class="loading">載入教會尋寶王...</div>';
};

const renderShell = () => {
  setBodyView(state.view);
  app.innerHTML = `
    <section class="app-shell">
      <header class="topbar">
        <div class="player-chip">
          <span class="player-name">${escapeHtml(state.player.name)}</span>
          <span class="player-meta">${roleText(state.player.role)} · 戰力 ${formatNumber(totalPower(state.player))}</span>
        </div>
        <div class="wallet" aria-label="目前金幣">金幣 ${formatNumber(state.player.gold)}</div>
        <button class="icon-button" type="button" data-action="logout" aria-label="登出">登出</button>
      </header>

      <main class="content-stack">
        ${renderCurrentView()}
      </main>

      <nav class="bottom-nav" aria-label="主要導覽">
        ${navButton('hunt', '🗝️尋寶')}
        ${navButton('shop', '🛒商店')}
        ${state.player.role === 'student' ? navButton('equipment', '🛡️裝備') : ''}
        ${state.player.role === 'teacher' ? navButton('players', '👥名單') : ''}
        ${navButton('boss', '🌍世界怪獸')}
        ${navButton('rank', '🏆排行榜')}
      </nav>
    </section>
  `;
  syncBossTimers();
};

const navButton = (view, label) => `
  <button class="nav-button ${state.view === view ? 'active' : ''}" type="button" data-view="${view}" aria-current="${state.view === view ? 'page' : 'false'}">${label}</button>
`;

const renderCurrentView = () => {
  if (state.view === 'hunt') {
    return renderHunt();
  }

  if (state.view === 'rank') {
    return renderRank();
  }

  if (state.view === 'players') {
    return renderPlayers();
  }

  if (state.view === 'equipment') {
    return renderEquipment();
  }

  if (state.view === 'boss') {
    return renderWorldBoss();
  }

  return renderShop();
};

const renderShop = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>信心商店</h2>
        <p>商店是團員購買裝備的地方，導師可切換到尋寶管理、名單或排行榜。</p>
      </section>
      <div class="empty-card">目前帳號是導師角色，不需要購買裝備。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>信心商店</h2>
      <p>每日刷新 5 件裝備，越稀有價格越高。</p>
    </section>

    <section class="stats-grid" aria-label="玩家狀態">
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>裝備戰力</span><strong>${formatNumber(state.player.power)}</strong></div>
      <div class="stat-card"><span>戰力</span><strong>${formatNumber(totalPower(state.player))}</strong></div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>神秘盒</h3>
          <p>每次 50 金幣，依照稀有度機率隨機獲得一件裝備。</p>
        </div>
        <span class="price-pill">50</span>
      </div>
      <button class="primary-button" type="button" data-action="open-box">開啟 1 次</button>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>我的背包</h3>
          <p>${state.player.items.length ? `已收集 ${state.player.items.length} 件裝備` : '尚未取得裝備'}</p>
        </div>
      </div>
      <div class="inventory-list">
        ${
          state.player.items.length
            ? state.player.items
                .map((item) => `<span class="inventory-tag">${escapeHtml(item.name)} +${formatNumber(item.power)}</span>`)
                .join('')
            : '<span class="inventory-tag">完成尋寶任務後再來採購</span>'
        }
      </div>
    </section>

    <section class="items-grid" aria-label="商店裝備">
      <div class="card-header">
        <div>
          <h3>今日商店</h3>
          <p>${state.storeDate ? `刷新日期 ${state.storeDate}` : '每日自動刷新'}</p>
        </div>
      </div>
      ${
        state.items.length
          ? state.items.map(renderItemCard).join('')
          : '<div class="empty-card">商店尚未建立裝備，請先執行 seed 或等待伺服器初始化。</div>'
      }
    </section>
  `;
};

const renderItemCard = (item) => {
  const canBuy = Number(state.player.gold || 0) >= Number(item.price || 0);

  return `
    <article class="item-card">
      <div class="item-icon">${itemIcon()}</div>
      <div class="item-body">
        <h3>${escapeHtml(item.name)}</h3>
        <div class="item-meta">
          <span>${escapeHtml(item.rarity || 'N')}</span>
          <span>${escapeHtml(item.type)}</span>
          <span>戰力 +${formatNumber(item.power)}</span>
          <span>金幣 ${formatNumber(item.price)}</span>
        </div>
        <button class="mini-button" type="button" data-action="buy-item" data-item-id="${escapeAttr(item._id)}" ${canBuy ? '' : 'disabled'}>${canBuy ? '購買' : '金幣不足'}</button>
      </div>
    </article>
  `;
};

const getEquippedIds = () => new Set(Object.values(state.player?.equipped || {}).flat());

const getEquippedIdsFor = (player) => new Set(Object.values(player?.equipped || {}).flat());

const getSlotItems = (slotKey, player = state.player) => {
  const equippedIds = new Set(player?.equipped?.[slotKey] || []);
  return (player?.items || []).filter((item) => equippedIds.has(item.inventoryId));
};

const isSlotFull = (slotKey, player = state.player) => {
  const slot = equipmentSlots.find((item) => item.key === slotKey);
  return Number(player?.equipped?.[slotKey]?.length || 0) >= Number(slot?.limit || 0);
};

const renderEquipment = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>裝備管理</h2>
        <p>此頁面由團員穿戴裝備提升戰力。</p>
      </section>
      <div class="empty-card">導師帳號不需要穿戴裝備。</div>
    `;
  }

  const equippedIds = getEquippedIds();
  const sortedItems = sortInventoryItems(state.player.items);

  return `
    <section class="view-title">
      <h2>裝備管理</h2>
      <p>可穿戴 2 武器、1 頭盔、1 胸甲、1 褲、1 鞋、2 裝飾品。</p>
    </section>

    <section class="stats-grid" aria-label="裝備狀態">
      <div class="stat-card"><span>裝備戰力</span><strong>${formatNumber(state.player.power)}</strong></div>
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>戰力</span><strong>${formatNumber(totalPower(state.player))}</strong></div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>目前穿戴</h3>
          <p>穿戴中的裝備才會計入裝備戰力。</p>
        </div>
      </div>
      <div class="equipment-slots">
        ${equipmentSlots
          .map((slot) => {
            const slotItems = getSlotItems(slot.key);
            return `
              <div class="equipment-slot">
                <strong>${slot.label} ${slotItems.length}/${slot.limit}</strong>
                <div class="inventory-list">
                  ${
                    slotItems.length
                      ? slotItems
                          .map(
                            (item) => `
                              <span class="inventory-tag">
                                ${escapeHtml(item.rarity || 'N')} ${escapeHtml(item.name)} +${formatNumber(item.power)}
                                <button class="tag-button" type="button" data-action="unequip-item" data-inventory-id="${escapeAttr(item.inventoryId)}">卸下</button>
                              </span>
                            `
                          )
                          .join('')
                      : '<span class="inventory-tag">空</span>'
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>

    <section class="items-grid" aria-label="背包裝備">
      <div class="card-header">
        <div>
          <h3>背包裝備</h3>
          <p>可按稀有度或戰力排序，也可賣出不需要的裝備。</p>
        </div>
        <select class="compact-select" aria-label="背包排序" data-inventory-sort>
          <option value="rarity-desc" ${state.inventorySort === 'rarity-desc' ? 'selected' : ''}>稀有度 高至低</option>
          <option value="rarity-asc" ${state.inventorySort === 'rarity-asc' ? 'selected' : ''}>稀有度 低至高</option>
          <option value="power-desc" ${state.inventorySort === 'power-desc' ? 'selected' : ''}>戰力 高至低</option>
        </select>
      </div>
      ${
        sortedItems.length
          ? sortedItems.map((item) => renderInventoryItem(item, equippedIds)).join('')
          : '<div class="empty-card">背包尚無裝備，可到商店購買或開神秘盒。</div>'
      }
    </section>

    ${renderTradePanel(sortedItems)}
  `;
};

const renderInventoryItem = (item, equippedIds) => {
  const slotKey = typeToSlot[item.type];
  const equipped = equippedIds.has(item.inventoryId);
  const full = slotKey ? isSlotFull(slotKey) : true;

  return `
    <article class="item-card">
      <div class="item-icon">${itemIcon()}</div>
      <div class="item-body">
        <h3>${escapeHtml(item.name)}</h3>
        <div class="item-meta">
          <span>${escapeHtml(item.rarity || 'N')}</span>
          <span>${escapeHtml(item.type)}</span>
          <span>戰力 +${formatNumber(item.power)}</span>
          <span>賣出 ${formatNumber(gearSellValue(item))}</span>
        </div>
        <div class="item-actions">
          ${
            equipped
              ? `<button class="mini-button" type="button" data-action="unequip-item" data-inventory-id="${escapeAttr(item.inventoryId)}">卸下</button>`
              : `<button class="mini-button" type="button" data-action="equip-item" data-inventory-id="${escapeAttr(item.inventoryId)}" ${full ? 'disabled' : ''}>${full ? '欄位已滿' : '穿戴'}</button>`
          }
          <button class="mini-button danger-mini" type="button" data-action="sell-item" data-inventory-id="${escapeAttr(item.inventoryId)}" data-item-name="${escapeAttr(item.name)}" data-sell-value="${gearSellValue(item)}">賣出</button>
        </div>
      </div>
    </article>
  `;
};

const renderTradePanel = (myItems) => {
  const tradeTargets = state.tradePlayers.flatMap((player) =>
    sortInventoryItems(player.items || []).map((item) => ({
      player,
      item
    }))
  );
  const canCreateTrade = myItems.length > 0 && tradeTargets.length > 0;

  return `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>裝備交換</h3>
          <p>送出交換申請後，需要對方接受才會互換裝備。</p>
        </div>
      </div>
      ${
        canCreateTrade
          ? `
            <form id="trade-form" class="trade-form">
              <div class="field">
                <label for="offeredInventoryId">我拿出</label>
                <select id="offeredInventoryId" name="offeredInventoryId" required>
                  ${myItems
                    .map(
                      (item) => `
                        <option value="${escapeAttr(item.inventoryId)}">${escapeHtml(item.rarity || 'N')} ${escapeHtml(item.name)} · +${formatNumber(item.power)}</option>
                      `
                    )
                    .join('')}
                </select>
              </div>
              <div class="field">
                <label for="requestedTradeTarget">想換到</label>
                <select id="requestedTradeTarget" name="requestedTradeTarget" required>
                  ${state.tradePlayers
                    .map((player) => {
                      const items = sortInventoryItems(player.items || []);
                      return items.length
                        ? `
                          <optgroup label="${escapeAttr(player.name)}">
                            ${items
                              .map(
                                (item) => `
                                  <option value="${escapeAttr(`${player._id}|${item.inventoryId}`)}">${escapeHtml(item.rarity || 'N')} ${escapeHtml(item.name)} · +${formatNumber(item.power)}</option>
                                `
                              )
                              .join('')}
                          </optgroup>
                        `
                        : '';
                    })
                    .join('')}
                </select>
              </div>
              <button class="primary-button" type="submit">送出交換申請</button>
            </form>
          `
          : '<div class="empty-card">需要你和其他團員都擁有裝備，才可以送出交換申請。</div>'
      }
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>收到的交換申請</h3>
          <p>${state.incomingTrades.length ? `共有 ${state.incomingTrades.length} 個待回覆申請。` : '目前沒有待回覆申請。'}</p>
        </div>
      </div>
      <div class="trade-list">
        ${
          state.incomingTrades.length
            ? state.incomingTrades.map((trade) => renderTradeCard(trade, 'incoming')).join('')
            : '<div class="empty-card">暫時沒有收到交換申請。</div>'
        }
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>送出的交換申請</h3>
          <p>${state.outgoingTrades.length ? `共有 ${state.outgoingTrades.length} 個等待對方回覆。` : '目前沒有等待中的申請。'}</p>
        </div>
      </div>
      <div class="trade-list">
        ${
          state.outgoingTrades.length
            ? state.outgoingTrades.map((trade) => renderTradeCard(trade, 'outgoing')).join('')
            : '<div class="empty-card">尚未送出交換申請。</div>'
        }
      </div>
    </section>
  `;
};

const renderTradeCard = (trade, mode) => {
  const otherName = mode === 'incoming' ? trade.fromPlayer?.name : trade.toPlayer?.name;

  return `
    <article class="trade-card">
      <div>
        <strong>${escapeHtml(otherName || '團員')}</strong>
        <span>${mode === 'incoming' ? '想和你交換裝備' : '等待對方回覆'}</span>
      </div>
      <div class="trade-swap">
        <span>${escapeHtml(trade.offeredItem?.rarity || 'N')} ${escapeHtml(trade.offeredItem?.name)} +${formatNumber(trade.offeredItem?.power)}</span>
        <span>⇄</span>
        <span>${escapeHtml(trade.requestedItem?.rarity || 'N')} ${escapeHtml(trade.requestedItem?.name)} +${formatNumber(trade.requestedItem?.power)}</span>
      </div>
      <div class="trade-actions">
        ${
          mode === 'incoming'
            ? `
              <button class="mini-button" type="button" data-action="accept-trade" data-trade-id="${escapeAttr(trade._id)}">接受</button>
              <button class="mini-button danger-mini" type="button" data-action="decline-trade" data-trade-id="${escapeAttr(trade._id)}">拒絕</button>
            `
            : `<button class="mini-button danger-mini" type="button" data-action="cancel-trade" data-trade-id="${escapeAttr(trade._id)}">取消</button>`
        }
      </div>
    </article>
  `;
};

const renderHunt = () => {
  if (state.player.role !== 'teacher') {
    return `
      <section class="view-title">
        <h2>尋寶管理</h2>
        <p>此頁面由導師用來選擇團員並發放金幣。</p>
      </section>
      <div class="empty-card">團員請前往商店購買裝備，或查看排行榜。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>尋寶管理</h2>
      <p>選擇團員後，可直接發放固定或自訂金幣。</p>
    </section>

    <section class="card">
      <form id="quick-add-form" class="admin-controls">
        <div class="field">
          <label for="studentName">團員名稱</label>
          <select id="studentName" name="playerId" required ${state.players.length ? '' : 'disabled'}>
            ${
              state.players.length
                ? state.players
                    .map((player) => `<option value="${escapeAttr(player._id)}">${escapeHtml(player.name)}（金幣 ${formatNumber(player.gold)}）</option>`)
                    .join('')
                : '<option value="">尚無團員玩家</option>'
            }
          </select>
        </div>
        <div class="field">
          <label>新增金幣</label>
          <div class="amount-options" role="group" aria-label="新增金幣數量">
            ${[50, 100, 150, 200]
              .map(
                (amount) => `
                  <button class="amount-button ${state.addGoldAmount === amount ? 'active' : ''}" type="button" data-coin-amount="${amount}">
                    ${amount}
                  </button>
                `
              )
              .join('')}
          </div>
          <input type="hidden" name="amount" value="${state.addGoldAmount}" />
        </div>
        <div class="field">
          <label for="customAmount">自訂 Token（金幣）</label>
          <input id="customAmount" name="customAmount" type="number" min="1" step="1" placeholder="輸入自訂發放數量（可留空）" />
        </div>
        <button class="primary-button" type="submit" ${state.players.length ? '' : 'disabled'}>新增金幣</button>
      </form>
    </section>
  `;
};

const renderWorldBoss = () => {
  const boss = state.worldBoss;

  if (!boss) {
    return `
      <section class="view-title">
        <h2>世界怪獸</h2>
        <p>正在載入共同 Boss 戰鬥狀態...</p>
      </section>
      <div class="empty-card">請稍候。</div>
    `;
  }

  const hp = getLiveBossHp(boss);
  const defeated = hp <= 0 || Boolean(boss.defeatedAt);
  const bossStatus = defeated
    ? '已擊敗'
    : Number(boss.totalPower || 0) > 0
      ? `每秒 -${formatNumber(boss.totalPower)}`
      : '等待團員加入';

  return `
    <section class="view-title">
      <h2>世界怪獸</h2>
      <p>所有已加入團員的最新戰力會合計為每秒傷害，伺服器每 ${formatNumber(boss.settleEverySeconds || 10)} 秒批次結算一次。</p>
    </section>

    <section class="stats-grid" aria-label="世界怪獸狀態">
      <div class="stat-card"><span>Boss 血量</span><strong><span data-boss-hp>${formatNumber(hp)}</span></strong></div>
      <div class="stat-card"><span>合計戰力</span><strong>${formatNumber(boss.totalPower)}</strong></div>
      <div class="stat-card"><span>參戰團員</span><strong>${formatNumber(boss.participantCount)}</strong></div>
    </section>

    <section class="card boss-card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(boss.name)}</h3>
          <p data-boss-status>${bossStatus}</p>
        </div>
        <span class="price-pill">${formatNumber(boss.maxHp)} HP</span>
      </div>
      <div class="boss-health" aria-label="世界怪獸血量">
        <div class="boss-health-fill" data-boss-hp-bar style="width: ${bossHpPercent(boss)}%"></div>
      </div>
      <div class="boss-health-row">
        <strong><span data-boss-hp>${formatNumber(hp)}</span> / ${formatNumber(boss.maxHp)}</strong>
        <span>${defeated ? '請等待導師重置' : `每秒扣血 ${formatNumber(boss.totalPower)}`}</span>
      </div>
      <div class="boss-actions">
        ${
          state.player.role === 'student'
            ? `<button class="primary-button" type="button" data-action="join-boss" ${boss.joined || defeated ? 'disabled' : ''}>${boss.joined ? '已加入戰鬥' : defeated ? 'Boss 已被擊敗' : '加入戰鬥'}</button>`
            : `<button class="danger-button" type="button" data-action="reset-boss">重置世界怪獸</button>`
        }
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>參戰名單</h3>
          <p>${state.player.role === 'student' ? `你的目前戰力：${formatNumber(totalPower(state.player))}` : '導師可查看目前參戰團員與戰力。'}</p>
        </div>
      </div>
      <div class="participant-list">
        ${
          boss.participants.length
            ? boss.participants
                .map(
                  (player) => `
                    <div class="participant-row">
                      <strong>${escapeHtml(player.name)}</strong>
                      <span>戰力 ${formatNumber(player.totalPower)}</span>
                    </div>
                  `
                )
                .join('')
            : '<div class="empty-card">尚未有團員加入世界怪獸戰鬥。</div>'
        }
      </div>
    </section>
  `;
};

const renderPlayers = () => {
  if (state.player.role !== 'teacher') {
    return `
      <section class="view-title">
        <h2>團員名單</h2>
        <p>此頁面由導師查看與調整團員資料。</p>
      </section>
      <div class="empty-card">只有導師可以查看團員名單。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>團員名單</h2>
      <p>查看所有團員，直接修正金幣數量，或移除離隊帳號。</p>
    </section>
    <section class="card">
      <div class="card-header">
        <div>
          <h3>玩家名單與金幣調整</h3>
          <p>目前共有 ${state.players.length} 位團員玩家。</p>
        </div>
        <button class="ghost-button" type="button" data-action="refresh-players">刷新</button>
      </div>
      <div class="content-stack">
        ${
          state.players.length
            ? state.players.map(renderAdminRow).join('')
            : '<div class="empty-card">尚無團員玩家。</div>'
        }
      </div>
    </section>
  `;
};

const renderAdminRow = (player) => `
  <article class="admin-row">
    <div class="admin-player">
      <div>
        <strong>${escapeHtml(player.name)}</strong>
        <span>裝備 ${player.items?.length || 0} 件 · 戰力 ${formatNumber(totalPower(player))}</span>
      </div>
      <span>金幣 ${formatNumber(player.gold)}</span>
    </div>
    <div class="row-actions">
      <input aria-label="${escapeAttr(player.name)} 新金幣數量" type="number" min="0" step="1" value="${player.gold}" data-gold-input="${escapeAttr(player._id)}" />
      <button class="mini-button" type="button" data-action="update-gold" data-player-id="${escapeAttr(player._id)}">儲存</button>
      <button class="danger-button" type="button" data-action="remove-player" data-player-id="${escapeAttr(player._id)}" data-player-name="${escapeAttr(player.name)}">刪除玩家</button>
    </div>
    ${renderManagedGear(player)}
  </article>
`;

const renderManagedGear = (player) => {
  const equippedIds = getEquippedIdsFor(player);

  return `
    <div class="managed-gear">
      <h4>裝備調整</h4>
      <div class="equipment-slots compact">
        ${equipmentSlots
          .map((slot) => {
            const slotItems = getSlotItems(slot.key, player);
            return `
              <div class="equipment-slot">
                <strong>${slot.label} ${slotItems.length}/${slot.limit}</strong>
                <div class="inventory-list">
                  ${
                    slotItems.length
                      ? slotItems
                          .map(
                            (item) => `
                              <span class="inventory-tag">
                                ${escapeHtml(item.rarity || 'N')} ${escapeHtml(item.name)} +${formatNumber(item.power)}
                                <button class="tag-button" type="button" data-action="unequip-item" data-player-id="${escapeAttr(player._id)}" data-inventory-id="${escapeAttr(item.inventoryId)}">卸下</button>
                              </span>
                            `
                          )
                          .join('')
                      : '<span class="inventory-tag">空</span>'
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="managed-inventory">
        ${
          player.items?.length
            ? player.items.map((item) => renderManagedInventoryItem(player, item, equippedIds)).join('')
            : '<div class="empty-card">此團員背包尚無裝備。</div>'
        }
      </div>
    </div>
  `;
};

const renderManagedInventoryItem = (player, item, equippedIds) => {
  const slotKey = typeToSlot[item.type];
  const equipped = equippedIds.has(item.inventoryId);
  const full = slotKey ? isSlotFull(slotKey, player) : true;

  return `
    <div class="managed-item">
      <span>${escapeHtml(item.rarity || 'N')} ${escapeHtml(item.name)} · ${escapeHtml(item.type)} · +${formatNumber(item.power)}</span>
      ${
        equipped
          ? `<button class="mini-button" type="button" data-action="unequip-item" data-player-id="${escapeAttr(player._id)}" data-inventory-id="${escapeAttr(item.inventoryId)}">卸下</button>`
          : `<button class="mini-button" type="button" data-action="equip-item" data-player-id="${escapeAttr(player._id)}" data-inventory-id="${escapeAttr(item.inventoryId)}" ${full ? 'disabled' : ''}>${full ? '欄位已滿' : '穿戴'}</button>`
      }
    </div>
  `;
};

const renderRank = () => {
  const topThree = state.rank.slice(0, 3);

  return `
    <section class="view-title">
      <h2>信心排行</h2>
      <p>依照裝備戰力排序，金幣不會計入戰力。</p>
    </section>

    ${
      topThree.length
        ? `
          <section class="rank-podium" aria-label="前三名">
            ${topThree
              .map(
                (player, index) => `
                  <article class="podium-card card">
                    <div class="rank-number">${index + 1}</div>
                    <div class="rank-name">${escapeHtml(player.name)}</div>
                    <div class="rank-score">${formatNumber(player.totalPower)}</div>
                  </article>
                `
              )
              .join('')}
          </section>
        `
        : ''
    }

    <section class="rank-list" aria-label="排行榜列表">
      ${
        state.rank.length
          ? state.rank
              .map(
                (player, index) => `
                  <article class="rank-row">
                    <strong>${index + 1}</strong>
                    <div>
                      <strong>${escapeHtml(player.name)}</strong>
                      <span>金幣 ${formatNumber(player.gold)} · 裝備 ${player.itemCount || 0}</span>
                    </div>
                    <div class="rank-total">${formatNumber(player.totalPower)}</div>
                  </article>
                `
              )
              .join('')
          : '<div class="empty-card">排行榜尚無團員玩家。</div>'
      }
    </section>
  `;
};

const loadMe = async () => {
  const data = await api('/api/me');
  state.player = data.player;
};

const loadItems = async () => {
  const data = await api('/api/getItems');
  state.items = data.items;
  state.storeDate = data.refreshDate || '';
};

const loadRank = async () => {
  const data = await api('/api/getRank');
  state.rank = data.rank;
};

const loadPlayers = async () => {
  if (state.player?.role !== 'teacher') {
    state.players = [];
    return;
  }

  const data = await api('/api/players');
  state.players = data.players;
};

const loadWorldBoss = async () => {
  const data = await api('/api/worldBoss/status');
  state.worldBoss = data.boss;
};

const loadTradeData = async () => {
  if (state.player?.role !== 'student') {
    state.tradePlayers = [];
    state.incomingTrades = [];
    state.outgoingTrades = [];
    return;
  }

  const [playersData, tradesData] = await Promise.all([api('/api/tradePlayers'), api('/api/trades')]);
  state.tradePlayers = playersData.players || [];
  state.incomingTrades = tradesData.incoming || [];
  state.outgoingTrades = tradesData.outgoing || [];
};

const refreshViewData = async () => {
  if (!state.token) {
    renderAuth();
    return;
  }

  await loadMe();

  if (state.view === 'shop') {
    await loadItems();
  }

  if (state.view === 'rank') {
    await loadRank();
  }

  if (state.view === 'hunt' || state.view === 'players') {
    await loadPlayers();
  }

  if (state.view === 'equipment') {
    await loadTradeData();
  }

  if (state.view === 'boss') {
    await loadWorldBoss();
  }

  renderShell();
};

const runAction = async (action, successMessage) => {
  if (state.busy) {
    return;
  }

  state.busy = true;
  try {
    const result = await action();

    if (result?.player) {
      state.player = result.player;
    }

    if (result?.boss) {
      state.worldBoss = result.boss;
    }

    showToast(result?.message || successMessage || '操作完成。');
    await refreshViewData();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    state.busy = false;
  }
};

app.addEventListener('change', (event) => {
  const sortSelect = event.target.closest('[data-inventory-sort]');

  if (!sortSelect) {
    return;
  }

  state.inventorySort = sortSelect.value;
  localStorage.setItem('ctqInventorySort', state.inventorySort);
  renderShell();
});

app.addEventListener('click', async (event) => {
  const field = event.target.closest('.field');
  const authModeButton = event.target.closest('[data-auth-mode]');
  const authRoleButton = event.target.closest('[data-auth-role]');
  const coinAmountButton = event.target.closest('[data-coin-amount]');
  const nav = event.target.closest('.nav-button[data-view]');
  const actionButton = event.target.closest('[data-action]');

  if (field && !event.target.matches('input, select, button')) {
    const input = field.querySelector('input, select');
    input?.focus();
    return;
  }

  if (authModeButton) {
    state.authMode = authModeButton.dataset.authMode;
    renderAuth();
    return;
  }

  if (authRoleButton) {
    state.authRole = authRoleButton.dataset.authRole;
    renderAuth();
    return;
  }

  if (coinAmountButton) {
    state.addGoldAmount = Number(coinAmountButton.dataset.coinAmount);
    document.querySelectorAll('[data-coin-amount]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.coinAmount) === state.addGoldAmount);
    });
    const amountInput = document.querySelector('#quick-add-form input[name="amount"]');
    if (amountInput) {
      amountInput.value = state.addGoldAmount;
    }
    return;
  }

  if (nav) {
    state.view = nav.dataset.view;
    renderLoading();
    try {
      await refreshViewData();
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  if (!actionButton) {
    return;
  }

  const { action } = actionButton.dataset;

  if (action === 'logout') {
    clearSession();
    renderAuth();
    showToast('已登出。');
    return;
  }

  if (action === 'buy-item') {
    const itemId = actionButton.dataset.itemId;
    await runAction(() =>
      api('/api/buyItem', {
        method: 'POST',
        body: JSON.stringify({ itemId })
      })
    );
    return;
  }

  if (action === 'open-box') {
    await runAction(() =>
      api('/api/openBox', {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'sell-item') {
    const inventoryId = actionButton.dataset.inventoryId;
    const itemName = actionButton.dataset.itemName;
    const sellValue = actionButton.dataset.sellValue;

    if (!window.confirm(`確定要賣出「${itemName}」並獲得 ${sellValue} 金幣嗎？`)) {
      return;
    }

    await runAction(() =>
      api('/api/sellItem', {
        method: 'POST',
        body: JSON.stringify({ inventoryId })
      })
    );
    return;
  }

  if (action === 'join-boss') {
    await runAction(() =>
      api('/api/worldBoss/join', {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'reset-boss') {
    if (!window.confirm('確定要重置世界怪獸戰鬥嗎？目前參戰名單與血量會重新開始。')) {
      return;
    }

    await runAction(() =>
      api('/api/worldBoss/reset', {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'accept-trade' || action === 'decline-trade' || action === 'cancel-trade') {
    const tradeId = actionButton.dataset.tradeId;
    const endpointByAction = {
      'accept-trade': 'accept',
      'decline-trade': 'decline',
      'cancel-trade': 'cancel'
    };

    await runAction(() =>
      api(`/api/trades/${tradeId}/${endpointByAction[action]}`, {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'equip-item') {
    const inventoryId = actionButton.dataset.inventoryId;
    const playerId = actionButton.dataset.playerId;
    await runAction(() =>
      api('/api/equipItem', {
        method: 'POST',
        body: JSON.stringify({ inventoryId, playerId })
      })
    );
    return;
  }

  if (action === 'unequip-item') {
    const inventoryId = actionButton.dataset.inventoryId;
    const playerId = actionButton.dataset.playerId;
    await runAction(() =>
      api('/api/unequipItem', {
        method: 'POST',
        body: JSON.stringify({ inventoryId, playerId })
      })
    );
    return;
  }

  if (action === 'refresh-players') {
    await runAction(async () => {
      await loadPlayers();
      return { message: '玩家名單已更新。' };
    });
    return;
  }

  if (action === 'update-gold') {
    const playerId = actionButton.dataset.playerId;
    const gold = document.querySelector(`[data-gold-input="${playerId}"]`)?.value;
    await runAction(() =>
      api('/api/updateGold', {
        method: 'POST',
        body: JSON.stringify({ playerId, gold })
      })
    );
    return;
  }

  if (action === 'remove-player') {
    const playerId = actionButton.dataset.playerId;
    const playerName = actionButton.dataset.playerName;

    if (!window.confirm(`確定要刪除玩家「${playerName}」嗎？`)) {
      return;
    }

    await runAction(() =>
      api('/api/removePlayer', {
        method: 'DELETE',
        body: JSON.stringify({ playerId })
      })
    );
  }
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (event.target.id === 'auth-form') {
    const formData = new FormData(event.target);
    const payload = {
      name: formData.get('name'),
      password: formData.get('password')
    };

    if (state.authMode === 'register') {
      payload.role = state.authRole;
      payload.teacherKey = formData.get('teacherKey');
    }

    await runAction(async () => {
      const data = await api(`/api/${state.authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSession(data);
      return { message: `${roleText(data.player.role)} ${data.player.name}，歡迎回來。` };
    });
    return;
  }

  if (event.target.id === 'trade-form') {
    const formData = new FormData(event.target);
    const [toPlayerId, requestedInventoryId] = String(formData.get('requestedTradeTarget') || '').split('|');

    await runAction(() =>
      api('/api/trades', {
        method: 'POST',
        body: JSON.stringify({
          offeredInventoryId: formData.get('offeredInventoryId'),
          toPlayerId,
          requestedInventoryId
        })
      })
    );
    return;
  }

  if (event.target.id === 'quick-add-form') {
    const formData = new FormData(event.target);
    const customAmount = Number(formData.get('customAmount'));
    const amount = Number.isFinite(customAmount) && customAmount > 0 ? customAmount : formData.get('amount');

    await runAction(() =>
      api('/api/addGold', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          playerId: formData.get('playerId'),
          amount
        })
      })
    );
  }
});

const boot = async () => {
  if (!state.token) {
    renderAuth();
    return;
  }

  renderLoading();
  try {
    await loadMe();
    state.view = state.player.role === 'teacher' ? 'hunt' : 'shop';
    await refreshViewData();
  } catch (error) {
    clearSession();
    renderAuth();
    showToast(error.message, 'error');
  }
};

boot();
