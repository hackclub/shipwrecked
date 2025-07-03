import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
});

// Handle connection errors gracefully to prevent unhandled errors
redis.on('error', (err) => {
  if (process.env.MOCK_API === 'true') {
    // Silently ignore errors when in mock mode
    return;
  }
  console.error('Redis connection error:', err.message);
});

export { redis }; 