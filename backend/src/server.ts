import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { initSocket } from './config/socket';
import { seedAdminUser } from './modules/settings/data-management.service';

async function main(): Promise<void> {
  await connectDatabase();

  await seedAdminUser();

  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
