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
    upgradeLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 9
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

const petSchema = new mongoose.Schema(
  {
    petInstanceId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    petId: {
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
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    basePower: {
      type: Number,
      default: 20,
      min: 0
    },
    power: {
      type: Number,
      default: 20,
      min: 0
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
    avatar: {
      type: String,
      enum: ['male-1', 'male-2', 'female-1', 'female-2'],
      default: 'male-1'
    },
    photoUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200000
    },
    gold: {
      type: Number,
      default: 0,
      min: 0
    },
    firstLimitedBoxPurchased: {
      type: Boolean,
      default: false
    },
    items: {
      type: [playerItemSchema],
      default: []
    },
    petSlots: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    pets: {
      type: [petSchema],
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
    if (item.upgradeLevel === undefined || item.upgradeLevel === null) {
      item.upgradeLevel = 0;
    }
  });
  this.pets.forEach((pet) => {
    if (!pet.petInstanceId) {
      pet.petInstanceId = new mongoose.Types.ObjectId().toString();
    }
    if (pet.power === undefined || pet.power === null) {
      pet.power = Number(pet.basePower || 0) + Math.max(0, Number(pet.level || 1) - 1) * 15;
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
    if (item.upgradeLevel === undefined || item.upgradeLevel === null) {
      item.upgradeLevel = 0;
      changed = true;
    }
  });

  this.pets.forEach((pet) => {
    if (!pet.petInstanceId) {
      pet.petInstanceId = new mongoose.Types.ObjectId().toString();
      changed = true;
    }
  });

  return changed;
};

playerSchema.methods.recalculatePower = function recalculatePower() {
  const equippedIds = new Set(Object.values(this.equipped || {}).flat());
  const equipmentPower = this.items.reduce((total, item) => {
    return equippedIds.has(item.inventoryId) ? total + Number(item.power || 0) : total;
  }, 0);
  const petPower = (this.pets || []).reduce((total, pet) => total + Number(pet.power || 0), 0);

  this.power = equipmentPower + petPower;
  return this.power;
};

playerSchema.methods.toSafeObject = function toSafeObject() {
  const player = this.toObject({ versionKey: false });
  delete player.password;
  const equippedIds = new Set(Object.values(player.equipped || {}).flat());
  player.equipmentPower = (player.items || []).reduce((total, item) => {
    return equippedIds.has(item.inventoryId) ? total + Number(item.power || 0) : total;
  }, 0);
  player.petPower = (player.pets || []).reduce((total, pet) => total + Number(pet.power || 0), 0);
  player.totalPower = Number(player.power || 0);
  return player;
};

export default mongoose.model('Player', playerSchema);
