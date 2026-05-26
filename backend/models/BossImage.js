import mongoose from 'mongoose';

const bossImageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200000
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('BossImage', bossImageSchema);
