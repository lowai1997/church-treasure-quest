import express from 'express';
import Player from '../models/Player.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

const normalizeRole = (role) => {
  return role === 'teacher' ? 'teacher' : 'student';
};

const normalizeAvatar = (avatar) => {
  return ['male-1', 'male-2', 'female-1', 'female-2'].includes(avatar) ? avatar : 'male-1';
};

router.post('/register', async (req, res, next) => {
  try {
    const { name, password, role, teacherKey, avatar } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedRole = normalizeRole(role);

    if (!normalizedName || !password) {
      return res.status(400).json({ message: '請輸入名稱與密碼。' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: '密碼至少需要 6 個字元。' });
    }

    const expectedTeacherKey = process.env.TEACHER_REGISTER_KEY || 'Amen2026';

    if (normalizedRole === 'teacher' && teacherKey !== expectedTeacherKey) {
      return res.status(403).json({ message: '導師註冊金鑰不正確。' });
    }

    const player = await Player.create({
      name: normalizedName,
      password,
      role: normalizedRole,
      avatar: normalizeAvatar(avatar),
      gold: normalizedRole === 'student' ? 300 : 0
    });
    const token = signToken(player);

    return res.status(201).json({
      token,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const normalizedName = String(name || '').trim();

    if (!normalizedName || !password) {
      return res.status(400).json({ message: '請輸入名稱與密碼。' });
    }

    const player = await Player.findOne({ name: normalizedName });

    if (!player || !(await player.comparePassword(password))) {
      return res.status(401).json({ message: '名稱或密碼不正確。' });
    }

    player.ensureInventoryIds();
    player.recalculatePower();
    await player.save();

    const token = signToken(player);

    return res.json({
      token,
      player: player.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    req.user.ensureInventoryIds();
    req.user.recalculatePower();
    await req.user.save();

    return res.json({
      player: req.user.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
