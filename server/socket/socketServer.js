const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
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

  io.on('connection', async (socket) => {
    const clerkId = socket.handshake.auth?.clerkId;
    if (!clerkId) { socket.disconnect(); return; }

    try {
      const user = await User.findOne({ clerkId }).select('_id name');
      if (!user) { socket.disconnect(); return; }

      // Each user joins their own private room — used for targeted emit
      socket.join(`user:${user._id}`);
      logger.debug(`Socket connected: ${user.name} (${user._id})`);

      await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });

      socket.on('set_available', async ({ isAvailable }) => {
        await User.findByIdAndUpdate(user._id, { isAvailable: Boolean(isAvailable) });
      });

      socket.on('disconnect', async () => {
        logger.debug(`Socket disconnected: ${user.name}`);
        await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });
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
