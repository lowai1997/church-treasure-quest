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
  gearImageMap: {},
  bossImageMap: {},
  imageMapsLoaded: false,
  weeklyMissions: [],
  weeklyReports: [],
  weeklyMissionWeek: '',
  tradePlayers: [],
  incomingTrades: [],
  outgoingTrades: [],
  petCatalog: [],
  inventorySort: localStorage.getItem('ctqInventorySort') || 'rarity-desc',
  addGoldAmount: 100,
  boxReveal: null,
  petQuiz: null,
  avatarPickerOpen: false,
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
const rarityLabels = { N: '普通', R: '稀有', S: '超稀有', SS: '傳說', SSS: '神話' };
const avatarOptions = [
  { id: 'male-1', label: '星殿少年' },
  { id: 'male-2', label: '書卷少年' },
  { id: 'female-1', label: '羽光少女' },
  { id: 'female-2', label: '寶石少女' }
];

const emergencyDifficultyOptions = [
  { value: 1, label: '1 星光警戒' },
  { value: 2, label: '2 裂隙擾動' },
  { value: 3, label: '3 戰線危急' },
  { value: 4, label: '4 聖殿告急' },
  { value: 5, label: '5 終末攻勢' }
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

const assetImage = (src, alt = '', fallbackSrc = '') =>
  src
    ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" ${
        fallbackSrc ? `data-fallback-src="${escapeAttr(fallbackSrc)}"` : ''
      } onerror="if (this.dataset.fallbackSrc) { this.src = this.dataset.fallbackSrc; this.dataset.fallbackSrc = ''; } else { this.remove(); }" />`
    : '';

const avatarImageAssets = {
  'male-1': 'assets/icons/avatar-male-1.png',
  'male-2': 'assets/icons/avatar-male-2.png',
  'female-1': 'assets/icons/avatar-female-1.png',
  'female-2': 'assets/icons/avatar-female-2.png'
};

const gearImageAssets = {
  weapon: 'assets/icons/gear-weapon.png',
  helmet: 'assets/icons/gear-helmet.png',
  armor: 'assets/icons/gear-armor.png',
  pants: 'assets/icons/gear-pants.png',
  shoes: 'assets/icons/gear-shoes.png',
  accessory: 'assets/icons/gear-accessory.png'
};

const weaponImageAssets = [
  { pattern: /杖|書|法|聖|星|光|魔/, src: 'assets/icons/gear-weapon-staff.png' },
  { pattern: /弓|弩|矢/, src: 'assets/icons/gear-weapon-bow.png' },
  { pattern: /矛|槍|戟/, src: 'assets/icons/gear-weapon-spear.png' },
  { pattern: /斧/, src: 'assets/icons/gear-weapon-axe.png' },
  { pattern: /劍|刃|刀/, src: 'assets/icons/gear-weapon-sword.png' }
];

const bossImageAssets = [
  'assets/monsters/monster-1.png',
  'assets/monsters/monster-2.png',
  'assets/monsters/monster-3.png',
  'assets/monsters/monster-4.png',
  'assets/monsters/monster-5.png',
  'assets/monsters/monster-6.png'
];

const navImageAssets = {
  hunt: 'assets/ui/nav/nav-mission.png',
  shop: 'assets/ui/nav/nav-shop.png',
  equipment: 'assets/ui/nav/nav-equipment.png',
  upgrade: 'assets/ui/nav/nav-upgrade.png',
  pets: 'assets/ui/nav/nav-pets.png',
  boss: 'assets/ui/nav/nav-boss.png',
  rank: 'assets/ui/nav/nav-rank.png'
};

const avatarImageFor = (avatar) => avatarImageAssets[avatar] || avatarImageAssets['male-1'];

const gearImageFor = (type, name = '') => {
  const slotKey = typeToSlot[type] || type;

  if (slotKey === 'weapon') {
    const matchedWeapon = weaponImageAssets.find((item) => item.pattern.test(name));
    return {
      src: matchedWeapon?.src || gearImageAssets.weapon,
      fallbackSrc: matchedWeapon?.src ? gearImageAssets.weapon : ''
    };
  }

  return {
    src: gearImageAssets[slotKey] || '',
    fallbackSrc: ''
  };
};

const hashText = (value = '') =>
  String(value)
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);

const bossImageFor = (boss) => {
  if (!bossImageAssets.length) {
    return '';
  }

  const imageIndex = Math.abs(hashText(boss?.name || '') + Number(boss?.slot || 0)) % bossImageAssets.length;
  return bossImageAssets[imageIndex];
};

const customImageForName = (map, name = '') => map[String(name || '').trim()] || '';
const gearImageForItem = (item = {}) => customImageForName(state.gearImageMap, item.name);
const bossDisplayImageFor = (boss = {}) => customImageForName(state.bossImageMap, boss.name) || bossImageFor(boss);

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

const slotIcon = (type, name = '', imageUrl = '') => {
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

  const imageAsset = gearImageFor(type, name);

  return `
    <span class="asset-icon gear-asset">
      <span class="asset-fallback" aria-hidden="true">${icons[slotKey] || itemIcon()}</span>
      ${assetImage(imageUrl || imageAsset.src, '', imageUrl ? '' : imageAsset.fallbackSrc)}
    </span>
  `;
};

const avatarFallbackIcon = (avatar = 'male-1') => {
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

const avatarIcon = (avatar = 'male-1') => `
  <span class="asset-icon avatar-asset">
    <span class="asset-fallback" aria-hidden="true">${avatarFallbackIcon(avatar)}</span>
    ${assetImage(avatarImageFor(avatar))}
  </span>
