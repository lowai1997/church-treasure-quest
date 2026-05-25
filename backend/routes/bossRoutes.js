import express from 'express';
import BossBattle from '../models/BossBattle.js';
import BossConfig from '../models/BossConfig.js';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();

const configKey = 'hunt';
const activeBossCount = 3;
const bossKeyPrefix = 'hunt';

const bossNames = [
  '墮翼‧阿茲撒爾',
  '黎焰六翼者',
  '鎮魂墮星者',
  '逆序熾天使',
  '虚榮的羅‧薩列斯',
  '星墜之翼安提歐',
  '灰羽使徒瑪塔列',
  '光之墮歌者',
  '曠野殘翼',
  '結晶墮靈‧耶法寧',
  '索罕深淵獸',
  '漆黑提亞瑪之子',
  '無底裂鱗主',
  '以諾的暗影獸',
  '溺魂蠕主',
  '深潮吞喉者',
  '裂井之蛭母',
  '黑海回聲蟲',
  '地底潰腐者',
  '吞界深使',
  '詛咒之血‧該隱裔',
  '毒冠流放者',
  '紅印之民',
  '墓生荊靈',
  '荒原銹膚',
  '贖罪鎖徒',
  '苦悔之懺者',
  '破罪尖嘯者',
  '血泥覆面',
  '赦免的否決者',
  '高塔的食人子',
  '絕壁巨靈哈爾杜',
  '失名的高肩者',
  '廢都踐踏者',
  '混血破曉',
  '斷脈者安拉姆',
  '石膚暴君',
  '長夜的守門巨',
  '七目看守者',
  '塵封的葬山者',
  '烈焰囚徒撒列夫',
  '熔心之咒獸',
  '螺焰戰妖',
  '余燼刺胴',
  '灰爐諸王',
  '灰燒咆吼者',
  '赤熔蝕者',
  '火祀判官',
  '熾焰罪靈',
  '失衡火騎',
  '荒野的十角獸',
  '洪荒咆哮‧列班',
  '智焰猿',
  '瑪拿蛇王',
  '雛鳥使徒',
  '獅面鷲語',
  '海上獸帝貝赫摩特',
  '曠野鳴獸',
  '光牙蒼狼',
  '守約靈虎',
  '風中囈語者',
  '空殼囚靈',
  '以太書吏',
  '無面審訊者',
  '聖言殘燼',
  '失序福音者',
  '悔鳴唱詩靈',
  '微光傳道者',
  '聖域屍影',
  '混聲共鳴體',
  '方舟鐵偶',
  '六印機守',
  '審判尖塔機',
  '石錨警衛',
  '熔鐵傳令者',
  '虛榮之偶像兵',
  '聖鍊機咒師',
  '機神之瞳',
  '忠仿抄寫機',
  '熾爐審核者',
  '腐息之蕈王',
  '病脈寄母',
  '詛咒花使',
  '苦蒸皮囊',
  '瘴牙嚎獸',
  '弒菌之芽',
  '蠕角囚者',
  '黴霧潰盤',
  '吐毒侍僧',
  '毒羽狂者',
  '白馬審判者',
  '紅炎戰騎',
  '黑秤衡守',
  '蒼瘟使徒',
  '七號吹奏靈',
  '炎海號令者',
  '星墜審官',
  '金杯烈者',
  '無日主宰',
  '最後號角之影'
];

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const toNonNegativeInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const getBaseBossHp = () => toPositiveInteger(process.env.WORLD_BOSS_MAX_HP, 3_024_000_000);
const getSettleSeconds = () => toPositiveInteger(process.env.WORLD_BOSS_SETTLE_SECONDS, 10);
const battleKeyForSlot = (slot) => `${bossKeyPrefix}-${slot}`;

const getOrCreateConfig = async () => {
  const existingConfig = await BossConfig.findOne({ configKey });

  if (existingConfig) {
    return existingConfig;
  }

  try {
    return await BossConfig.create({ configKey });
  } catch (error) {
    if (error.code === 11000) {
      return BossConfig.findOne({ configKey });
    }

    throw error;
  }
};

const claimBossName = async () => {
  const config = await getOrCreateConfig();
  const bossName = bossNames[config.bossCursor % bossNames.length];
  config.bossCursor += 1;
  await config.save();
  return bossName;
};

