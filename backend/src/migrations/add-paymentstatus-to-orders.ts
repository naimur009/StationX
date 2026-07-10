import mongoose from 'mongoose';
import Order from '../models/Order';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stationx');
  console.log('Connected to MongoDB');

  const paidResult = await Order.updateMany(
    { payment: { $exists: true, $ne: null } },
    { $set: { paymentStatus: 'paid' } }
  );
  console.log(`Set paymentStatus: 'paid' on ${paidResult.modifiedCount} orders with payment data`);

  const unpaidResult = await Order.updateMany(
    { paymentStatus: { $exists: false } },
    { $set: { paymentStatus: 'unpaid' } }
  );
  console.log(`Set paymentStatus: 'unpaid' on ${unpaidResult.modifiedCount} remaining orders`);

  console.log('Migration complete');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
