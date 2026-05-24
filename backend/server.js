import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { seedDefaultItems } from './utils/seedItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '..', 'frontend');

const app = express();
const port = process.env.PORT || 3000;

app.locals.dbReady = false;

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.static(frontendPath));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: '教會尋寶王',
    dbReady: app.locals.dbReady
  });
});

app.use('/api', (req, res, next) => {
  if (!app.locals.dbReady) {
    return res.status(503).json({
      message: '資料庫尚未連線，請確認 MONGODB_URI 設定。'
    });
  }

  return next();
});

app.use('/api', authRoutes);
app.use('/api', playerRoutes);
app.use('/api', adminRoutes);
app.use('/api', notFound);

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorHandler);

const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured. The frontend will load, but APIs will return 503.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    app.locals.dbReady = true;
    console.log('MongoDB connected.');
    await seedDefaultItems();
  } catch (error) {
    app.locals.dbReady = false;
    console.error('MongoDB connection failed:', error.message);
  }
};

app.listen(port, () => {
  console.log(`Church Treasure Quest is running on http://localhost:${port}`);
});

connectDatabase();
