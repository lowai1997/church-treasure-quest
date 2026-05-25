const state = {
  token: localStorage.getItem('ctqToken'),
  player: null,
  view: 'shop',
  authMode: 'login',
  authRole: 'student',
  authAvatar: localStorage.getItem('ctqAuthAvatar') || 'male-1',
  items: [],
  storeDate: '',
  rank: [],
  players: [],
  bosses: [],
  bossConfig: null,
  noticeBoard: null,
  tradePlayers: [],
  incomingTrades: [],
  outgoingTrades: [],
  petCatalog: [],
  inventorySort: localStorage.getItem('ctqInventorySort') || 'rarity-desc',
  addGoldAmount: 100,
  boxReveal: null,
  petQuiz: null,
  busy: false
};

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
let bossVisualTimer = null;
let bossPollTimer = null;

const formatNumber = (value) => new Intl.NumberFormat('zh-Hant-TW').format(Number(value || 0));

const totalPower = (player) => Number(player?.totalPower ?? 0);
const rarityRank = { N: 1, R: 2, S: 3, SS: 4, SSS: 5 };
const mysteryBoxPrice = 100;
const gearSellValues = { N: 30, R: 50, S: 100, SS: 250, SSS: 500 };
const upgradeCost = 50;
const maxUpgradeLevel = 9;
const upgradePowerGain = 10;
const feedPetCost = 50;
const petPowerGain = 10;
const unlockPetSlotCost = 1000;
const maxPetSlots = 3;
const raritySteps = ['S', 'SS', 'SSS'];
const rarityLabels = { N: '普通', R: '稀有', S: '超稀有', SS: '傳說', SSS: '神話' };
const avatarOptions = [
  { id: 'male-1', label: '星殿少年' },
  { id: 'male-2', label: '書卷少年' },
  { id: 'female-1', label: '羽光少女' },
  { id: 'female-2', label: '寶石少女' }
];

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

const gearSellValue = (item) => {
  return gearSellValues[item?.rarity] ?? 0;
};

const itemUpgradeLevel = (item) => Number(item?.upgradeLevel || 0);

const itemNameWithUpgrade = (item, { alwaysShow = false } = {}) => {
  const level = itemUpgradeLevel(item);
  const suffix = level > 0 || alwaysShow ? ` +${formatNumber(level)}` : '';
  return `${escapeHtml(item?.name || '裝備')}${suffix}`;
};

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

