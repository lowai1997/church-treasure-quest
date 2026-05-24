import Item from '../models/Item.js';

export const defaultItems = [
  { name: '信念大劍', type: 'weapon', price: 4200, power: 560 },
  { name: '守護之盾', type: 'shield', price: 3200, power: 420 },
  { name: '聖潔鎧甲', type: 'armor', price: 5800, power: 760 },
  { name: '勇氣頭盔', type: 'helmet', price: 2600, power: 300 },
  { name: '光耀斗篷', type: 'cloak', price: 2100, power: 240 },
  { name: '祝福戒指', type: 'ring', price: 1800, power: 210 },
  { name: '晨星法杖', type: 'staff', price: 3900, power: 510 },
  { name: '聖堂靴', type: 'boots', price: 1500, power: 180 }
];

export const seedDefaultItems = async () => {
  const itemCount = await Item.countDocuments();

  if (itemCount > 0) {
    return;
  }

  await Item.insertMany(defaultItems);
  console.log(`Seeded ${defaultItems.length} default shop items.`);
};