`;

const playerAvatarIcon = (player = {}) => `
  <span class="asset-icon avatar-asset">
    <span class="asset-fallback" aria-hidden="true">${avatarFallbackIcon(player.avatar || 'male-1')}</span>
    ${assetImage(player.photoUrl || avatarImageFor(player.avatar || 'male-1'))}
  </span>
`;

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

const navIconFor = (view) => navImageAssets[view] || '';

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

const resizeImageFile = (file, { maxSize = 320, quality = 0.86 } = {}) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('無法讀取圖片。'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('圖片格式不支援。'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });

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
  state.weeklyMissions = [];
  state.weeklyReports = [];
  state.weeklyMissionWeek = '';
  state.tradePlayers = [];
  state.incomingTrades = [];
  state.outgoingTrades = [];
  state.petCatalog = [];
  state.avatarPickerOpen = false;
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
    <section class="app-shell ${state.view === 'shop' && state.player?.role === 'student' ? 'shop-app-shell' : ''}">
      <header class="topbar">
        <div class="profile-plaque">
          <button
            class="profile-avatar avatar-trigger"
            type="button"
            data-action="open-avatar-picker"
            aria-label="選擇角色頭像"
            aria-haspopup="dialog"
            aria-expanded="${state.avatarPickerOpen ? 'true' : 'false'}"
          >
            ${playerAvatarIcon(state.player)}
          </button>
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

      <nav class="bottom-nav ${state.player.role === 'student' ? 'ornate-nav' : ''}" aria-label="主要導覽">
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
      ${state.avatarPickerOpen ? renderAvatarModal() : ''}
    </section>
  `;
  syncBossTimers();
};

const navButton = (view, label) => {
  const iconAsset = navIconFor(view);

  return `
  <button class="nav-button ${state.view === view ? 'active' : ''}" type="button" data-view="${view}" aria-current="${state.view === view ? 'page' : 'false'}" aria-label="${escapeAttr(label)}">
    <span class="nav-icon" aria-hidden="true">${
      iconAsset ? `<img src="${escapeAttr(iconAsset)}" alt="" loading="lazy" />` : navSymbol(view)
    }</span>
    <span class="nav-label">${label}</span>
  </button>
`;
};