const weaponIconFor = (name = '') => {
  if (/[弓弩矢]/.test(name)) {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M31 7c-9 6-12 26 0 34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3.2"/>
        <path d="M31 7c6 8 6 26 0 34M31 8 15 40M16 19l10 10M11 41l8-3 3-8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8"/>
        <path d="M34 19l3 2 3-2-1 4 3 3-4 .3-2 3-1.4-3.5-3.6-.8 3-2.4V19Z" fill="currentColor"/>
      </svg>
    `;
  }

  if (/[杖]/.test(name)) {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M31 6 13 42" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3.2"/>
        <path d="M33 5 38 10 33 15 28 10 33 5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2.8"/>
        <path d="M33 10h8M33 10l-5-7M20 27l5 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4"/>
        <path d="M10 37c4-1 7 1 9 5-5-1-8-2-9-5Z" fill="currentColor" opacity=".45"/>
      </svg>
    `;
  }

  if (/[矛槍戟]/.test(name)) {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M31 5 41 15 34 18 28 12 31 5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2.8"/>
        <path d="M34 14 11 37M15 33l7 7M24 24l5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
        <path d="M11 37 7 43l6-4" fill="currentColor"/>
      </svg>
    `;
  }

  if (/[斧]/.test(name)) {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M21 10c7-3 15 0 18 7-5 2-10 3-15 1l-4-4 1-4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2.8"/>
        <path d="M25 17 10 41M16 31l7 5M29 14l5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M31.5 4.5 43 16 18.6 40.4l-8.1 2.1 2.1-8.1L37 10 31.5 4.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
      <path d="m27 16 5 5M10 34l4 4M7 29l12 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
      <path d="M36 6l2 4 4 .5-3 2.8.8 4-3.8-2-3.6 2 .7-4-3-2.8 4.2-.5 1.7-4Z" fill="currentColor"/>
    </svg>
  `;
};

const slotIcon = (type, name = '') => {
  const slotKey = typeToSlot[type] || type;
  const icons = {
    weapon: weaponIconFor(name),
    helmet: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M9 26c0-10 6.4-17 15-17s15 7 15 17v9c0 3-2 5-5 5H14c-3 0-5-2-5-5v-9Z" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M12 27h24M18 40V27M30 40V27M18 14c4 4 8 4 12 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
        <path d="M24 4l2 4 4 .5-3 2.8.8 4-3.8-2-3.8 2 .8-4-3-2.8 4-.5 2-4Z" fill="currentColor"/>
      </svg>
    `,
    armor: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M14 8h20l7 8-5 7-3-2v19H15V21l-3 2-5-7 7-8Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
        <path d="M20 10c.6 4 2 6 4 7 2-1 3.4-3 4-7M24 18v20M18 29h12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
        <path d="M24 22 29 28 24 36 19 28 24 22Z" fill="currentColor" opacity=".35"/>
      </svg>
    `,
    pants: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M15 7h18l3 34h-9l-3-19-3 19h-9l3-34Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
        <path d="M16 14h16M24 8v14M17 33c3-2 5-2 8 0M26 33c3-2 5-2 8 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
      </svg>
    `,
    shoes: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M11 27c5 3 11 2 15-5l5 8 8 3v6H8v-5l3-7Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
        <path d="M16 29h9M28 31h6M13 22c3-1 5-3 7-6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3"/>
        <path d="M35 19l1.5 3 3.5.4-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.4 3.5-.4 1.5-3Z" fill="currentColor"/>
      </svg>
    `,
    accessory: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 6 35 17 24 42 13 17 24 6Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
        <path d="M13 17h22M19 17l5 25 5-25M18 11h12" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3"/>
        <path d="M38 7l1.6 3.2 3.4.5-2.5 2.5.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.5 3.4-.5L38 7Z" fill="currentColor"/>
      </svg>
    `
  };

  return icons[slotKey] || itemIcon();
};

const avatarIcon = (avatar = 'male-1') => {
  const palette = {
    'male-1': ['#d5f0ff', '#ded7ff', '#d8b86f'],
    'male-2': ['#fff1d4', '#d5f0ff', '#b9adf2'],
    'female-1': ['#f9dce8', '#ded7ff', '#d8b86f'],
    'female-2': ['#ded7ff', '#fff1d4', '#9fd7f1']
  }[avatar] || ['#d5f0ff', '#ded7ff', '#d8b86f'];
  const hairPath =
    avatar === 'female-1'
      ? 'M13 24c0-8 5-15 11-15s11 7 11 15v13c-3 3-19 3-22 0V24Z'
      : avatar === 'female-2'
      ? 'M12 25c0-9 5-16 12-16s12 7 12 16c0 6-3 12-12 12S12 31 12 25Z'
      : 'M13 23c2-9 8-14 16-12 6 1 9 6 8 13-6-4-16-5-24-1Z';
  const detail =
    avatar === 'male-2'
      ? '<path d="M12 36h24M16 34c4-5 12-5 16 0M18 40h12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.2"/>'
      : avatar === 'female-2'
      ? '<path d="M24 32 29 38 24 44 19 38 24 32Z" fill="currentColor" opacity=".45"/>'
      : '<path d="M35 7l1.5 3 3.5.4-2.5 2.4.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.4 3.5-.4L35 7Z" fill="currentColor"/>';

  return `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="avatar-${avatar}" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette[0]}"/>
          <stop offset=".55" stop-color="${palette[1]}"/>
          <stop offset="1" stop-color="${palette[2]}"/>
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#avatar-${avatar})" opacity=".62"/>
      <path d="${hairPath}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.8"/>
      <circle cx="24" cy="25" r="8" fill="rgba(255,253,248,.86)" stroke="currentColor" stroke-width="2.4"/>
      <path d="M20 25h.1M28 25h.1M21 30c2 1.4 4 1.4 6 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.4"/>
      ${detail}
    </svg>
  `;
};

const navSymbol = (view) =>
  ({
    hunt: '✦',
    shop: '✧',
    equipment: '◇',
    upgrade: '✩',
    pets: '♡',
    players: '☰',
    boss: '✺',
    rank: '♕'
  })[view] || '✦';

const crestIcon = () => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M12 29h40M17 29v22M29 29v22M41 29v22M11 51h42M18 23l14-11 14 11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.4"/>
    <path d="M32 18v9M27.5 22.5h9M32 5l2.2 4.4L39 10l-3.5 3.4.8 4.8L32 16l-4.3 2.2.8-4.8L25 10l4.8-.6L32 5Z" fill="currentColor"/>
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

const getLiveBossHp = (boss) => {
  if (!boss) {
    return 0;
  }

  const calculatedAt = Date.parse(boss.calculatedAt || '');
  const deadlineAt = Date.parse(boss.deadlineAt || '');
  const now = Date.now();
  const liveAt = Number.isFinite(deadlineAt) && now > deadlineAt ? deadlineAt : now;
  const elapsedSeconds =
    boss.defeatedAt || boss.failedAt || !Number.isFinite(calculatedAt)
      ? 0
      : Math.max(0, Math.floor((liveAt - calculatedAt) / 1000));

  return Math.max(0, Number(boss.hp || 0) - elapsedSeconds * Number(boss.totalPower || 0));
};

const getBossTimeLeft = (boss) => {
  const deadlineAt = Date.parse(boss?.deadlineAt || '');

  if (!Number.isFinite(deadlineAt)) {
    return null;
  }

  return Math.max(0, deadlineAt - Date.now());
};

const formatDuration = (milliseconds) => {
  if (milliseconds === null) {
    return '未設定';
  }

  if (milliseconds <= 0) {
    return '已到限';
  }

  const totalMinutes = Math.ceil(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}天 ${hours}小時`;
  }

  if (hours > 0) {
    return `${hours}小時 ${minutes}分`;
  }

  return `${minutes}分`;
};

const getBossCompletionEstimate = (boss) => {
  const hp = getLiveBossHp(boss);
  const totalPower = Number(boss?.totalPower || 0);

  if (hp <= 0) {
    return {
      label: '已擊敗',
      detail: '正在更換目標',
      willMissDeadline: false
    };
  }

  if (totalPower <= 0) {
    return {
      label: '未能估算',
      detail: '等待團員加入',
      willMissDeadline: true
    };
  }

  const estimatedMilliseconds = Math.ceil(hp / totalPower) * 1000;
  const timeLeft = getBossTimeLeft(boss);
  const willMissDeadline = timeLeft !== null && estimatedMilliseconds > timeLeft;

  return {
    label: formatDuration(estimatedMilliseconds),
    detail: willMissDeadline ? '可能逾時' : '可於期限內完成',
    willMissDeadline
  };
};

const bossHpPercent = (boss) => {
  if (!boss || !Number(boss.maxHp)) {
    return 0;
  }

  return Math.max(0, Math.min(100, (getLiveBossHp(boss) / Number(boss.maxHp)) * 100));
};

const updateBossLiveHp = () => {
  if (!state.bosses.length || state.view !== 'boss') {
    return;
  }

  state.bosses.forEach((boss) => {
    const hp = getLiveBossHp(boss);
    const hpTexts = document.querySelectorAll(`[data-boss-hp="${boss._id}"]`);
    const hpBar = document.querySelector(`[data-boss-hp-bar="${boss._id}"]`);
    const statusText = document.querySelector(`[data-boss-status="${boss._id}"]`);
    const deadlineText = document.querySelector(`[data-boss-deadline="${boss._id}"]`);
    const estimateText = document.querySelector(`[data-boss-estimate="${boss._id}"]`);
    const estimateStatus = document.querySelector(`[data-boss-estimate-status="${boss._id}"]`);
    const timeLeft = getBossTimeLeft(boss);
    const estimate = getBossCompletionEstimate(boss);

    hpTexts.forEach((hpText) => {
      hpText.textContent = formatNumber(hp);
    });

    if (deadlineText) {
      deadlineText.textContent = `剩餘 ${formatDuration(timeLeft)}`;
    }

    if (estimateText) {
      estimateText.textContent = `預計完成 ${estimate.label}`;
    }

    if (estimateStatus) {
      estimateStatus.textContent = estimate.detail;
      estimateStatus.classList.toggle('danger-text', estimate.willMissDeadline);
    }

    if (hpBar) {
      hpBar.style.width = `${bossHpPercent(boss)}%`;
    }

    if (statusText && (hp <= 0 || timeLeft === 0)) {
      statusText.textContent = hp <= 0 ? '已完成，正在更換目標' : '期限已到，攻佔結算中';
    }
  });
};

