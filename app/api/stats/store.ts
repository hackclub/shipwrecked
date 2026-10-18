import { redis } from '@/lib/redis';

const COUNT_KEY = 'rsvp_count';

export async function setCount(count: number) {
  try {
    await redis.set(COUNT_KEY, count.toString());
    console.log('Count updated in Redis:', count);
  } catch (error) {
    console.error('Error setting count in Redis:', error);
  }
}

export async function getCount(): Promise<number> {
  try {
    const count = await redis.get(COUNT_KEY);
    const numCount = count ? parseInt(count, 10) : 0;
    console.log('Got count from Redis:', numCount);
    return numCount;
  } catch (error) {
    console.error('Error getting count from Redis:', error);
    return 0;
  }
}
