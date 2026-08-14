/**
 * Local dev bootstrap when Docker/MongoDB aren't installed.
 *
 * Starts an in-memory MongoDB (mongodb-memory-server downloads its mongod
 * binary lazily, on first use here — it does NOT block `npm install`).
 *
 * Redis is NOT auto-started in-memory. `redis-memory-server` used to fill
 * that role, but it fetches platform binaries in a package `postinstall`
 * script, which runs during plain `npm install` (not just when this script
 * executes) and hard-fails the entire install on flaky networks, corporate
 * proxies, or restricted CI runners. Real Redis is a ~5MB Alpine image and
 * takes a couple seconds to start, so we just require a real one instead —
 * this keeps `npm install` reliable for everyone, whether or not they ever
 * run local (non-Docker) dev.
 *
 * If you don't already have Redis running locally:
 *   docker run -d --name gameon-redis -p 6379:6379 redis:7-alpine
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { MongoMemoryServer } = require('mongodb-memory-server');
const IORedis = require('ioredis');

async function ensureRedisReachable(url) {
  const client = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await client.connect();
    await client.ping();
  } finally {
    client.disconnect();
  }
}

async function main() {
  // Check Redis first — it's a fast local check, and fails fast instead of
  // waiting through a (possibly slow) MongoDB binary download only to hit
  // a missing Redis at the very end.
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    await ensureRedisReachable(redisUrl);
    console.log(`Redis:   ${redisUrl} (reachable)`);
  } catch (err) {
    console.error(`\nCould not reach Redis at ${redisUrl}.`);
    console.error('Start one with:\n  docker run -d --name gameon-redis -p 6379:6379 redis:7-alpine\n');
    process.exit(1);
  }

  console.log('Starting in-memory MongoDB for local development...');
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('gameon');
  console.log(`MongoDB: ${process.env.MONGO_URI}`);

  const cleanup = async () => {
    await mongo.stop();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  require('../index');
}

main().catch((err) => {
  console.error('Failed to start local dev environment:', err);
  process.exit(1);
});
