import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import Attendance from '../models/Attendance';

async function clearAttendance(): Promise<void> {
  await connectDatabase();

  const db = mongoose.connection.db;
  if (!db) {
    console.error('MongoDB not connected');
    process.exit(1);
  }

  const count = await Attendance.countDocuments();
  if (count === 0) {
    console.log('No attendance records to delete.');
  } else {
    console.log(`Deleting ${count} attendance record(s)...`);
    await Attendance.deleteMany({});
    console.log(`Successfully deleted ${count} attendance record(s).`);
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
  }

  await Attendance.syncIndexes();
  console.log('Indexes synchronized with schema.');

  await mongoose.disconnect();
  process.exit(0);
}

clearAttendance().catch((error) => {
  console.error('Clear attendance script failed:', error);
  process.exit(1);
});