const buildBossStats = (intensity) => {
  const normalizedIntensity = toPositiveInteger(intensity, 1);
  const maxHp = getBaseBossHp() * normalizedIntensity;
  return { maxHp, intensity: normalizedIntensity };
};

const spawnBoss = async (slot, config = null) => {
  const activeConfig = config || (await getOrCreateConfig());
  const now = new Date();
  const name = await claimBossName();
  const { maxHp, intensity } = buildBossStats(activeConfig.intensity);

  return BossBattle.findOneAndUpdate(
    { battleKey: battleKeyForSlot(slot) },
    {
      $set: {
        battleKey: battleKeyForSlot(slot),
        slot,
        name,
        intensity,
        maxHp,
        hp: maxHp,
        participants: [],
        startedAt: now,
        lastSettledAt: now,
        defeatedAt: null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const ensureActiveBosses = async () => {
  const config = await getOrCreateConfig();
  const bosses = [];

  for (let slot = 0; slot < activeBossCount; slot += 1) {
    let boss = await BossBattle.findOne({ battleKey: battleKeyForSlot(slot) });

    if (!boss) {
      boss = await spawnBoss(slot, config);
    }

    bosses.push(boss);
  }

  return { config, bosses };
};

const getParticipantIds = (boss) => {
  return [
    ...new Set(
      (boss.participants || [])
        .map((participant) => participant.player?.toString())
        .filter(Boolean)
    )
  ];
};

const loadParticipantPower = async (boss) => {
  const participantIds = getParticipantIds(boss);

  if (!participantIds.length) {
    return {
      totalPower: 0,
      participants: []
    };
  }

  const players = await Player.find({ _id: { $in: participantIds }, role: 'student' })
    .select('name power')
    .sort({ name: 1 });

  const participants = players.map((player) => ({
    _id: player._id.toString(),
    name: player.name,
    totalPower: Number(player.power || 0)
  }));

  return {
    totalPower: participants.reduce((total, player) => total + player.totalPower, 0),
    participants
  };
};

const settleBoss = async (boss, totalPower, { force = false } = {}) => {
  if (!boss || boss.defeatedAt) {
    return boss;
  }

  const now = new Date();
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - boss.lastSettledAt.getTime()) / 1000));

  if (elapsedSeconds <= 0) {
    return boss;
  }

  if (totalPower <= 0 && !force) {
    return boss;
  }

  const pendingDamage = elapsedSeconds * totalPower;
  const nextHp = Math.max(0, Number(boss.hp || 0) - pendingDamage);
  const shouldPersist = force || elapsedSeconds >= getSettleSeconds() || nextHp <= 0;

  if (!shouldPersist) {
    return boss;
  }

  const update = {
    hp: nextHp,
    lastSettledAt: now
  };

  if (nextHp <= 0) {
    update.defeatedAt = now;
  }

  const updatedBoss = await BossBattle.findOneAndUpdate(
    { _id: boss._id, lastSettledAt: boss.lastSettledAt, defeatedAt: null },
    { $set: update },
    { new: true }
  );

  return updatedBoss || BossBattle.findById(boss._id);
};

const rotateBossIfDefeated = async (boss, liveHp) => {
  if (!boss.defeatedAt && liveHp > 0) {
    return boss;
  }

  const claimed = await BossBattle.findOneAndUpdate(
    { _id: boss._id, defeatedAt: boss.defeatedAt },
    { $set: { defeatedAt: new Date() } },
    { new: true }
  );

  if (!claimed) {
    return BossBattle.findById(boss._id);
  }

  await BossConfig.updateOne({ configKey }, { $inc: { killCount: 1 } });
  return spawnBoss(boss.slot, await getOrCreateConfig());
};

const buildBossPayload = async (boss, currentUserId, { forceSettle = false } = {}) => {
  const powerSnapshot = await loadParticipantPower(boss);
  let settledBoss = await settleBoss(boss, powerSnapshot.totalPower, { force: forceSettle });
  const responseAt = new Date();
  const elapsedSeconds = settledBoss.defeatedAt
    ? 0
    : Math.max(0, Math.floor((responseAt.getTime() - settledBoss.lastSettledAt.getTime()) / 1000));
  const liveHp = Math.max(0, Number(settledBoss.hp || 0) - elapsedSeconds * powerSnapshot.totalPower);

  settledBoss = await rotateBossIfDefeated(settledBoss, liveHp);

  if (liveHp <= 0 || settledBoss.startedAt.getTime() !== boss.startedAt.getTime()) {
    return buildBossPayload(settledBoss, currentUserId);
  }

  const participantIds = new Set(powerSnapshot.participants.map((player) => player._id));

  return {
    _id: settledBoss._id.toString(),
    battleKey: settledBoss.battleKey,
    slot: settledBoss.slot,
    name: settledBoss.name,
    hp: liveHp,
    maxHp: settledBoss.maxHp,
    intensity: settledBoss.intensity,
    totalPower: powerSnapshot.totalPower,
    participantCount: powerSnapshot.participants.length,
    participants: powerSnapshot.participants,
    joined: currentUserId ? participantIds.has(currentUserId.toString()) : false,
    startedAt: settledBoss.startedAt.toISOString(),
    lastSettledAt: settledBoss.lastSettledAt.toISOString(),
    calculatedAt: responseAt.toISOString(),
    defeatedAt: settledBoss.defeatedAt ? settledBoss.defeatedAt.toISOString() : null,
    settleEverySeconds: getSettleSeconds()
  };
};

const buildStatusPayload = async (currentUserId) => {
  const { bosses } = await ensureActiveBosses();
  const bossPayloads = await Promise.all(bosses.map((boss) => buildBossPayload(boss, currentUserId)));
  const config = await getOrCreateConfig();

  return {
    bosses: bossPayloads.sort((left, right) => left.slot - right.slot),
    config: {
      killCount: config.killCount,
      intensity: config.intensity,
      baseHp: getBaseBossHp(),
      activeBossCount
    }
  };
};

router.get('/worldBoss/status', verifyToken, async (req, res, next) => {
  try {
    return res.json(await buildStatusPayload(req.user._id));
  } catch (error) {
    return next(error);
  }
});

router.post('/worldBoss/join', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const boss = await BossBattle.findOne({
      _id: req.body.bossId,
      battleKey: { $regex: `^${bossKeyPrefix}-` },
      defeatedAt: null
    });

    if (!boss) {
      return res.status(404).json({ message: '找不到可加入的討伐目標。' });
    }

    const payload = await buildBossPayload(boss, req.user._id, { forceSettle: true });

    await BossBattle.updateMany(
      { battleKey: { $regex: `^${bossKeyPrefix}-` }, _id: { $ne: boss._id } },
      { $pull: { participants: { player: req.user._id } } }
    );

    const refreshedBoss = await BossBattle.findById(boss._id);
    const joined = getParticipantIds(refreshedBoss).includes(req.user._id.toString());

    if (!joined) {
      refreshedBoss.participants.push({
        player: req.user._id,
        joinedAt: new Date()
      });
      refreshedBoss.lastSettledAt = new Date();
      await refreshedBoss.save();
    }

    return res.json({
      message: joined ? '你已經在此討伐戰鬥中。' : `已加入 ${payload.name} 的討伐。`,
      ...(await buildStatusPayload(req.user._id))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/worldBoss/reset', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const slot = req.body.slot === undefined ? null : toNonNegativeInteger(req.body.slot, null);
    const config = await getOrCreateConfig();

    if (slot === null) {
      await Promise.all(Array.from({ length: activeBossCount }, (_, index) => spawnBoss(index, config)));
    } else if (slot >= 0 && slot < activeBossCount) {
      await spawnBoss(slot, config);
    } else {
      return res.status(400).json({ message: '討伐位置不正確。' });
    }

    return res.json({
      message: slot === null ? '已重置全部討伐目標。' : '已重置此討伐目標。',
      ...(await buildStatusPayload(req.user._id))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/worldBoss/config', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const config = await getOrCreateConfig();

    if (req.body.killCount !== undefined) {
      config.killCount = toNonNegativeInteger(req.body.killCount, config.killCount);
    }

    if (req.body.intensity !== undefined) {
      config.intensity = toPositiveInteger(req.body.intensity, config.intensity);
    }

    await config.save();

    if (req.body.resetBosses) {
      await Promise.all(Array.from({ length: activeBossCount }, (_, index) => spawnBoss(index, config)));
    }

    return res.json({
      message: '討伐設定已更新。',
      ...(await buildStatusPayload(req.user._id))
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