const stopBossTimers = () => {
  window.clearInterval(bossVisualTimer);
  window.clearInterval(bossPollTimer);
  bossVisualTimer = null;
  bossPollTimer = null;
};

const syncBossTimers = () => {
  stopBossTimers();

  if (state.view !== 'boss' || !state.bosses.length || !state.token) {
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
      await loadMe();
      await loadWorldBoss();
      renderShell();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, Math.max(5, Number(state.bosses[0]?.settleEverySeconds || 10)) * 1000);
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
  state.bosses = [];
  state.bossConfig = null;
  state.noticeBoard = null;
  state.tradePlayers = [];
  state.incomingTrades = [];
  state.outgoingTrades = [];
  state.petCatalog = [];
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
          <h1>靈命之戰</h1>
          <p class="subtitle">星光同行，完成任務、收集寶石，裝備你的信心旅程。</p>
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
                  <div class="field avatar-field">
                    <label>角色徽章</label>
                    ${renderAvatarPicker(state.authAvatar, { mode: 'auth' })}
                  </div>
                  <div class="field ${state.authRole === 'teacher' ? '' : 'is-hidden'}">
                    <label for="teacherKey">導師註冊金鑰</label>
                    <input id="teacherKey" name="teacherKey" placeholder="請輸入導師註冊金鑰" />
                  </div>
                `
                : ''
            }

            <button class="primary-button" type="submit">${state.authMode === 'login' ? '登入' : '建立帳號'}</button>
          </form>
          <p class="help-text">登入後會依照角色開啟團員星光商店或導師任務管理畫面。</p>
        </div>
      </div>
    </section>
  `;
};

const renderLoading = () => {
  stopBossTimers();
  app.innerHTML = '<div class="loading">載入靈命之戰...</div>';
};

const renderShell = () => {
  setBodyView(state.view);
  app.innerHTML = `
    <section class="app-shell">
      <header class="topbar">
        <div class="profile-plaque">
          <div class="profile-avatar">${avatarIcon(state.player.avatar || 'male-1')}</div>
          <div class="player-chip">
            <span class="player-name">${escapeHtml(state.player.name)}</span>
            <span class="player-meta">${roleText(state.player.role)} · 戰力 ${formatNumber(totalPower(state.player))}</span>
            <span class="profile-meter" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(8, totalPower(state.player) / 10))}%"></span></span>
          </div>
        </div>
        <div class="top-actions">
          <div class="wallet" aria-label="目前金幣"><span class="wallet-icon" aria-hidden="true">✦</span>${formatNumber(state.player.gold)}</div>
          <button class="icon-button" type="button" data-action="logout" aria-label="登出">退出</button>
        </div>
      </header>

      <main class="content-stack">
        ${renderCurrentView()}
      </main>

      <nav class="bottom-nav" aria-label="主要導覽">
        ${navButton('hunt', '任務')}
        ${navButton('shop', '商店')}
        ${state.player.role === 'student' ? navButton('equipment', '裝備') : ''}
        ${state.player.role === 'student' ? navButton('upgrade', '升級') : ''}
        ${state.player.role === 'student' ? navButton('pets', '寵物') : ''}
        ${state.player.role === 'teacher' ? navButton('players', '名單') : ''}
        ${navButton('boss', '挑戰')}
        ${navButton('rank', '排行')}
      </nav>
      ${state.boxReveal ? renderBoxReveal() : ''}
      ${state.petQuiz ? renderPetQuiz() : ''}
    </section>
  `;
  syncBossTimers();
};

const navButton = (view, label) => `
  <button class="nav-button ${state.view === view ? 'active' : ''}" type="button" data-view="${view}" aria-current="${state.view === view ? 'page' : 'false'}">
    <span class="nav-icon" aria-hidden="true">${navSymbol(view)}</span>
    <span class="nav-label">${label}</span>
  </button>
`;

const renderAvatarPicker = (selectedAvatar, { mode = 'auth' } = {}) => `
  <div class="avatar-picker" aria-label="選擇角色徽章">
    ${avatarOptions
      .map(
        (avatar) => `
          <button
            class="avatar-choice ${selectedAvatar === avatar.id ? 'active' : ''}"
            type="button"
            ${mode === 'auth' ? `data-auth-avatar="${avatar.id}"` : `data-action="update-avatar" data-avatar="${avatar.id}"`}
            aria-pressed="${selectedAvatar === avatar.id ? 'true' : 'false'}"
          >
            <span class="avatar-choice-icon">${avatarIcon(avatar.id)}</span>
            <span>${avatar.label}</span>
          </button>
        `
      )
      .join('')}
  </div>
`;

const renderBoxReveal = () => {
  const reward = state.boxReveal?.reward || {};
  const rarity = reward.rarity || 'N';

  return `
    <div class="box-reveal" data-rarity="${escapeAttr(rarity)}" role="dialog" aria-modal="true" aria-label="神秘盒開箱結果">
      <div class="reveal-stage">
        <div class="reveal-stars" aria-hidden="true"></div>
        <div class="reveal-box" aria-hidden="true">
          <span class="box-lid"></span>
          <span class="box-base"></span>
          <span class="box-light"></span>
        </div>
        <div class="reveal-item">
          <div class="item-icon">${slotIcon(reward.type, reward.name)}</div>
          <span class="reveal-rarity">${escapeHtml(rarityLabels[rarity] || rarity)}</span>
          <strong>${escapeHtml(reward.name || '神秘裝備')}</strong>
          <span>${escapeHtml(reward.type || '裝備')} · 戰力 +${formatNumber(reward.power)}</span>
        </div>
      </div>
    </div>
  `;
};

