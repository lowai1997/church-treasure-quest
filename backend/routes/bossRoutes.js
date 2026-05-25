import express from 'express';
import BossBattle from '../models/BossBattle.js';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();

const battleKey = 'world';

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getDefaultBossHp = () => toPositiveInteger(process.env.WORLD_BOSS_MAX_HP, 2_000_000);
const getSettleSeconds = () => toPositiveInteger(process.env.WORLD_BOSS_SETTLE_SECONDS, 10);

const getOrCreateBoss = async () => {
  const existingBoss = await BossBattle.findOne({ battleKey });

  if (existingBoss) {
    return existingBoss;
  }

  const now = new Date();
  const maxHp = getDefaultBossHp();

  try {
    return await BossBattle.create({
      battleKey,
      maxHp,
      hp: maxHp,
      startedAt: now,
      lastSettledAt: now
    });
  } catch (error) {
    if (error.code === 11000) {
      return BossBattle.findOne({ battleKey });
    }

    throw error;
  }
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

const buildBossPayload = async (boss, currentUserId, { forceSettle = false } = {}) => {
  const powerSnapshot = await loadParticipantPower(boss);
  const settledBoss = await settleBoss(boss, powerSnapshot.totalPower, { force: forceSettle });
  const responseAt = new Date();
  const elapsedSeconds = settledBoss.defeatedAt
    ? 0
    : Math.max(0, Math.floor((responseAt.getTime() - settledBoss.lastSettledAt.getTime()) / 1000));
  const liveHp = Math.max(0, Number(settledBoss.hp || 0) - elapsedSeconds * powerSnapshot.totalPower);
  const participantIds = new Set(powerSnapshot.participants.map((player) => player._id));

  return {
    _id: settledBoss._id.toString(),
    name: settledBoss.name,
    hp: liveHp,
    maxHp: settledBoss.maxHp,
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

router.get('/worldBoss/status', verifyToken, async (req, res, next) => {
  try {
    const boss = await getOrCreateBoss();
    const payload = await buildBossPayload(boss, req.user._id);

    return res.json({ boss: payload });
  } catch (error) {
    return next(error);
  }
});

router.post('/worldBoss/join', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    let boss = await getOrCreateBoss();
    let payload = await buildBossPayload(boss, req.user._id, { forceSettle: true });

    if (payload.defeatedAt || payload.hp <= 0) {
      return res.status(400).json({ message: '世界怪獸已被擊敗，請等待導師重置新的戰鬥。' });
    }

    boss = await BossBattle.findOne({ battleKey });
    const joined = getParticipantIds(boss).includes(req.user._id.toString());

    if (!joined) {
      boss.participants.push({
        player: req.user._id,
        joinedAt: new Date()
      });
      boss.lastSettledAt = new Date();
      await boss.save();
    }

    payload = await buildBossPayload(boss, req.user._id);

    return res.json({
      message: joined ? '你已經在世界怪獸戰鬥中。' : '已加入世界怪獸戰鬥。',
      boss: payload
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/worldBoss/reset', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const now = new Date();
    const maxHp = toPositiveInteger(req.body.maxHp, getDefaultBossHp());
    const boss = await BossBattle.findOneAndUpdate(
      { battleKey },
      {
        $set: {
          name: '世界怪獸',
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
    const payload = await buildBossPayload(boss, req.user._id);

    return res.json({
      message: '世界怪獸戰鬥已重置。',
      boss: payload
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