const renderAvatarPicker = (selectedAvatar, { mode = 'auth' } = {}) => `
  <div class="avatar-picker" aria-label="選擇角色頭像">
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

const renderAvatarModal = () => `
  <div class="modal-backdrop avatar-modal-backdrop" role="dialog" aria-modal="true" aria-label="選擇角色頭像">
    <section class="avatar-modal card">
      <div class="card-header">
        <div>
          <h3>選擇角色頭像</h3>
          <p>點選左上角頭像可隨時更換代表圖示。</p>
        </div>
        <button class="icon-button" type="button" data-action="close-avatar-picker" aria-label="關閉">關閉</button>
      </div>
      ${renderAvatarPicker(state.player.avatar || 'male-1', { mode: 'profile' })}
      <div class="photo-upload-box">
        <label class="mini-button file-button">
          上傳個人照片
          <input type="file" accept="image/png,image/jpeg,image/webp" data-profile-photo-input />
        </label>
        <button class="mini-button danger-mini" type="button" data-action="remove-profile-photo" ${state.player.photoUrl ? '' : 'disabled'}>移除照片</button>
        <p>照片會縮成小頭像並顯示在左上角與排行榜。</p>
      </div>
    </section>
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
          <div class="item-icon">${slotIcon(reward.type, reward.name, gearImageForItem(reward))}</div>
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
            <p>答錯也會消耗 ${formatNumber(feedPetCost)} 金幣與本次升級機會。</p>
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
    <section class="shop-screen">
      <section class="shop-hero" aria-label="星光商店">
        <img class="shopkeeper-art" src="assets/ui/shopkeeper.png" alt="星光商店店員" />
        <div class="shop-dialog">
          <span>歡迎光臨星光商店 ✦</span>
          <strong>今天也為你準備了新的冒險裝備。</strong>
        </div>
      </section>

      <section class="shop-goods-panel" aria-label="今日商品">
        <div class="shop-section-title">
          <span>今日商品</span>
          <small>${state.storeDate ? `刷新日期 ${state.storeDate}` : '每日自動刷新 5 件裝備'}</small>
        </div>
        <div class="shop-items-rail">
          ${
            state.items.length
              ? state.items.map(renderShopItemCard).join('')
              : '<div class="empty-card">商店尚未建立裝備，請先執行 seed 或等待伺服器初始化。</div>'
          }
        </div>
      </section>

      <section class="shop-chest-panel" aria-label="神秘寶箱">
        <img class="shop-chest-art" src="assets/ui/treasure-chest.png" alt="神秘寶箱" />
        <div class="shop-chest-copy">
          <div class="shop-section-title">
            <span>神秘寶箱</span>
            <small>每次隨機獲得一件裝備或珍稀道具</small>
          </div>
          <button class="shop-chest-button" type="button" data-action="open-box">
            <span class="shop-price">
              <img src="assets/ui/star-currency.png" alt="星石" />
              ${formatNumber(mysteryBoxPrice)}
            </span>
            <strong>開啟 1 次</strong>
          </button>
        </div>
      </section>
    </section>
  `;
};

const renderShopItemCard = (item) => {
  const canBuy = Number(state.player.gold || 0) >= Number(item.price || 0);

  return `
    <article class="shop-item-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="shop-item-ornament" aria-hidden="true"></div>
      <div class="shop-item-icon">${slotIcon(item.type, item.name, gearImageForItem(item))}</div>
      <h3>${itemNameWithUpgrade(item)}</h3>
      <p>${escapeHtml(item.rarity || 'N')} · ${escapeHtml(item.type)} · 戰力 +${formatNumber(item.power)}</p>
      <button class="shop-buy-button" type="button" data-action="buy-item" data-item-id="${escapeAttr(item._id)}" ${canBuy ? '' : 'disabled'}>
        <span class="shop-price">
          <img src="assets/ui/star-currency.png" alt="星石" />
          ${formatNumber(item.price)}
        </span>
        <span>${canBuy ? '購買' : '不足'}</span>
      </button>
    </article>
  `;
};

const renderItemCard = (item) => {
  const canBuy = Number(state.player.gold || 0) >= Number(item.price || 0);

  return `
    <article class="item-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="item-icon">${slotIcon(item.type, item.name, gearImageForItem(item))}</div>
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
      <div class="item-icon">${slotIcon(item.type, item.name, gearImageForItem(item))}</div>
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

const renderEmergencyTaskControls = () => `
  <div class="admin-subsection">
    <strong>緊急任務</strong>
    <label class="check-row">
      <input name="emergencyTaskActive" type="checkbox" ${state.bossConfig?.emergencyTask?.active ? 'checked' : ''} />
      <span>發布並顯示緊急任務</span>
    </label>
    <div class="field">
      <label for="emergencyTaskTitle">任務名稱</label>
      <input id="emergencyTaskTitle" name="emergencyTaskTitle" maxlength="60" value="${escapeAttr(state.bossConfig?.emergencyTask?.title || '緊急守護任務')}" />
    </div>
    <div class="field">
      <label for="emergencyTaskDifficulty">任務難度</label>
      <select id="emergencyTaskDifficulty" name="emergencyTaskDifficulty">
        ${emergencyDifficultyOptions
          .map(
            (option) =>
              `<option value="${option.value}" ${Number(state.bossConfig?.emergencyTask?.difficulty || 1) === option.value ? 'selected' : ''}>${option.label}</option>`
          )
          .join('')}
      </select>
    </div>
    <div class="field">
      <label for="emergencyTaskReward">完成獎勵 Token（金幣）</label>
      <input id="emergencyTaskReward" name="emergencyTaskReward" type="number" min="0" step="10" value="${Number(state.bossConfig?.emergencyTask?.reward || 500)}" />
    </div>
  </div>
`;

