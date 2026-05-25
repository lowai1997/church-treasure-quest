import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const playerItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      default: 0
    },
    power: {
      type: Number,
      default: 0
    },
    rarity: {
      type: String,
      enum: ['N', 'R', 'S', 'SS', 'SSS'],
      default: 'N'
    },
    inventoryId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    acquiredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 32
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['student', 'teacher'],
      default: 'student'
    },
    gold: {
      type: Number,
      default: 0,
      min: 0
    },
    items: {
      type: [playerItemSchema],
      default: []
    },
    equipped: {
      weapon: {
        type: [String],
        default: []
      },
      helmet: {
        type: [String],
        default: []
      },
      armor: {
        type: [String],
        default: []
      },
      pants: {
        type: [String],
        default: []
      },
      shoes: {
        type: [String],
        default: []
      },
      accessory: {
        type: [String],
        default: []
      }
    },
    power: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

playerSchema.pre('validate', function ensureLegacyInventoryIds(next) {
  this.items.forEach((item) => {
    if (!item.inventoryId) {
      item.inventoryId = new mongoose.Types.ObjectId().toString();
    }
  });
  next();
});

playerSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

playerSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

playerSchema.methods.ensureInventoryIds = function ensureInventoryIds() {
  let changed = false;

  this.items.forEach((item) => {
    if (!item.inventoryId) {
      item.inventoryId = new mongoose.Types.ObjectId().toString();
      changed = true;
    }
  });

  return changed;
};

playerSchema.methods.recalculatePower = function recalculatePower() {
  const equippedIds = new Set(Object.values(this.equipped || {}).flat());
  this.power = this.items.reduce((total, item) => {
    return equippedIds.has(item.inventoryId) ? total + Number(item.power || 0) : total;
  }, 0);
  return this.power;
};

playerSchema.methods.toSafeObject = function toSafeObject() {
  const player = this.toObject({ versionKey: false });
  delete player.password;
  player.totalPower = Number(player.power || 0) + Number(player.gold || 0);
  return player;
};

export default mongoose.model('Player', playerSchema);
