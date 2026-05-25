import mongoose from 'mongoose';

const campaignParticipantSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    name: {
      type: String,
      required: true
    },
    power: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const campaignEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    type: {
      type: String,
      enum: ['victory', 'expired', 'manual'],
      required: true
    },
    bossName: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      required: true
    },
    frontlineStep: {
      type: Number,
      default: 13,
      min: 0,
      max: 25
    },
    totalPower: {
      type: Number,
      default: 0,
      min: 0
    },
    participants: {
      type: [campaignParticipantSchema],
      default: []
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

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
    bossDeadlineHours: {
      type: Number,
      default: 120,
      min: 1,
      max: 8760
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
    },
    campaignEvents: {
      type: [campaignEventSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('BossConfig', bossConfigSchema);
