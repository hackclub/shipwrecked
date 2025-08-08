import { redis } from "./redis";

export interface RateLimitConfig {
  window: number;      // Time window in seconds
  maxRequests: number; // Maximum requests allowed in the window
  keyPrefix?: string;  // Optional prefix for Redis keys
}

export async function checkRateLimit(config: RateLimitConfig): Promise<{ limited: boolean; remaining: number }> {
  const key = config.keyPrefix || 'rate_limit:global';
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
  try {
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
  } catch (redisError) {
    // If Redis is unavailable, fail the request to prevent abuse
    console.error('Rate limiting failed due to Redis error:', redisError instanceof Error ? redisError.message : String(redisError));
    return new Response(
      JSON.stringify({ 
        error: 'Service temporarily unavailable',
        message: 'Please try again later'
      }),
      { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '30'
        }
      }
    );
  }
} 