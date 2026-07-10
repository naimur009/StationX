import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db;
  
  const categories = await db!.collection('categories').find({}).toArray();
  let updatedCount = 0;
  for (const c of categories) {
    if (c.vatRate === undefined) {
      await db!.collection('categories').updateOne({_id: c._id}, {$set: {vatRate: 0}});
      updatedCount++;
    }
  }
  console.log(`Second migration complete. Updated ${updatedCount} categories.`);
  process.exit(0);
}
migrate().catch(console.error);