const renderPetQuiz = () => {
  const quiz = state.petQuiz?.question;

  if (!quiz) {
    return '';
  }

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="寵物升級問題">
      <section class="quiz-modal card">
        <div class="card-header">
          <div>
            <h3>寵物升級考驗</h3>
            <p>答對後才會消耗金幣並提升寵物戰力。</p>
          </div>
          <button class="icon-button" type="button" data-action="cancel-pet-question" aria-label="關閉">關閉</button>
        </div>
        <strong class="quiz-question">${escapeHtml(quiz.question)}</strong>
        <div class="quiz-options">
          ${(quiz.options || [])
            .map(
              (option) => `
                <button class="mini-button quiz-option" type="button" data-action="answer-pet-question" data-answer="${escapeAttr(option.key)}">
                  <span>${escapeHtml(option.key)}</span>
                  ${escapeHtml(option.text)}
                </button>
              `
            )
            .join('')}
        </div>
      </section>
    </div>
  `;
};

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
    return renderHuntBosses();
  }

  if (state.view === 'upgrade') {
    return renderUpgrade();
  }

  if (state.view === 'pets') {
    return renderPets();
  }

  return renderShop();
};

const renderShop = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>星光商店</h2>
        <p>商店是團員購買裝備的地方，導師可切換到任務管理、名單或排行榜。</p>
      </section>
      <div class="empty-card">目前帳號是導師角色，不需要購買裝備。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>星光商店</h2>
      <p>每日刷新 5 件裝備，越稀有價格越高。</p>
    </section>

    <section class="stats-grid" aria-label="玩家狀態">
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>裝備戰力</span><strong>${formatNumber(state.player.equipmentPower)}</strong></div>
      <div class="stat-card"><span>戰力</span><strong>${formatNumber(totalPower(state.player))}</strong></div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>角色徽章</h3>
          <p>選擇你的隊伍代表圖示。</p>
        </div>
      </div>
      ${renderAvatarPicker(state.player.avatar || 'male-1', { mode: 'profile' })}
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>神秘盒</h3>
          <p>每次 ${formatNumber(mysteryBoxPrice)} 金幣，依照稀有度機率隨機獲得一件裝備。</p>
        </div>
        <span class="price-pill">${formatNumber(mysteryBoxPrice)}</span>
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
                .map((item) => `<span class="inventory-tag">${itemNameWithUpgrade(item)} · 戰力 +${formatNumber(item.power)}</span>`)
                .join('')
            : '<span class="inventory-tag">完成星光任務後再來採購</span>'
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
    <article class="item-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="item-icon">${slotIcon(item.type, item.name)}</div>
      <div class="item-body">
        <h3>${itemNameWithUpgrade(item)}</h3>
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
      <div class="stat-card"><span>裝備戰力</span><strong>${formatNumber(state.player.equipmentPower)}</strong></div>
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>寵物戰力</span><strong>${formatNumber(state.player.petPower)}</strong></div>
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
                                ${escapeHtml(item.rarity || 'N')} ${itemNameWithUpgrade(item)} · 戰力 +${formatNumber(item.power)}
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
    <article class="item-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="item-icon">${slotIcon(item.type, item.name)}</div>
      <div class="item-body">
        <h3>${itemNameWithUpgrade(item)}</h3>
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
          <button class="mini-button danger-mini" type="button" data-action="sell-item" data-inventory-id="${escapeAttr(item.inventoryId)}" data-item-name="${escapeAttr(item.name)}${itemUpgradeLevel(item) > 0 ? ` +${itemUpgradeLevel(item)}` : ''}" data-sell-value="${gearSellValue(item)}">賣出</button>
        </div>
      </div>
    </article>
  `;
};