const emergencyTaskPayloadFromForm = (formData) => ({
  active: formData.get('emergencyTaskActive') === 'on',
  title: formData.get('emergencyTaskTitle'),
  difficulty: formData.get('emergencyTaskDifficulty'),
  reward: formData.get('emergencyTaskReward')
});

const weeklyStatusLabel = (status) =>
  ({
    pending: '等待導師審核',
    approved: '已完成並發獎',
    rejected: '未通過'
  })[status] || '未回報';

const renderStudentWeeklyMissions = () => `
  <section class="view-title">
    <h2>每週任務</h2>
    <p>完成後回報給導師審核；每個任務每週只能完成一次。</p>
  </section>

  <section class="stats-grid">
    <div class="stat-card"><span>本週</span><strong>${escapeHtml(state.weeklyMissionWeek || '未載入')}</strong></div>
    <div class="stat-card"><span>任務數</span><strong>${formatNumber(state.weeklyMissions.length)}</strong></div>
    <div class="stat-card"><span>已回報</span><strong>${formatNumber(state.weeklyMissions.filter((mission) => mission.myReport).length)}</strong></div>
  </section>

  <section class="items-grid weekly-mission-list">
    ${
      state.weeklyMissions.length
        ? state.weeklyMissions.map(renderStudentWeeklyMissionCard).join('')
        : '<div class="empty-card">導師尚未發布每週任務。</div>'
    }
  </section>
`;

const renderStudentWeeklyMissionCard = (mission) => {
  const report = mission.myReport;

  return `
    <article class="card weekly-mission-card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(mission.title)}</h3>
          <p>${escapeHtml(mission.content)}</p>
        </div>
        <span class="price-pill">${formatNumber(mission.reward)} Token</span>
      </div>
      ${
        report
          ? `
            <div class="notice-row contribution-row">
              <strong>${weeklyStatusLabel(report.status)}</strong>
              <span>${report.reportedAt ? new Date(report.reportedAt).toLocaleString('zh-Hant-HK') : ''}${report.claimedAt ? ` · 已領取 ${formatNumber(report.reward)} Token` : ''}</span>
            </div>
          `
          : `
            <form class="weekly-report-form" data-weekly-report-form="${escapeAttr(mission._id)}">
              <button class="primary-button" type="submit">回報完成</button>
            </form>
          `
      }
    </article>
  `;
};

const renderTeacherWeeklyMissionManager = () => `
  <section class="card">
    <div class="card-header">
      <div>
        <h3>每週任務</h3>
        <p>任務會每週重複；同一團員每週只可回報一次，導師審核通過後會自動發獎。</p>
      </div>
      <span class="price-pill">${escapeHtml(state.weeklyMissionWeek || '本週')}</span>
    </div>
    <form id="weekly-mission-create-form" class="admin-controls weekly-mission-editor">
      <div class="field">
        <label for="weeklyMissionTitle">任務標題</label>
        <input id="weeklyMissionTitle" name="title" maxlength="80" placeholder="例如：本週背誦金句" required />
      </div>
      <div class="field">
        <label for="weeklyMissionContent">任務內容</label>
        <textarea id="weeklyMissionContent" name="content" rows="3" maxlength="800" placeholder="輸入學生需要完成的內容" required></textarea>
      </div>
      <div class="field">
        <label for="weeklyMissionReward">獎勵 Token（金幣）</label>
        <input id="weeklyMissionReward" name="reward" type="number" min="0" step="10" value="100" />
      </div>
      <label class="check-row">
        <input name="active" type="checkbox" checked />
        <span>啟用任務</span>
      </label>
      <button class="primary-button" type="submit">新增每週任務</button>
    </form>
    <div class="weekly-mission-list">
      ${
        state.weeklyMissions.length
          ? state.weeklyMissions.map(renderTeacherWeeklyMissionCard).join('')
          : '<div class="empty-card">尚未建立每週任務。</div>'
      }
    </div>
  </section>

  <section class="card">
    <div class="card-header">
      <div>
        <h3>本週回報</h3>
        <p>通過後會自動把任務獎勵發到團員帳戶。</p>
      </div>
    </div>
    <div class="notice-list">
      ${
        state.weeklyReports.length
          ? state.weeklyReports.map(renderWeeklyReportRow).join('')
          : '<div class="empty-card">本週尚未有團員回報。</div>'
      }
    </div>
  </section>
`;

