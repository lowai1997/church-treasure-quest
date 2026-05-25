import express from 'express';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();

const findStudent = async ({ playerId, name }) => {
  const query = playerId ? { _id: playerId } : { name: String(name || '').trim() };
  return Player.findOne({ ...query, role: 'student' });
};

const validateGoldAmount = (value, fieldName = '金幣') => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return { valid: false, message: `${fieldName} 必須是數字。` };
  }

  return { valid: true, amount: Math.floor(amount) };
};

router.get('/players', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const players = await Player.find({ role: 'student' }).sort({ name: 1 });

    await Promise.all(
      players.map(async (player) => {
        player.ensureInventoryIds();
        player.recalculatePower();
        await player.save();
      })
    );

    return res.json({
      players: players.map((player) => player.toSafeObject())
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/addGold', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const { playerId, name, amount } = req.body;

    const result = validateGoldAmount(amount, '新增金幣');

    if (!result.valid || result.amount <= 0) {
      return res.status(400).json({ message: '新增金幣必須是大於 0 的整數。' });
    }

    const player = await findStudent({ playerId, name });

    if (!player) {
      return res.status(404).json({ message: '找不到此團員玩家。' });
    }

    player.gold += result.amount;
    await player.save();

    return res.json({
      message: `已為 ${player.name} 新增 ${result.amount} 枚金幣。`,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/updateGold', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const { playerId, name, gold } = req.body;
    const result = validateGoldAmount(gold);

    if (!result.valid || result.amount < 0) {
      return res.status(400).json({ message: '金幣數量必須是 0 或正整數。' });
    }

    const player = await findStudent({ playerId, name });

    if (!player) {
      return res.status(404).json({ message: '找不到此團員玩家。' });
    }

    player.gold = result.amount;
    await player.save();

    return res.json({
      message: `已將 ${player.name} 的金幣更新為 ${result.amount}。`,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/removePlayer', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const playerId = req.body.playerId || req.query.playerId;
    const name = req.body.name || req.query.name;
    const player = await findStudent({ playerId, name });

    if (!player) {
      return res.status(404).json({ message: '找不到此團員玩家。' });
    }

    await player.deleteOne();

    return res.json({
      message: `已刪除玩家 ${player.name}。`
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
