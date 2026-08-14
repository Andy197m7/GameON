const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { verifyToken } = require('@clerk/backend');
const IORedis = require('ioredis');
const User = require('../models/User');
const logger = require('../services/logger');

let io;

function initSocket(httpServer) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Redis adapter — enables horizontal scaling across multiple Node instances
  io.adapter(createAdapter(pubClient, subClient));

  // Verify the Clerk session token BEFORE allowing the handshake to
  // complete. Previously this trusted a raw clerkId string sent by the
  // client with no proof of identity — anyone could connect as anyone.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing auth token'));

      if (!process.env.CLERK_SECRET_KEY) {
        logger.error('CLERK_SECRET_KEY is not set — refusing socket auth');
        return next(new Error('Server auth misconfigured'));
      }

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        authorizedParties: (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
      });
      if (!payload?.sub) return next(new Error('Invalid token'));

      const user = await User.findOne({ clerkId: payload.sub }).select('_id name');
      if (!user) return next(new Error('User not found'));

      socket.data.userId = user._id.toString();
      socket.data.userName = user.name;
      next();
    } catch (err) {
      logger.warn('Socket auth failed', { message: err.message });
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;

    try {
      // Each user joins their own private room — used for targeted emit
      socket.join(`user:${userId}`);
      logger.debug(`Socket connected: ${socket.data.userName} (${userId})`);

      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

      socket.on('set_available', async ({ isAvailable }) => {
        await User.findByIdAndUpdate(userId, { isAvailable: Boolean(isAvailable) });
      });

      socket.on('disconnect', async () => {
        logger.debug(`Socket disconnected: ${socket.data.userName}`);
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      });
    } catch (err) {
      logger.error('Socket connection error', err);
      socket.disconnect();
    }
  });

  logger.info('Socket.io initialized with Redis adapter');
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