const renderTeacherWeeklyMissionCard = (mission) => `
  <form class="managed-item weekly-mission-edit" data-weekly-edit-form="${escapeAttr(mission._id)}">
    <div class="field">
      <label for="weekly-title-${escapeAttr(mission._id)}">標題</label>
      <input id="weekly-title-${escapeAttr(mission._id)}" name="title" maxlength="80" value="${escapeAttr(mission.title)}" />
    </div>
    <div class="field">
      <label for="weekly-content-${escapeAttr(mission._id)}">內容</label>
      <textarea id="weekly-content-${escapeAttr(mission._id)}" name="content" rows="3" maxlength="800">${escapeHtml(mission.content)}</textarea>
    </div>
    <div class="field">
      <label for="weekly-reward-${escapeAttr(mission._id)}">獎勵</label>
      <input id="weekly-reward-${escapeAttr(mission._id)}" name="reward" type="number" min="0" step="10" value="${Number(mission.reward || 0)}" />
    </div>
    <label class="check-row">
      <input name="active" type="checkbox" ${mission.active ? 'checked' : ''} />
      <span>${mission.active ? '啟用中' : '已停用'}</span>
    </label>
    <div class="item-actions">
      <button class="mini-button" type="submit">儲存任務</button>
      <button class="mini-button danger-mini" type="button" data-action="delete-weekly-mission" data-mission-id="${escapeAttr(mission._id)}" data-mission-title="${escapeAttr(mission.title)}">移除任務</button>
    </div>
  </form>
`;

const renderWeeklyReportRow = (report) => `
  <div class="notice-row ${report.status === 'approved' ? 'contribution-row' : report.status === 'rejected' ? 'danger-row' : ''}">
    <strong>${escapeHtml(report.playerName)} · ${escapeHtml(report.missionTitle || '每週任務')}</strong>
    <span>${weeklyStatusLabel(report.status)} · 獎勵 ${formatNumber(report.reward)} Token</span>
    ${
      report.status === 'pending'
        ? `
          <div class="item-actions">
            <button class="mini-button" type="button" data-action="approve-weekly-report" data-report-id="${escapeAttr(report._id)}">通過並發獎</button>
            <button class="mini-button danger-mini" type="button" data-action="reject-weekly-report" data-report-id="${escapeAttr(report._id)}">未通過</button>
          </div>
        `
        : ''
    }
  </div>
`;

