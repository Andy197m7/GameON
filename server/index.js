require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket/socketServer');
const { connectDB } = require('./services/db');
const { connectRedis } = require('./services/redis');
const logger = require('./services/logger');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  await connectRedis();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    logger.info(`GameOn server running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
