import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import Attendance from '../models/Attendance';

async function fixIndexes(): Promise<void> {
  await connectDatabase();

  const db = mongoose.connection.db;
  if (!db) {
    console.error('MongoDB not connected');
    process.exit(1);
  }

  const collection = db.collection('attendances');
  const indexes = await collection.indexes();

  const staleIndex = indexes.find((idx) => {
    const key = idx.key as Record<string, number>;
    return key.user === 1 && key.date === 1;
  });

  if (staleIndex && staleIndex.name) {
    console.log('Found stale index:', staleIndex.name);
    await collection.dropIndex(staleIndex.name);
    console.log('Dropped stale index:', staleIndex.name);
  } else {
    console.log('No stale index found.');
  }

  await Attendance.syncIndexes();
  console.log('Indexes synchronized with schema.');

  await mongoose.disconnect();
  process.exit(0);
}

fixIndexes().catch((error) => {
  console.error('Fix indexes script failed:', error);
  process.exit(1);
});
