import express from 'express';
import Item from '../models/Item.js';
import Player from '../models/Player.js';
import TradeOffer from '../models/TradeOffer.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { rarityConfig } from '../utils/seedItems.js';

const router = express.Router();
const mysteryBoxPrice = 50;
const gearSellRate = 0.5;
const lowRaritySellValues = {
  N: 20,
  R: 40
};

const slotConfig = {
  weapon: { label: '武器', limit: 2 },
  helmet: { label: '頭盔', limit: 1 },
  armor: { label: '胸甲', limit: 1 },
  pants: { label: '褲', limit: 1 },
  shoes: { label: '鞋', limit: 1 },
  accessory: { label: '裝飾品', limit: 2 }
};

const getTargetPlayer = async (req) => {
  if (req.user.role === 'teacher') {
    const playerId = req.body.playerId;

    if (!playerId) {
      return null;
    }

    return Player.findOne({ _id: playerId, role: 'student' });
  }

  if (req.user.role === 'student') {
    return Player.findById(req.user._id);
  }

  return null;
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

const createTradeItemSnapshot = (item) => ({
  inventoryId: item.inventoryId,
  name: item.name,
  type: item.type,
  rarity: item.rarity,
  price: item.price,
  power: item.power
});

const getGearSellValue = (item) => {
  const fixedValue = lowRaritySellValues[item.rarity];

  if (fixedValue !== undefined) {
    return fixedValue;
  }

  return Math.max(0, Math.floor(Number(item.price || 0) * gearSellRate));
};

const unequipInventoryId = (player, inventoryId) => {
  Object.keys(slotConfig).forEach((slot) => {
    player.equipped[slot] = (player.equipped[slot] || []).filter((id) => id !== inventoryId);
  });
};

const ensurePlayerEquipment = async (player) => {
  const changed = player.ensureInventoryIds();
  player.recalculatePower();

  if (changed) {
    await player.save();
  }
};

const publicTradePlayer = (player) => ({
  _id: player._id.toString(),
  name: player.name,
  items: (player.items || []).map(createTradeItemSnapshot)
});

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

router.post('/sellItem', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const { inventoryId } = req.body;
    const player = await Player.findById(req.user._id);
    await ensurePlayerEquipment(player);

    const inventoryItem = player.items.find((item) => item.inventoryId === inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: '找不到此裝備。' });
    }

    const sellValue = getGearSellValue(inventoryItem);

    unequipInventoryId(player, inventoryId);
    player.items = player.items.filter((item) => item.inventoryId !== inventoryId);
    player.gold += sellValue;
    player.recalculatePower();
    await player.save();

    await TradeOffer.updateMany(
      {
        status: 'pending',
        $or: [{ offeredInventoryId: inventoryId }, { requestedInventoryId: inventoryId }]
      },
      {
        $set: {
          status: 'cancelled',
          resolvedAt: new Date()
        }
      }
    );

    return res.json({
      message: `已賣出 ${inventoryItem.name}，獲得 ${sellValue} 金幣。`,
      player: player.toSafeObject(),
      sellValue
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/equipItem', verifyToken, async (req, res, next) => {
  try {
    const { inventoryId } = req.body;
    const player = await getTargetPlayer(req);

    if (!player) {
      return res.status(404).json({ message: '找不到此團員玩家。' });
    }

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

    const responsePlayerKey = req.user.role === 'teacher' ? 'managedPlayer' : 'player';

    return res.json({
      message: `已穿戴 ${inventoryItem.name}。`,
      [responsePlayerKey]: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/unequipItem', verifyToken, async (req, res, next) => {
  try {
    const { inventoryId } = req.body;
    const player = await getTargetPlayer(req);

    if (!player) {
      return res.status(404).json({ message: '找不到此團員玩家。' });
    }

    await ensurePlayerEquipment(player);

    const inventoryItem = player.items.find((item) => item.inventoryId === inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: '找不到此裝備。' });
    }

    unequipInventoryId(player, inventoryId);
    player.recalculatePower();
    await player.save();

    const responsePlayerKey = req.user.role === 'teacher' ? 'managedPlayer' : 'player';

    return res.json({
      message: `已卸下 ${inventoryItem.name}。`,
      [responsePlayerKey]: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/tradePlayers', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const players = await Player.find({
      role: 'student',
      _id: { $ne: req.user._id }
    }).sort({ name: 1 });

    await Promise.all(
      players.map(async (player) => {
        if (player.ensureInventoryIds()) {
          await player.save();
        }
      })
    );

    return res.json({
      players: players.map(publicTradePlayer)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/trades', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const trades = await TradeOffer.find({
      status: 'pending',
      $or: [{ fromPlayer: req.user._id }, { toPlayer: req.user._id }]
    })
      .populate('fromPlayer', 'name')
      .populate('toPlayer', 'name')
      .sort({ createdAt: -1 });

    return res.json({
      incoming: trades.filter((trade) => trade.toPlayer._id.equals(req.user._id)),
      outgoing: trades.filter((trade) => trade.fromPlayer._id.equals(req.user._id))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/trades', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const { toPlayerId, offeredInventoryId, requestedInventoryId } = req.body;

    if (!toPlayerId || !offeredInventoryId || !requestedInventoryId) {
      return res.status(400).json({ message: '請選擇要交換的雙方裝備。' });
    }

    if (toPlayerId === req.user._id.toString()) {
      return res.status(400).json({ message: '不能和自己交換裝備。' });
    }

    const [fromPlayer, toPlayer] = await Promise.all([
      Player.findOne({ _id: req.user._id, role: 'student' }),
      Player.findOne({ _id: toPlayerId, role: 'student' })
    ]);

    if (!fromPlayer || !toPlayer) {
      return res.status(404).json({ message: '找不到交換對象。' });
    }

    await Promise.all([ensurePlayerEquipment(fromPlayer), ensurePlayerEquipment(toPlayer)]);

    const offeredItem = fromPlayer.items.find((item) => item.inventoryId === offeredInventoryId);
    const requestedItem = toPlayer.items.find((item) => item.inventoryId === requestedInventoryId);

    if (!offeredItem) {
      return res.status(404).json({ message: '找不到你要拿來交換的裝備。' });
    }

    if (!requestedItem) {
      return res.status(404).json({ message: '找不到對方的交換裝備。' });
    }

    const existingTrade = await TradeOffer.findOne({
      status: 'pending',
      $or: [
        { offeredInventoryId },
        { requestedInventoryId: offeredInventoryId },
        { offeredInventoryId: requestedInventoryId },
        { requestedInventoryId }
      ]
    });

    if (existingTrade) {
      return res.status(400).json({ message: '其中一件裝備已有待處理的交換申請。' });
    }

    const trade = await TradeOffer.create({
      fromPlayer: fromPlayer._id,
      toPlayer: toPlayer._id,
      offeredInventoryId,
      requestedInventoryId,
      offeredItem: createTradeItemSnapshot(offeredItem),
      requestedItem: createTradeItemSnapshot(requestedItem)
    });

    await trade.populate('fromPlayer', 'name');
    await trade.populate('toPlayer', 'name');

    return res.status(201).json({
      message: `已送出交換申請給 ${toPlayer.name}。`,
      trade
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/trades/:tradeId/accept', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const trade = await TradeOffer.findOne({
      _id: req.params.tradeId,
      toPlayer: req.user._id,
      status: 'pending'
    });

    if (!trade) {
      return res.status(404).json({ message: '找不到可接受的交換申請。' });
    }

    const [fromPlayer, toPlayer] = await Promise.all([
      Player.findOne({ _id: trade.fromPlayer, role: 'student' }),
      Player.findOne({ _id: trade.toPlayer, role: 'student' })
    ]);

    if (!fromPlayer || !toPlayer) {
      trade.status = 'cancelled';
      trade.resolvedAt = new Date();
      await trade.save();
      return res.status(404).json({ message: '交換其中一方已不存在，申請已取消。' });
    }

    await Promise.all([ensurePlayerEquipment(fromPlayer), ensurePlayerEquipment(toPlayer)]);

    const offeredItem = fromPlayer.items.find((item) => item.inventoryId === trade.offeredInventoryId);
    const requestedItem = toPlayer.items.find((item) => item.inventoryId === trade.requestedInventoryId);

    if (!offeredItem || !requestedItem) {
      trade.status = 'cancelled';
      trade.resolvedAt = new Date();
      await trade.save();
      return res.status(400).json({ message: '其中一件裝備已不存在，交換申請已取消。' });
    }

    const offeredSnapshot = offeredItem.toObject ? offeredItem.toObject() : { ...offeredItem };
    const requestedSnapshot = requestedItem.toObject ? requestedItem.toObject() : { ...requestedItem };

    unequipInventoryId(fromPlayer, trade.offeredInventoryId);
    unequipInventoryId(toPlayer, trade.requestedInventoryId);

    fromPlayer.items = fromPlayer.items.filter((item) => item.inventoryId !== trade.offeredInventoryId);
    toPlayer.items = toPlayer.items.filter((item) => item.inventoryId !== trade.requestedInventoryId);
    fromPlayer.items.push(requestedSnapshot);
    toPlayer.items.push(offeredSnapshot);
    fromPlayer.recalculatePower();
    toPlayer.recalculatePower();

    trade.status = 'accepted';
    trade.resolvedAt = new Date();

    await Promise.all([fromPlayer.save(), toPlayer.save(), trade.save()]);
    await TradeOffer.updateMany(
      {
        _id: { $ne: trade._id },
        status: 'pending',
        $or: [
          { offeredInventoryId: trade.offeredInventoryId },
          { requestedInventoryId: trade.offeredInventoryId },
          { offeredInventoryId: trade.requestedInventoryId },
          { requestedInventoryId: trade.requestedInventoryId }
        ]
      },
      {
        $set: {
          status: 'cancelled',
          resolvedAt: new Date()
        }
      }
    );

    return res.json({
      message: '已接受交換，裝備已互換。',
      player: toPlayer.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/trades/:tradeId/decline', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const trade = await TradeOffer.findOne({
      _id: req.params.tradeId,
      toPlayer: req.user._id,
      status: 'pending'
    });

    if (!trade) {
      return res.status(404).json({ message: '找不到可拒絕的交換申請。' });
    }

    trade.status = 'declined';
    trade.resolvedAt = new Date();
    await trade.save();

    return res.json({ message: '已拒絕交換申請。' });
  } catch (error) {
    return next(error);
  }
});

router.post('/trades/:tradeId/cancel', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const trade = await TradeOffer.findOne({
      _id: req.params.tradeId,
      fromPlayer: req.user._id,
      status: 'pending'
    });

    if (!trade) {
      return res.status(404).json({ message: '找不到可取消的交換申請。' });
    }

    trade.status = 'cancelled';
    trade.resolvedAt = new Date();
    await trade.save();

    return res.json({ message: '已取消交換申請。' });
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
          totalPower: '$power',
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
