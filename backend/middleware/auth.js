import jwt from 'jsonwebtoken';
import Player from '../models/Player.js';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return process.env.JWT_SECRET;
};

export const signToken = (player) => {
  return jwt.sign(
    {
      id: player._id.toString(),
      role: player.role,
      name: player.name
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: '請先登入。' });
    }

    const payload = jwt.verify(token, getJwtSecret());
    const player = await Player.findById(payload.id);

    if (!player) {
      return res.status(401).json({ message: '登入狀態已失效，請重新登入。' });
    }

    req.user = player;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token 無效或已過期，請重新登入。' });
    }

    return next(error);
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: '你沒有執行此操作的權限。' });
    }

    return next();
  };
};