const renderTradePanel = (myItems) => {
  const tradeTargets = state.tradePlayers.filter((player) => (player.items || []).length > 0);
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
                        <option value="${escapeAttr(item.inventoryId)}">${escapeHtml(item.rarity || 'N')} ${itemNameWithUpgrade(item)} · 戰力 +${formatNumber(item.power)}</option>
                      `
                    )
                    .join('')}
                </select>
              </div>
              <div class="field">
                <label for="toPlayerId">邀請對象</label>
                <select id="toPlayerId" name="toPlayerId" required>
                  ${state.tradePlayers
                    .filter((player) => (player.items || []).length > 0)
                    .map((player) => `<option value="${escapeAttr(player._id)}">${escapeHtml(player.name)} · ${formatNumber(player.items.length)} 件裝備</option>`)
                    .join('')}
                </select>
              </div>
              <button class="primary-button" type="submit">送出交換邀請</button>
            </form>
          `
          : '<div class="empty-card">需要你和其他團員都擁有裝備，才可以送出交換邀請。</div>'
      }
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>收到的交換申請</h3>
          <p>${state.incomingTrades.length ? `共有 ${state.incomingTrades.length} 個待回覆邀請。` : '目前沒有待回覆邀請。'}</p>
        </div>
      </div>
      <div class="trade-list">
        ${
          state.incomingTrades.length
            ? state.incomingTrades.map((trade) => renderTradeCard(trade, 'incoming')).join('')
            : '<div class="empty-card">暫時沒有收到交換邀請。</div>'
        }
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>送出的交換申請</h3>
          <p>${state.outgoingTrades.length ? `共有 ${state.outgoingTrades.length} 個等待對方回覆。` : '目前沒有等待中的邀請。'}</p>
        </div>
      </div>
      <div class="trade-list">
        ${
          state.outgoingTrades.length
            ? state.outgoingTrades.map((trade) => renderTradeCard(trade, 'outgoing')).join('')
            : '<div class="empty-card">尚未送出交換邀請。</div>'
        }
      </div>
    </section>
  `;
};

const renderTradeCard = (trade, mode) => {
  const otherName = mode === 'incoming' ? trade.fromPlayer?.name : trade.toPlayer?.name;
  const myTradeItems = sortInventoryItems(state.player.items || []).filter((item) => item.inventoryId !== trade.offeredInventoryId);

  return `
    <article class="trade-card">
      <div>
        <strong>${escapeHtml(otherName || '團員')}</strong>
        <span>${mode === 'incoming' ? '邀請你交換裝備' : '等待對方選擇裝備並回覆'}</span>
      </div>
      <div class="trade-swap">
        <span>${escapeHtml(trade.offeredItem?.rarity || 'N')} ${itemNameWithUpgrade(trade.offeredItem)} · 戰力 +${formatNumber(trade.offeredItem?.power)}</span>
        <span>⇄</span>
        <span>${mode === 'incoming' ? '請選擇你的裝備' : '對方尚未選擇'}</span>
      </div>
      <div class="trade-actions">
        ${
          mode === 'incoming'
            ? `
              <select class="compact-select" data-counter-trade="${escapeAttr(trade._id)}" aria-label="選擇交換裝備">
                ${myTradeItems
                  .map((item) => `<option value="${escapeAttr(item.inventoryId)}">${escapeHtml(item.rarity || 'N')} ${itemNameWithUpgrade(item)} · 戰力 +${formatNumber(item.power)}</option>`)
                  .join('')}
              </select>
              <button class="mini-button" type="button" data-action="accept-trade" data-trade-id="${escapeAttr(trade._id)}" ${myTradeItems.length ? '' : 'disabled'}>接受</button>
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
        <h2>任務管理</h2>
        <p>此頁面由導師用來選擇團員並發放金幣。</p>
      </section>
      <div class="empty-card">團員請前往商店購買裝備，或查看排行榜。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>任務管理</h2>
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

const campaignNarrative = (config = {}) => {
  const step = Number(config.frontlineStep ?? 13);
  const maxStep = Number(config.worldSteps || 25);

  if (step <= 0) {
    return '旅程回到起點聖殿前，需要重新整理隊伍的節奏。';
  }

  if (step <= 5) {
    return '星光稍微黯淡，需要團員一起完成挑戰，把旅程推回光亮處。';
  }

  if (step < Math.ceil(maxStep / 2)) {
    return '旅程停在聖殿外圍，團員可以集中信心穩住前進方向。';
  }

  if (step < maxStep - 5) {
    return '旅程在兩個世界之間展開，每一次挑戰都會讓星路前進或退回。';
  }

  if (step < maxStep) {
    return '隊伍已接近星光深處，連續完成挑戰可以抵達更明亮的位置。';
  }

  return '旅程已抵達星光深處，下一波挑戰將決定能否守住這份亮光。';
};

const renderCampaignTrack = (config = {}) => {
  const maxStep = Number(config.worldSteps || 25);
  const currentStep = Number(config.frontlineStep ?? 13);

  return Array.from({ length: maxStep + 1 }, (_, step) => {
    const classes = [
      'frontline-step',
      step === 0 ? 'home' : '',
      step === maxStep ? 'enemy' : '',
      step === currentStep ? 'current' : '',
      step < currentStep ? 'secured' : ''
    ]
      .filter(Boolean)
      .join(' ');
    const label = step === 0 ? '主' : step === maxStep ? '敵' : step;
    return `<span class="${classes}" title="第 ${step} 步">${label}</span>`;
  }).join('');
};

const renderNoticeBoard = () => {
  const notice = state.noticeBoard || {};
  const latestNews = notice.latestNews || [];
  const losses = notice.lossesPastSevenDays || [];
  const contributions = notice.contributions || [];

  return `
    <section class="card notice-card">
      <div class="card-header">
        <div>
          <h3>星光公告板</h3>
          <p>顯示最新紀錄、過去 7 日退回，以及目前參與團員貢獻。</p>
        </div>
      </div>
      <div class="notice-section">
        <h4>最新紀錄</h4>
        <div class="notice-list">
          ${
            latestNews.length
              ? latestNews
                  .map(
                    (event) => `
                      <div class="notice-row">
                        <strong>${escapeHtml(event.message)}</strong>
                        <span>${event.occurredAt ? new Date(event.occurredAt).toLocaleString('zh-Hant-HK') : ''}</span>
                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty-card">暫時未有紀錄。</div>'
          }
        </div>
      </div>
      <div class="notice-section">
        <h4>過去 7 日失守</h4>
        <div class="notice-list">
          ${
            losses.length
              ? losses
                  .map(
                    (event) => `
                      <div class="notice-row danger-row">
                        <strong>${escapeHtml(event.bossName || '未知 Boss')}</strong>
                        <span>${event.occurredAt ? new Date(event.occurredAt).toLocaleString('zh-Hant-HK') : ''} · 合計戰力 ${formatNumber(event.totalPower)}</span>
                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty-card">過去 7 日沒有退回紀錄。</div>'
          }
        </div>
      </div>
      <div class="notice-section">
        <h4>目前貢獻</h4>
        <div class="notice-list">
          ${
            contributions.length
              ? contributions
                  .map(
                    (player) => `
                      <div class="notice-row contribution-row">
                        <strong>${escapeHtml(player.name)}</strong>
                        <span>貢獻戰力 ${formatNumber(player.totalPower)} · ${escapeHtml((player.bosses || []).join('、'))}</span>
                      </div>
                    `
                  )
                  .join('')
              : '<div class="empty-card">尚未有團員加入挑戰。</div>'
          }
        </div>
      </div>
    </section>
  `;
};

const renderHuntBosses = () => {
  if (!state.bosses.length) {
    return `
      <section class="view-title">
        <h2>星光挑戰</h2>
        <p>正在載入挑戰目標...</p>
      </section>
      <div class="empty-card">請稍候。</div>
    `;
  }

  return `
    <section class="view-title">
      <h2>星光挑戰</h2>
      <p>討伐 Boss 後會向敵陣前進，期限未完成則被攻佔一格。</p>
    </section>

    <section class="stats-grid" aria-label="挑戰狀態">
      <div class="stat-card"><span>旅程位置</span><strong>${formatNumber(state.bossConfig?.frontlineStep)} / ${formatNumber(state.bossConfig?.worldSteps)}</strong></div>
      <div class="stat-card"><span>已完成</span><strong>${formatNumber(state.bossConfig?.killCount)}</strong></div>
      <div class="stat-card"><span>被攻佔</span><strong>${formatNumber(state.bossConfig?.defenseLosses)}</strong></div>
    </section>

    <section class="card campaign-card">
      <div class="card-header">
        <div>
          <h3>星光旅程</h3>
          <p>${escapeHtml(campaignNarrative(state.bossConfig))}</p>
        </div>
      </div>
      <div class="frontline-labels">
        <span>起點聖殿</span>
        <span>敵陣</span>
      </div>
      <div class="frontline-track" aria-label="兩個世界之間的 25 步星光旅程">
        ${renderCampaignTrack(state.bossConfig)}
      </div>
      <p class="campaign-event">${escapeHtml(state.bossConfig?.lastCampaignEvent || '')}</p>
    </section>

    ${renderNoticeBoard()}

    ${
      state.player.role === 'teacher'
        ? `
          <section class="card">
            <div class="card-header">
              <div>
                <h3>挑戰設定</h3>
                <p>可調整已完成數、旅程位置，並選擇是否立即重置三隻 Boss。</p>
              </div>
            </div>
            <form id="boss-config-form" class="admin-controls">
              <div class="field">
                <label for="killCount">已完成數</label>
                <input id="killCount" name="killCount" type="number" min="0" step="1" value="${Number(state.bossConfig?.killCount || 0)}" />
              </div>
              <div class="field">
                <label for="frontlineStep">旅程位置（0 起點聖殿 / 25 敵陣）</label>
                <input id="frontlineStep" name="frontlineStep" type="number" min="0" max="${Number(state.bossConfig?.worldSteps || 25)}" step="1" value="${Number(state.bossConfig?.frontlineStep ?? 13)}" />
              </div>
              <label class="check-row">
                <input name="resetBosses" type="checkbox" />
                <span>儲存後立即重置三隻 Boss</span>
              </label>
              <button class="primary-button" type="submit">儲存挑戰設定</button>
            </form>
          </section>
        `
        : ''
    }

    <section class="boss-grid">
      ${state.bosses.map(renderBossCard).join('')}
    </section>
  `;
};

const renderBossCard = (boss) => {
  const hp = getLiveBossHp(boss);
  const timeLeft = getBossTimeLeft(boss);
  const defeated = hp <= 0 || Boolean(boss.defeatedAt);
  const bossStatus = defeated
    ? '已完成，正在更換目標'
    : timeLeft === 0
      ? '期限已到，攻佔結算中'
      : Number(boss.totalPower || 0) > 0
      ? '討伐進行中'
      : '等待團員加入';

  return `
    <section class="card boss-card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(boss.name)}</h3>
          <p data-boss-status="${escapeAttr(boss._id)}">${bossStatus}</p>
        </div>
        <span class="price-pill">參戰 ${formatNumber(boss.participantCount)}</span>
      </div>
      <div class="boss-health" aria-label="挑戰進度">
        <div class="boss-health-fill" data-boss-hp-bar="${escapeAttr(boss._id)}" style="width: ${bossHpPercent(boss)}%"></div>
      </div>
      <div class="boss-health-row">
        <strong>${defeated ? '討伐成功' : '討伐進度'}</strong>
        <span>${defeated ? '準備下一個 Boss' : '團員戰力會持續推進進度'}</span>
      </div>
      <div class="boss-actions">
        ${
          state.player.role === 'student'
            ? `<button class="primary-button" type="button" data-action="join-boss" data-boss-id="${escapeAttr(boss._id)}" ${boss.joined || defeated || timeLeft === 0 ? 'disabled' : ''}>${boss.joined ? '已加入此挑戰' : '加入挑戰'}</button>`
            : `<button class="danger-button" type="button" data-action="reset-boss" data-boss-slot="${escapeAttr(boss.slot)}">重置此挑戰</button>`
        }
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
            : '<div class="empty-card">尚未有團員加入。</div>'
        }
      </div>
    </section>
  `;
};

const getUpgradeableItems = () => sortInventoryItems(state.player.items || []);

const getUpgradeSuccessRate = (item) => Math.max(10, 100 - (Number(item.upgradeLevel || 0) + 1) * 10);
const getNextRarity = (rarity) => {
  const index = raritySteps.indexOf(rarity);
  return index >= 0 && index < raritySteps.length - 1 ? raritySteps[index + 1] : null;
};
const getRarityUpgradeSuccessRate = (item) => Math.max(5, Math.floor(getUpgradeSuccessRate(item) / 2));

const renderUpgrade = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>裝備升級</h2>
        <p>只有團員可以升級裝備。</p>
      </section>
      <div class="empty-card">導師帳號不需要升級裝備。</div>
    `;
  }

  const upgradeItems = getUpgradeableItems();

  return `
    <section class="view-title">
      <h2>裝備升級</h2>
      <p>每次升級消耗 ${formatNumber(upgradeCost)} 金幣。成功後裝備 +1，戰力 +${formatNumber(upgradePowerGain)}；S / SS 裝備可突破稀有度，成功率會減半。</p>
    </section>

    <section class="stats-grid">
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
      <div class="stat-card"><span>戰力</span><strong>${formatNumber(totalPower(state.player))}</strong></div>
      <div class="stat-card"><span>裝備數</span><strong>${formatNumber(upgradeItems.length)}</strong></div>
    </section>

    <section class="items-grid">
      ${
        upgradeItems.length
          ? upgradeItems.map(renderUpgradeCard).join('')
          : '<div class="empty-card">背包尚無裝備，可先到商店購買或開神秘盒。</div>'
      }
    </section>
  `;
};

