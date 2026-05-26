const IORedis = require('ioredis');
const logger = require('./logger');

let pub, sub;

async function connectRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  pub = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true });
  sub = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true });

  pub.on('error', (err) => logger.error('Redis pub error', err));
  sub.on('error', (err) => logger.error('Redis sub error', err));

  await pub.connect();
  await sub.connect();

  logger.info('Redis connected');
}

function getPub() {
  if (!pub) throw new Error('Redis pub not initialized');
  return pub;
}

function getSub() {
  if (!sub) throw new Error('Redis sub not initialized');
  return sub;
}

module.exports = { connectRedis, getPub, getSub };
