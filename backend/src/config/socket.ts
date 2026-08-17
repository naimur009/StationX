import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { env } from './env';

let io: SocketServer | null = null;

const MODULE_ROOMS: Record<string, string[]> = {
  orders: ['room:orders', 'room:tables'],
  pos: ['room:orders', 'room:tables'],
  dashboard: ['room:dashboard'],
  tables: ['room:tables'],
  tasks: ['room:tasks'],
  attendance: ['room:attendance'],
  expenses: ['room:dashboard'],
  incomes: ['room:dashboard'],
};

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, role: payload.role, permissions: payload.permissions };
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const permissions = (socket.data.user?.permissions ?? []) as Array<{ module: string; actions: string[] }>;
    for (const permission of permissions) {
      for (const room of MODULE_ROOMS[permission.module] ?? [`room:${permission.module}`]) {
        socket.join(room);
      }
    }
    if (socket.data.user?.id) {
      socket.join(`user:${socket.data.user.id}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
}
