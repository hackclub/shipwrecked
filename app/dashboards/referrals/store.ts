import redis from '@/lib/redis';

const RSVP_CACHE_KEY = 'rsvp_data';
const RSVP_CACHE_TTL = 60; // 1 minute in seconds

export async function setRSVPData(data: any) {
  try {
    await redis.set(RSVP_CACHE_KEY, JSON.stringify(data), 'EX', RSVP_CACHE_TTL);
    console.log('RSVP data cached in Redis');
  } catch (error) {
    console.error('Error caching RSVP data:', error);
  }
}

export async function getRSVPData(): Promise<any | null> {
  try {
    const data = await redis.get(RSVP_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting RSVP data from cache:', error);
    return null;
  }
} 