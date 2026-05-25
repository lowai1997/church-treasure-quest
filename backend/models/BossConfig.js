import mongoose from 'mongoose';

const bossConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      required: true,
      unique: true,
      default: 'hunt'
    },
    killCount: {
      type: Number,
      default: 0,
      min: 0
    },
    intensity: {
      type: Number,
      default: 1,
      min: 1,
      max: 99
    },
    bossCursor: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('BossConfig', bossConfigSchema);
