import 'dotenv/config';
import mongoose from 'mongoose';
import { seedDefaultItems } from './utils/seedItems.js';

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('請先在 .env 設定 MONGODB_URI。');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await seedDefaultItems();
  await mongoose.disconnect();
  console.log('Seed completed.');
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
