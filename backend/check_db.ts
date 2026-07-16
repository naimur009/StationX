import mongoose from 'mongoose';
import { env } from './src/config/env';
import User from './src/models/User';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const users = await User.find({});
  console.log('Users in DB:');
  console.log(JSON.stringify(users, null, 2));
  mongoose.disconnect();
}
main();