const renderUpgradeCard = (item) => {
  const level = Number(item.upgradeLevel || 0);
  const maxed = level >= maxUpgradeLevel;
  const canAfford = Number(state.player.gold || 0) >= upgradeCost;
  const nextRarity = getNextRarity(item.rarity);
  const canBreakRarity = Boolean(nextRarity) && Number(state.player.gold || 0) >= upgradeCost;

  return `
    <article class="item-card upgrade-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="item-icon">${slotIcon(item.type, item.name)}</div>
      <div class="item-body">
        <h3>${itemNameWithUpgrade(item, { alwaysShow: true })}</h3>
        <div class="item-meta">
          <span>${escapeHtml(item.rarity || 'N')}</span>
          <span>戰力 ${formatNumber(item.power)}</span>
          <span>成功率 ${maxed ? '已滿' : `${formatNumber(getUpgradeSuccessRate(item))}%`}</span>
          <span>費用 ${formatNumber(upgradeCost)}</span>
        </div>
        <div class="item-actions">
          <button class="mini-button" type="button" data-action="upgrade-item" data-upgrade-mode="level" data-inventory-id="${escapeAttr(item.inventoryId)}" ${maxed || !canAfford ? 'disabled' : ''}>${maxed ? `已 +${formatNumber(maxUpgradeLevel)}` : canAfford ? '裝備 +1' : '金幣不足'}</button>
          <button class="mini-button" type="button" data-action="upgrade-item" data-upgrade-mode="rarity" data-inventory-id="${escapeAttr(item.inventoryId)}" ${nextRarity && canBreakRarity ? '' : 'disabled'}>${nextRarity ? `突破 ${nextRarity}（${formatNumber(getRarityUpgradeSuccessRate(item))}%）` : '已達最高稀有度'}</button>
        </div>
      </div>
    </article>
  `;
};

