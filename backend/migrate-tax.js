import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const categories = await db.collection('categories').find({}).toArray();
  console.log(categories);
  for (const c of categories) {
    if (c.taxRate !== undefined && c.vatRate === undefined) {
      await db.collection('categories').updateOne({_id: c._id}, {$set: {vatRate: c.taxRate}, $unset: {taxRate: 1}});
    }
  }
  console.log("Migration complete");
  process.exit(0);
});
