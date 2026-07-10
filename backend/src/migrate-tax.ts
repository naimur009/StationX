import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db;
  
  // Need to add ! because db might be undefined, but we know it's connected
  const categories = await db!.collection('categories').find({}).toArray();
  console.log("Found categories:", categories);
  let updatedCount = 0;
  for (const c of categories) {
    if (c.taxRate !== undefined && c.vatRate === undefined) {
      await db!.collection('categories').updateOne({_id: c._id}, {$set: {vatRate: c.taxRate}, $unset: {taxRate: 1}});
      updatedCount++;
    }
  }
  console.log(`Migration complete. Updated ${updatedCount} categories.`);
  process.exit(0);
}
migrate().catch(console.error);
