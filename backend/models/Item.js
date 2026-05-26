import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    rarity: {
      type: String,
      enum: ['N', 'R', 'S', 'SS', 'SSS'],
      default: 'N'
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    power: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200000
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Item', itemSchema);
