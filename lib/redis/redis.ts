import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: false, // Connect immediately on startup
  enableOfflineQueue: true, // Queue commands while connecting
  retryDelayOnFailover: 100,
  connectTimeout: 10000, // 10 seconds to establish connection
  commandTimeout: 5000, // 5 seconds for individual commands
});

// Handle connection events
redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to receive commands');
});

redis.on('error', (err) => {
  if (process.env.MOCK_API === 'true') {
    // Silently ignore errors when in mock mode
    return;
  }
  console.error('Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

export { redis }; 