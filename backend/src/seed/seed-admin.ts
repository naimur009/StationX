import { connectDatabase } from '../config/db';
import { env } from '../config/env';
import User from '../models/User';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function seedAdmin(): Promise<void> {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    console.log(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set. Skipping seed.'
    );
    process.exit(0);
  }

  await connectDatabase();

  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    console.log(`Admin user "${env.SEED_ADMIN_EMAIL}" already exists, skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, SALT_ROUNDS);

  await User.create({
    name: 'Admin',
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'admin',
    permissions: [],
    isActive: true,
  });

  console.log(`Admin user "${env.SEED_ADMIN_EMAIL}" created successfully.`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
