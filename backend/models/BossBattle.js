import mongoose from 'mongoose';

const bossParticipantSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const bossBattleSchema = new mongoose.Schema(
  {
    battleKey: {
      type: String,
      required: true,
      unique: true,
      default: 'world'
    },
    slot: {
      type: Number,
      default: 0,
      min: 0
    },
    name: {
      type: String,
      default: '討伐怪獸'
    },
    intensity: {
      type: Number,
      default: 1,
      min: 1
    },
    maxHp: {
      type: Number,
      required: true,
      min: 1
    },
    hp: {
      type: Number,
      required: true,
      min: 0
    },
    participants: {
      type: [bossParticipantSchema],
      default: []
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastSettledAt: {
      type: Date,
      default: Date.now
    },
    deadlineAt: {
      type: Date,
      default: null
    },
    defeatedAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('BossBattle', bossBattleSchema);
