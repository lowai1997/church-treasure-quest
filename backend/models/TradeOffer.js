import mongoose from 'mongoose';

const tradeItemSnapshotSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    rarity: {
      type: String,
      enum: ['N', 'R', 'S', 'SS', 'SSS'],
      default: 'N'
    },
    price: {
      type: Number,
      default: 0
    },
    power: {
      type: Number,
      default: 0
    },
    upgradeLevel: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const tradeOfferSchema = new mongoose.Schema(
  {
    fromPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    toPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    offeredInventoryId: {
      type: String,
      required: true
    },
    requestedInventoryId: {
      type: String,
      default: ''
    },
    offeredItem: {
      type: tradeItemSnapshotSchema,
      required: true
    },
    requestedItem: {
      type: tradeItemSnapshotSchema,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending'
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('TradeOffer', tradeOfferSchema);
