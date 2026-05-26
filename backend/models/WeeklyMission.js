import mongoose from 'mongoose';

const weeklyMissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800
    },
    reward: {
      type: Number,
      default: 100,
      min: 0
    },
    active: {
      type: Boolean,
      default: true
    },
    repeatWeekly: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    createdByName: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('WeeklyMission', weeklyMissionSchema);
