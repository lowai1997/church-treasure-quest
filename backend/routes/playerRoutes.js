import express from 'express';
import Item from '../models/Item.js';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { rarityConfig } from '../utils/seedItems.js';

const router = express.Router();
const mysteryBoxPrice = 50;

const slotConfig = {
  weapon: { label: '武器', limit: 2 },
  helmet: { label: '頭盔', limit: 1 },
  armor: { label: '胸甲', limit: 1 },
  pants: { label: '褲', limit: 1 },
  shoes: { label: '鞋', limit: 1 },
  accessory: { label: '裝飾品', limit: 2 }
};

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

const hashString = (value) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getDailyStoreItems = (items) => {
  const today = new Date().toISOString().slice(0, 10);
  return [...items]
    .sort((left, right) => {
      const leftHash = hashString(`${today}-${left._id.toString()}`);
      const rightHash = hashString(`${today}-${right._id.toString()}`);
      return leftHash - rightHash;
    })
    .slice(0, 5);
};

const chooseWeightedRarity = () => {
  const totalWeight = Object.values(rarityConfig).reduce((total, rarity) => total + rarity.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [rarity, config] of Object.entries(rarityConfig)) {
    roll -= config.weight;

    if (roll <= 0) {
      return rarity;
    }
  }

  return 'N';
};

const createInventoryItem = (item) => ({
  item: item._id,
  name: item.name,
  type: item.type,
  rarity: item.rarity,
  price: item.price,
  power: item.power
});

const ensurePlayerEquipment = async (player) => {
  const changed = player.ensureInventoryIds();
  player.recalculatePower();

  if (changed) {
    await player.save();
  }
};

router.get('/getItems', verifyToken, async (req, res, next) => {
  try {
    const allItems = await Item.find().sort({ rarity: 1, price: 1, name: 1 });
    const items = getDailyStoreItems(allItems);
    return res.json({
      items,
      refreshDate: new Date().toISOString().slice(0, 10)
    });
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

    const dailyItems = getDailyStoreItems(await Item.find());
    const isInDailyStore = dailyItems.some((dailyItem) => dailyItem._id.toString() === item._id.toString());

    if (!isInDailyStore) {
      return res.status(400).json({ message: '此裝備不在今日商店中，請明天再看看。' });
    }

    const player = await Player.findById(req.user._id);

    if (player.gold < item.price) {
      return res.status(400).json({ message: '金幣不足，無法購買。' });
    }

    player.gold -= item.price;
    player.items.push(createInventoryItem(item));
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
    const player = await Player.findById(req.user._id);

    if (player.gold < mysteryBoxPrice) {
      return res.status(400).json({ message: '金幣不足，無法開啟神秘盒。' });
    }

    const rarity = chooseWeightedRarity();
    const rewards = await Item.find({ rarity });

    if (!rewards.length) {
      return res.status(404).json({ message: '商店目前沒有可抽取的裝備。' });
    }

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    player.gold -= mysteryBoxPrice;
    player.items.push(createInventoryItem(reward));
    player.recalculatePower();
    await player.save();

    return res.json({
      message: `神秘盒開出了 ${reward.rarity} ${reward.name}。`,
      reward,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/equipItem', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const { inventoryId } = req.body;
    const player = await Player.findById(req.user._id);
    await ensurePlayerEquipment(player);

    const inventoryItem = player.items.find((item) => item.inventoryId === inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: '找不到此裝備。' });
    }

    const slot = typeToSlot[inventoryItem.type];

    if (!slot) {
      return res.status(400).json({ message: '此裝備類型無法穿戴。' });
    }

    const equippedIds = player.equipped[slot] || [];

    if (equippedIds.includes(inventoryId)) {
      return res.status(400).json({ message: '此裝備已經穿戴中。' });
    }

    if (equippedIds.length >= slotConfig[slot].limit) {
      return res.status(400).json({ message: `${slotConfig[slot].label} 已達穿戴上限。` });
    }

    player.equipped[slot] = [...equippedIds, inventoryId];
    player.recalculatePower();
    await player.save();

    return res.json({
      message: `已穿戴 ${inventoryItem.name}。`,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/unequipItem', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const { inventoryId } = req.body;
    const player = await Player.findById(req.user._id);
    await ensurePlayerEquipment(player);

    const inventoryItem = player.items.find((item) => item.inventoryId === inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: '找不到此裝備。' });
    }

    Object.keys(slotConfig).forEach((slot) => {
      player.equipped[slot] = (player.equipped[slot] || []).filter((id) => id !== inventoryId);
    });
    player.recalculatePower();
    await player.save();

    return res.json({
      message: `已卸下 ${inventoryItem.name}。`,
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
      }
    ]);

    return res.json({ rank });
  } catch (error) {
    return next(error);
  }
});

export default router;
