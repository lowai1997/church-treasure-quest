import express from 'express';
import Item from '../models/Item.js';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/getItems', verifyToken, async (req, res, next) => {
  try {
    const items = await Item.find().sort({ price: 1, power: -1 });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/buyItem', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const { itemId } = req.body;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: '找不到此裝備。' });
    }

    const player = await Player.findById(req.user._id);

    if (player.gold < item.price) {
      return res.status(400).json({ message: '金幣不足，無法購買。' });
    }

    player.gold -= item.price;
    player.items.push({
      item: item._id,
      name: item.name,
      type: item.type,
      price: item.price,
      power: item.power
    });
    player.recalculatePower();
    await player.save();

    return res.json({
      message: `成功購買 ${item.name}。`,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/openBox', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const boxPrice = Number(process.env.BOX_PRICE || 1000);
    const player = await Player.findById(req.user._id);

    if (player.gold < boxPrice) {
      return res.status(400).json({ message: '金幣不足，無法開啟神秘盒。' });
    }

    const [reward] = await Item.aggregate([{ $sample: { size: 1 } }]);

    if (!reward) {
      return res.status(404).json({ message: '商店目前沒有可抽取的裝備。' });
    }

    player.gold -= boxPrice;
    player.items.push({
      item: reward._id,
      name: reward.name,
      type: reward.type,
      price: reward.price,
      power: reward.power
    });
    player.recalculatePower();
    await player.save();

    return res.json({
      message: `神秘盒開出了 ${reward.name}。`,
      reward,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/getRank', verifyToken, async (req, res, next) => {
  try {
    const rank = await Player.aggregate([
      { $match: { role: 'student' } },
      {
        $addFields: {
          totalPower: { $add: ['$gold', '$power'] },
          itemCount: { $size: '$items' }
        }
      },
      { $sort: { totalPower: -1, power: -1, gold: -1, name: 1 } },
      {
        $project: {
          password: 0,
          __v: 0,
          items: 0
        }
      },
      { $limit: 50 }
    ]);

    return res.json({ rank });
  } catch (error) {
    return next(error);
  }
});

export default router;