const renderPets = () => {
  if (state.player.role !== 'student') {
    return `
      <section class="view-title">
        <h2>寵物</h2>
        <p>只有團員可以培養寵物。</p>
      </section>
      <div class="empty-card">導師可在團員名單中管理團員寵物。</div>
    `;
  }

  const availableSlots = Number(state.player.petSlots || 1);
  const pets = state.player.pets || [];

  return `
    <section class="view-title">
      <h2>寵物</h2>
      <p>寵物戰力會加入總戰力。每次升級需要答對一題聖經問題，成功後消耗 ${formatNumber(feedPetCost)} 金幣並提升 ${formatNumber(petPowerGain)} 戰力。</p>
    </section>

    <section class="stats-grid">
      <div class="stat-card"><span>寵物欄位</span><strong>${formatNumber(pets.length)} / ${formatNumber(availableSlots)}</strong></div>
      <div class="stat-card"><span>寵物戰力</span><strong>${formatNumber(state.player.petPower)}</strong></div>
      <div class="stat-card"><span>金幣</span><strong>${formatNumber(state.player.gold)}</strong></div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>我的寵物</h3>
          <p>${pets.length ? '答對問題即可提升等級與戰力。' : '先從下方選擇一隻寵物。'}</p>
        </div>
        <button class="ghost-button" type="button" data-action="unlock-pet-slot" ${availableSlots >= maxPetSlots || state.player.gold < unlockPetSlotCost ? 'disabled' : ''}>解鎖欄位 ${formatNumber(unlockPetSlotCost)}</button>
      </div>
      <div class="pet-grid">
        ${
          pets.length
            ? pets.map(renderOwnedPetCard).join('')
            : '<div class="empty-card">尚未擁有寵物。</div>'
        }
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3>領養寵物</h3>
          <p>每個已解鎖欄位可放一隻寵物。</p>
        </div>
      </div>
      <div class="pet-grid">
        ${
          state.petCatalog.length
            ? state.petCatalog.map((pet) => renderPetCatalogCard(pet, pets.length >= availableSlots)).join('')
            : '<div class="empty-card">寵物清單載入中。</div>'
        }
      </div>
    </section>
  `;
};

const renderOwnedPetCard = (pet) => `
  <article class="pet-card">
    <strong>${escapeHtml(pet.name)}</strong>
    <span>${escapeHtml(pet.type)} · Lv.${formatNumber(pet.level)} · 戰力 ${formatNumber(pet.power)}</span>
    <button class="mini-button" type="button" data-action="feed-pet" data-pet-id="${escapeAttr(pet.petInstanceId)}" ${state.player.gold < feedPetCost ? 'disabled' : ''}>答題升級 ${formatNumber(feedPetCost)}</button>
  </article>
`;

const renderPetCatalogCard = (pet, full) => `
  <article class="pet-card">
    <strong>${escapeHtml(pet.name)}</strong>
    <span>${escapeHtml(pet.type)} · 基礎戰力 ${formatNumber(pet.basePower)}</span>
    <button class="mini-button" type="button" data-action="adopt-pet" data-pet-id="${escapeAttr(pet.petId)}" ${full ? 'disabled' : ''}>${full ? '欄位已滿' : '領養'}</button>
  </article>
`;

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
    ${renderManagedPets(player)}
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
                                ${escapeHtml(item.rarity || 'N')} ${itemNameWithUpgrade(item)} · 戰力 +${formatNumber(item.power)}
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
      <span>${escapeHtml(item.rarity || 'N')} ${itemNameWithUpgrade(item)} · ${escapeHtml(item.type)} · 戰力 +${formatNumber(item.power)}</span>
      ${
        equipped
          ? `<button class="mini-button" type="button" data-action="unequip-item" data-player-id="${escapeAttr(player._id)}" data-inventory-id="${escapeAttr(item.inventoryId)}">卸下</button>`
          : `<button class="mini-button" type="button" data-action="equip-item" data-player-id="${escapeAttr(player._id)}" data-inventory-id="${escapeAttr(item.inventoryId)}" ${full ? 'disabled' : ''}>${full ? '欄位已滿' : '穿戴'}</button>`
      }
    </div>
  `;
};

const renderManagedPets = (player) => `
  <div class="managed-gear">
    <h4>寵物管理</h4>
    <div class="managed-inventory">
      ${
        player.pets?.length
          ? player.pets
              .map(
                (pet) => `
                  <div class="managed-item pet-admin-item">
                    <span>${escapeHtml(pet.name)} · Lv.${formatNumber(pet.level)} · 戰力 ${formatNumber(pet.power)}</span>
                    <input aria-label="${escapeAttr(pet.name)} 等級" type="number" min="1" step="1" value="${formatNumber(pet.level)}" data-pet-level="${escapeAttr(pet.petInstanceId)}" />
                    <input aria-label="${escapeAttr(pet.name)} 戰力" type="number" min="0" step="1" value="${formatNumber(pet.power)}" data-pet-power="${escapeAttr(pet.petInstanceId)}" />
                    <button class="mini-button" type="button" data-action="teacher-update-pet" data-player-id="${escapeAttr(player._id)}" data-pet-id="${escapeAttr(pet.petInstanceId)}">儲存</button>
                  </div>
                `
              )
              .join('')
          : '<div class="empty-card">此團員尚無寵物。</div>'
      }
      <div class="managed-item">
        <select class="compact-select" data-teacher-pet-select="${escapeAttr(player._id)}">
          ${state.petCatalog.map((pet) => `<option value="${escapeAttr(pet.petId)}">${escapeHtml(pet.name)}</option>`).join('')}
        </select>
        <button class="mini-button" type="button" data-action="teacher-add-pet" data-player-id="${escapeAttr(player._id)}" ${player.pets?.length >= maxPetSlots ? 'disabled' : ''}>新增寵物</button>
      </div>
    </div>
  </div>
