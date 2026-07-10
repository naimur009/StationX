import mongoose from 'mongoose';
import Category from '../models/Category';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stationx');
  console.log('Connected to MongoDB');

  const renameResult = await Category.updateMany(
    { taxRate: { $exists: true } },
    { $rename: { taxRate: 'vatRate' } }
  );
  console.log(`Renamed taxRate to vatRate on ${renameResult.modifiedCount} documents`);

  const setResult = await Category.updateMany(
    { vatRate: { $exists: false } },
    { $set: { vatRate: 5 } }
  );
  console.log(`Set default vatRate on ${setResult.modifiedCount} documents`);

  console.log('Migration complete');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
