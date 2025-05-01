import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RateLimitConfig {
  window: number;      // Time window in seconds
  maxRequests: number; // Maximum requests allowed in the window
  keyPrefix?: string;  // Optional prefix for Redis keys
}

export async function checkRateLimit(config: RateLimitConfig): Promise<{ limited: boolean; remaining: number }> {
  const key = `${config.keyPrefix || 'rate_limit'}:global`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, config.window);
  }
  
  const remaining = Math.max(0, config.maxRequests - current);
  return {
    limited: current > config.maxRequests,
    remaining
  };
}

export async function withRateLimit(
  config: RateLimitConfig,
  handler: () => Promise<Response>
): Promise<Response> {
  const { limited, remaining } = await checkRateLimit(config);
  
  if (limited) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: config.window
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': config.window.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    );
  }
  
  return handler();
} 