const renderHunt = () => {
  if (state.player.role !== 'teacher') {
    return renderStudentWeeklyMissions();
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

    ${renderTeacherWeeklyMissionManager()}

    <section class="card">
      <div class="card-header">
        <div>
          <h3>發布緊急任務</h3>
          <p>導師可設定任務難度，團員會在挑戰頁看到目前任務。</p>
        </div>
      </div>
      <form id="emergency-task-form" class="admin-controls">
        ${renderEmergencyTaskControls()}
        <button class="primary-button" type="submit">儲存緊急任務</button>
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

const emergencyDifficultyLabel = (difficulty) => {
  const normalized = Math.max(1, Math.min(5, Number(difficulty || 1)));
  return emergencyDifficultyOptions.find((item) => item.value === normalized)?.label || emergencyDifficultyOptions[0].label;
};

const renderEmergencyTask = () => {
  const task = state.bossConfig?.emergencyTask;

  if (!task?.active) {
    return '';
  }

  return `
    <section class="card emergency-card">
      <div class="card-header">
        <div>
          <h3>緊急任務</h3>
          <p>導師已發布臨時任務，請優先協助守住星光戰線。</p>
        </div>
        <span class="price-pill">${escapeHtml(emergencyDifficultyLabel(task.difficulty))}</span>
      </div>
      <div class="emergency-task">
        <strong>${escapeHtml(task.title || '緊急守護任務')}</strong>
        <span>完成獎勵 ${formatNumber(task.reward || 0)} Token（金幣）</span>
        ${task.issuedAt ? `<small>發布時間 ${new Date(task.issuedAt).toLocaleString('zh-Hant-HK')}</small>` : ''}
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

    ${renderEmergencyTask()}

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
              ${renderEmergencyTaskControls()}
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
  const estimate = getBossCompletionEstimate(boss);
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
      <div class="boss-portrait">
        <div class="boss-portrait-fallback" aria-hidden="true">${crestIcon()}</div>
        ${assetImage(bossDisplayImageFor(boss), boss.name)}
      </div>
      <div class="boss-health" aria-label="挑戰進度">
        <div class="boss-health-fill" data-boss-hp-bar="${escapeAttr(boss._id)}" style="width: ${bossHpPercent(boss)}%"></div>
      </div>
      <div class="boss-health-row">
        <strong>${defeated ? '討伐成功' : '討伐進度'}</strong>
        <span>${defeated ? '準備下一個 Boss' : '團員戰力會持續推進進度'}</span>
      </div>
      <div class="boss-detail-grid">
        <div class="boss-health-row">
          <strong>Boss 血量</strong>
          <span><span data-boss-hp="${escapeAttr(boss._id)}">${formatNumber(hp)}</span> / ${formatNumber(boss.maxHp)}</span>
        </div>
        <div class="boss-health-row">
          <strong>預計完成</strong>
          <span data-boss-estimate="${escapeAttr(boss._id)}">預計完成 ${estimate.label}</span>
        </div>
        <div class="boss-health-row">
          <strong>期限</strong>
          <span><span data-boss-deadline="${escapeAttr(boss._id)}">剩餘 ${formatDuration(timeLeft)}</span> · ${boss.deadlineAt ? new Date(boss.deadlineAt).toLocaleString('zh-Hant-HK') : '未設定'}</span>
        </div>
        <div class="boss-health-row">
          <strong>判斷</strong>
          <span data-boss-estimate-status="${escapeAttr(boss._id)}" class="${estimate.willMissDeadline ? 'danger-text' : ''}">${estimate.detail}</span>
        </div>
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
      <p>每次升級消耗 ${formatNumber(upgradeCost)} 金幣。成功後裝備 +1，戰力 +${formatNumber(upgradePowerGain)}；成功率會隨等級逐步下降。</p>
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

  return `
    <article class="item-card upgrade-card" data-rarity="${escapeAttr(item.rarity || 'N')}">
      <div class="item-icon">${slotIcon(item.type, item.name, gearImageForItem(item))}</div>
      <div class="item-body">
        <h3>${itemNameWithUpgrade(item, { alwaysShow: true })}</h3>
        <div class="item-meta">
          <span>${escapeHtml(item.rarity || 'N')}</span>
          <span>戰力 ${formatNumber(item.power)}</span>
          <span>成功率 ${maxed ? '已滿' : `${formatNumber(getUpgradeSuccessRate(item))}%`}</span>
          <span>費用 ${formatNumber(upgradeCost)}</span>
        </div>
        <div class="item-actions">
          <button class="mini-button" type="button" data-action="upgrade-item" data-inventory-id="${escapeAttr(item.inventoryId)}" ${maxed || !canAfford ? 'disabled' : ''}>${maxed ? `已 +${formatNumber(maxUpgradeLevel)}` : canAfford ? '裝備 +1' : '金幣不足'}</button>
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
      <p>寵物戰力會加入總戰力。每次升級前需要答對一題聖經問題；答錯會消耗 ${formatNumber(feedPetCost)} 金幣與本次升級機會，答對則提升 ${formatNumber(petPowerGain)} 戰力。</p>
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
                    <div class="rank-avatar">${playerAvatarIcon(player)}</div>
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
                    <div class="rank-avatar">${playerAvatarIcon(player)}</div>
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

const loadJsonAsset = async (path) => {
  try {
    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
      return {};
    }

    return await response.json();
  } catch (error) {
    return {};
  }
};

const loadImageMaps = async () => {
  if (state.imageMapsLoaded) {
    return;
  }

  const [gearImageMap, bossImageMap] = await Promise.all([
    loadJsonAsset('assets/custom/gear-images.json'),
    loadJsonAsset('assets/custom/boss-images.json')
  ]);

  state.gearImageMap = gearImageMap && typeof gearImageMap === 'object' ? gearImageMap : {};
  state.bossImageMap = bossImageMap && typeof bossImageMap === 'object' ? bossImageMap : {};
  state.imageMapsLoaded = true;
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

const loadWeeklyMissions = async () => {
  const data = await api('/api/weeklyMissions');
  state.weeklyMissions = data.missions || [];
  state.weeklyReports = data.reports || [];
  state.weeklyMissionWeek = data.weekKey || '';
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
  await loadImageMaps();

  if (state.view === 'shop') {
    await loadItems();
  }

  if (state.view === 'rank') {
    await loadRank();
  }

  if (state.view === 'hunt' || state.view === 'players') {
    await loadPlayers();
  }

  if (state.view === 'hunt') {
    await loadWeeklyMissions();
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

  if (state.view === 'boss' || state.view === 'hunt') {
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
  const profilePhotoInput = event.target.closest('[data-profile-photo-input]');

  if (profilePhotoInput) {
    const file = profilePhotoInput.files?.[0];

    if (!file) {
      return;
    }

    runAction(async () => {
      const imageUrl = await resizeImageFile(file);
      return api('/api/profilePhoto', {
        method: 'POST',
        body: JSON.stringify({ imageUrl })
      });
    });
    return;
  }

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

  if (action === 'open-avatar-picker') {
    state.avatarPickerOpen = true;
    renderShell();
    return;
  }

  if (action === 'close-avatar-picker') {
    state.avatarPickerOpen = false;
    renderShell();
    return;
  }

  if (action === 'remove-profile-photo') {
    await runAction(() =>
      api('/api/profilePhoto', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: '' })
      })
    );
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
    state.avatarPickerOpen = false;
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
    await runAction(() =>
      api('/api/upgradeItem', {
        method: 'POST',
        body: JSON.stringify({ inventoryId })
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

  if (action === 'approve-weekly-report' || action === 'reject-weekly-report') {
    const reportId = actionButton.dataset.reportId;
    const endpoint = action === 'approve-weekly-report' ? 'approve' : 'reject';

    await runAction(() =>
      api(`/api/weeklyMissionReports/${reportId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
    return;
  }

  if (action === 'delete-weekly-mission') {
    const missionId = actionButton.dataset.missionId;
    const missionTitle = actionButton.dataset.missionTitle || '每週任務';

    if (!window.confirm(`確定要移除每週任務「${missionTitle}」嗎？相關回報也會一併移除。`)) {
      return;
    }

    await runAction(() =>
      api(`/api/weeklyMissions/${missionId}`, {
        method: 'DELETE',
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

  if (event.target.id === 'weekly-mission-create-form') {
    const formData = new FormData(event.target);

    await runAction(() =>
      api('/api/weeklyMissions', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          content: formData.get('content'),
          reward: formData.get('reward'),
          active: formData.get('active') === 'on'
        })
      })
    );
    event.target.reset();
    return;
  }

  const weeklyEditForm = event.target.closest('[data-weekly-edit-form]');

  if (weeklyEditForm) {
    const formData = new FormData(weeklyEditForm);

    await runAction(() =>
      api(`/api/weeklyMissions/${weeklyEditForm.dataset.weeklyEditForm}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: formData.get('title'),
          content: formData.get('content'),
          reward: formData.get('reward'),
          active: formData.get('active') === 'on'
        })
      })
    );
    return;
  }

  const weeklyReportForm = event.target.closest('[data-weekly-report-form]');

  if (weeklyReportForm) {
    await runAction(() =>
      api(`/api/weeklyMissions/${weeklyReportForm.dataset.weeklyReportForm}/report`, {
        method: 'POST',
        body: JSON.stringify({})
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
          resetBosses: formData.get('resetBosses') === 'on',
          emergencyTask: emergencyTaskPayloadFromForm(formData)
        })
      })
    );
    return;
  }

  if (event.target.id === 'emergency-task-form') {
    const formData = new FormData(event.target);

    await runAction(() =>
      api('/api/worldBoss/config', {
        method: 'POST',
        body: JSON.stringify({
          emergencyTask: emergencyTaskPayloadFromForm(formData)
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
