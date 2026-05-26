import mongoose from 'mongoose';

const weeklyMissionReportSchema = new mongoose.Schema(
  {
    mission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyMission',
      required: true
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    playerName: {
      type: String,
      required: true,
      trim: true
    },
    weekKey: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    },
    reward: {
      type: Number,
      default: 0,
      min: 0
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    reviewedByName: {
      type: String,
      default: '',
      trim: true
    },
    claimedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

weeklyMissionReportSchema.index({ mission: 1, player: 1, weekKey: 1 }, { unique: true });

export default mongoose.model('WeeklyMissionReport', weeklyMissionReportSchema);
