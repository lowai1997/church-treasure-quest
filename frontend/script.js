const state = {
  token: localStorage.getItem('ctqToken'),
  player: null,
  view: 'shop',
  authMode: 'login',
  authRole: 'student',
  items: [],
  rank: [],
  players: [],
  busy: false
};

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');

const formatNumber = (value) => new Intl.NumberFormat('zh-Hant-TW').format(Number(value || 0));

const totalPower = (player) => Number(player?.totalPower ?? 0);

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
  localStorage.removeItem('ctqToken');
};

const roleText = (role) => (role === 'teacher' ? '教師' : '學生');

const renderAuth = () => {
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
                    <button class="role-button ${state.authRole === 'student' ? 'active' : ''}" type="button" data-auth-role="student">學生</button>
                    <button class="role-button ${state.authRole === 'teacher' ? 'active' : ''}" type="button" data-auth-role="teacher">教師</button>
                  </div>
                  <div class="field ${state.authRole === 'teacher' ? '' : 'is-hidden'}">
                    <label for="teacherKey">教師註冊金鑰</label>
                    <input id="teacherKey" name="teacherKey" placeholder="若伺服器有設定才需填寫" />
                  </div>
                `
                : ''
            }

            <button class="primary-button" type="submit">${state.authMode === 'login' ? '登入' : '建立帳號'}</button>
          </form>
          <p class="help-text">登入後會依照角色開啟學生商店或教師尋寶管理畫面。</p>
        </div>
      </div>
    </section>
  `;
};

const renderLoading = () => {
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
        ${navButton('rank', '🏆排行榜')}
      </nav>
    </section>
  `;
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

  return renderShop();
};

const renderShop = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>信心商店</h2>
        <p>商店是學生購買裝備的地方，教師可切換到尋寶管理或排行榜。</p>
      </section>
      <div class="empty-card">目前帳號是教師角色，不需要購買裝備。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>信心商店</h2>
      <p>使用活動金幣購買裝備，提升你的總戰力。</p>
    </section>

    <section class="stats-grid" aria-label="玩家狀態">
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>裝備戰力</span><strong>${formatNumber(state.player.power)}</strong></div>
      <div class="stat-card"><span>總戰力</span><strong>${formatNumber(totalPower(state.player))}</strong></div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>神秘盒</h3>
          <p>花費固定金幣，隨機獲得一件裝備。</p>
        </div>
        <span class="price-pill">${formatNumber(window.CTQ_BOX_PRICE || 1000)}</span>
      </div>
      <button class="primary-button" type="button" data-action="open-box">開啟 1 次</button>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>我的裝備</h3>
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
          <span>${escapeHtml(item.type)}</span>
          <span>戰力 +${formatNumber(item.power)}</span>
          <span>金幣 ${formatNumber(item.price)}</span>
        </div>
        <button class="mini-button" type="button" data-action="buy-item" data-item-id="${escapeAttr(item._id)}" ${canBuy ? '' : 'disabled'}>${canBuy ? '購買' : '金幣不足'}</button>
      </div>
    </article>
  `;
};

const renderHunt = () => {
  if (state.player.role !== 'teacher') {
    return `
      <section class="view-title">
        <h2>尋寶管理</h2>
        <p>此頁面由教師用來輸入活動密碼並發放金幣。</p>
      </section>
      <div class="empty-card">學生請前往商店購買裝備，或查看排行榜。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>尋寶管理</h2>
      <p>輸入活動密碼後，為完成任務的學生新增金幣，也可直接修正金幣數量。</p>
    </section>

    <section class="card">
      <form id="quick-add-form" class="admin-controls">
        <div class="field">
          <label for="eventPassword">活動密碼</label>
          <input id="eventPassword" name="eventPassword" type="password" placeholder="請輸入本次活動密碼" required />
        </div>
        <div class="field">
          <label for="studentName">學生名稱</label>
          <input id="studentName" name="name" placeholder="輸入學生玩家名稱" required />
        </div>
        <div class="field">
          <label for="amount">新增金幣</label>
          <input id="amount" name="amount" type="number" min="1" step="1" value="100" required />
        </div>
        <button class="primary-button" type="submit">新增金幣</button>
      </form>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>玩家名單與金幣調整</h3>
          <p>目前共有 ${state.players.length} 位學生玩家。</p>
        </div>
        <button class="ghost-button" type="button" data-action="refresh-players">刷新</button>
      </div>
      <div class="content-stack">
        ${
          state.players.length
            ? state.players.map(renderAdminRow).join('')
            : '<div class="empty-card">尚無學生玩家。</div>'
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
      <input aria-label="${escapeAttr(player.name)} 新增金幣" type="number" min="1" step="1" value="100" data-add-input="${escapeAttr(player._id)}" />
      <button class="mini-button" type="button" data-action="add-gold-row" data-player-id="${escapeAttr(player._id)}">加金幣</button>
      <button class="danger-button" type="button" data-action="remove-player" data-player-id="${escapeAttr(player._id)}" data-player-name="${escapeAttr(player.name)}">刪除玩家</button>
    </div>
  </article>
`;

const renderRank = () => {
  const topThree = state.rank.slice(0, 3);
  const rest = state.rank.slice(3);

  return `
    <section class="view-title">
      <h2>信心排行</h2>
      <p>依照總戰力排序，總戰力 = 裝備加成 + 金幣。</p>
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
          ? rest
              .map(
                (player, index) => `
                  <article class="rank-row">
                    <strong>${index + 4}</strong>
                    <div>
                      <strong>${escapeHtml(player.name)}</strong>
                      <span>金幣 ${formatNumber(player.gold)} · 裝備 ${player.itemCount || 0}</span>
                    </div>
                    <div class="rank-total">${formatNumber(player.totalPower)}</div>
                  </article>
                `
              )
              .join('') || '<div class="empty-card">目前只有前三名玩家。</div>'
          : '<div class="empty-card">排行榜尚無學生玩家。</div>'
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

  if (state.view === 'hunt') {
    await loadPlayers();
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

    showToast(result?.message || successMessage || '操作完成。');
    await refreshViewData();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    state.busy = false;
  }
};

app.addEventListener('click', async (event) => {
  const field = event.target.closest('.field');
  const authModeButton = event.target.closest('[data-auth-mode]');
  const authRoleButton = event.target.closest('[data-auth-role]');
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

  if (action === 'add-gold-row') {
    const playerId = actionButton.dataset.playerId;
    const amount = document.querySelector(`[data-add-input="${playerId}"]`)?.value;
    const eventPassword = document.querySelector('#eventPassword')?.value;
    await runAction(() =>
      api('/api/addGold', {
        method: 'POST',
        body: JSON.stringify({ playerId, amount, eventPassword })
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

  if (event.target.id === 'quick-add-form') {
    const formData = new FormData(event.target);
    await runAction(() =>
      api('/api/addGold', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          amount: formData.get('amount'),
          eventPassword: formData.get('eventPassword')
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
