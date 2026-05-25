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
    },
    worldSteps: {
      type: Number,
      default: 25,
      min: 1,
      max: 25
    },
    frontlineStep: {
      type: Number,
      default: 13,
      min: 0,
      max: 25
    },
    defenseLosses: {
      type: Number,
      default: 0,
      min: 0
    },
    lastCampaignEvent: {
      type: String,
      default: '戰線在兩個世界的裂隙中拉鋸。'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('BossConfig', bossConfigSchema);
