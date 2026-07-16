import mongoose from 'mongoose';
import { env } from './src/config/env';
import { resetAllData } from './src/modules/settings/data-management.service';
import User from './src/models/User';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB. Running resetAllData...');
  try {
    await resetAllData();
    console.log('resetAllData completed successfully.');
  } catch (error) {
    console.error('Error during resetAllData:', error);
  }
  
  const users = await User.find({});
  console.log('Users in DB after reset:');
  console.log(JSON.stringify(users, null, 2));
  
  mongoose.disconnect();
}
main();