`;

const renderRank = () => {
  const topThree = state.rank.slice(0, 3);

  return `
    <section class="view-title">
      <h2>星光排行</h2>
      <p>依照裝備與寵物總戰力排序，金幣不會計入戰力。</p>
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
  state.bosses = data.bosses || [];
  state.bossConfig = data.config || null;
  state.noticeBoard = data.noticeBoard || null;
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

const loadPetCatalog = async () => {
  const data = await api('/api/petCatalog');
  state.petCatalog = data.pets || [];
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

  if (state.view === 'players') {
    await loadPetCatalog();
  }

  if (state.view === 'equipment') {
    await loadTradeData();
  }

  if (state.view === 'pets') {
    await loadPetCatalog();
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

    if (result?.bosses) {
      state.bosses = result.bosses;
      state.bossConfig = result.config || state.bossConfig;
      state.noticeBoard = result.noticeBoard || state.noticeBoard;
    }

    showToast(result?.message || successMessage || '操作完成。');
    await refreshViewData();
    return result;
  } catch (error) {
    showToast(error.message, 'error');
    return null;
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
  const authAvatarButton = event.target.closest('[data-auth-avatar]');
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

  if (authAvatarButton) {
    state.authAvatar = authAvatarButton.dataset.authAvatar;
    localStorage.setItem('ctqAuthAvatar', state.authAvatar);
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
    if (state.busy) {
      return;
    }

    state.busy = true;
    try {
      const result = await api('/api/openBox', {
        method: 'POST',
        body: JSON.stringify({})
      });
      state.player = result.player;
      state.boxReveal = { reward: result.reward };
      renderShell();
      showToast(result.message);
      window.setTimeout(async () => {
        state.boxReveal = null;
        await refreshViewData();
      }, 2800);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      state.busy = false;
    }
    return;
  }

  if (action === 'update-avatar') {
    await runAction(() =>
      api('/api/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatar: actionButton.dataset.avatar })
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

  if (action === 'upgrade-item') {
    const inventoryId = actionButton.dataset.inventoryId;
    const mode = actionButton.dataset.upgradeMode || 'level';
    await runAction(() =>
      api('/api/upgradeItem', {
        method: 'POST',
        body: JSON.stringify({ inventoryId, mode })
      })
    );
    return;
  }

  if (action === 'adopt-pet') {
    await runAction(() =>
      api('/api/adoptPet', {
        method: 'POST',
        body: JSON.stringify({ petId: actionButton.dataset.petId })
      })
    );
    return;
  }

  if (action === 'feed-pet') {
    try {
      const data = await api('/api/petQuestion');
      state.petQuiz = {
        petId: actionButton.dataset.petId,
        question: data.question
      };
      renderShell();
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  if (action === 'cancel-pet-question') {
    state.petQuiz = null;
    renderShell();
    return;
  }

  if (action === 'answer-pet-question') {
    const quiz = state.petQuiz;
    const result = await runAction(() =>
      api('/api/feedPet', {
        method: 'POST',
        body: JSON.stringify({
          petInstanceId: quiz?.petId,
          questionId: quiz?.question?.id,
          answer: actionButton.dataset.answer
        })
      })
    );
    if (result) {
      state.petQuiz = null;
      renderShell();
    }
    return;
  }

  if (action === 'unlock-pet-slot') {
    await runAction(() =>
      api('/api/unlockPetSlot', {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'teacher-add-pet') {
    const playerId = actionButton.dataset.playerId;
    const petId = document.querySelector(`[data-teacher-pet-select="${playerId}"]`)?.value;
    await runAction(() =>
      api('/api/teacher/pets/add', {
        method: 'POST',
        body: JSON.stringify({ playerId, petId })
      })
    );
    return;
  }

  if (action === 'teacher-update-pet') {
    const playerId = actionButton.dataset.playerId;
    const petInstanceId = actionButton.dataset.petId;
    const level = document.querySelector(`[data-pet-level="${petInstanceId}"]`)?.value;
    const power = document.querySelector(`[data-pet-power="${petInstanceId}"]`)?.value;
    await runAction(() =>
      api('/api/teacher/pets/update', {
        method: 'POST',
        body: JSON.stringify({ playerId, petInstanceId, level, power })
      })
    );
    return;
  }

  if (action === 'join-boss') {
    await runAction(() =>
      api('/api/worldBoss/join', {
        method: 'POST',
        body: JSON.stringify({ bossId: actionButton.dataset.bossId })
      })
    );
    return;
  }

  if (action === 'reset-boss') {
    if (!window.confirm('確定要重置此挑戰嗎？目前參與名單與進度會重新開始。')) {
      return;
    }

    await runAction(() =>
      api('/api/worldBoss/reset', {
        method: 'POST',
        body: JSON.stringify({ slot: actionButton.dataset.bossSlot })
      })
    );
    return;
  }

  if (action === 'accept-trade' || action === 'decline-trade' || action === 'cancel-trade') {
    const tradeId = actionButton.dataset.tradeId;
    const counterInventoryId = document.querySelector(`[data-counter-trade="${tradeId}"]`)?.value;
    const endpointByAction = {
      'accept-trade': 'accept',
      'decline-trade': 'decline',
      'cancel-trade': 'cancel'
    };

    await runAction(() =>
      api(`/api/trades/${tradeId}/${endpointByAction[action]}`, {
        method: 'POST',
        body: JSON.stringify({ counterInventoryId })
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
      payload.avatar = state.authAvatar;
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

    await runAction(() =>
      api('/api/trades', {
        method: 'POST',
        body: JSON.stringify({
          offeredInventoryId: formData.get('offeredInventoryId'),
          toPlayerId: formData.get('toPlayerId')
        })
      })
    );
    return;
  }

  if (event.target.id === 'boss-config-form') {
    const formData = new FormData(event.target);

    await runAction(() =>
      api('/api/worldBoss/config', {
        method: 'POST',
        body: JSON.stringify({
          killCount: formData.get('killCount'),
          frontlineStep: formData.get('frontlineStep'),
          resetBosses: formData.get('resetBosses') === 'on'
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
