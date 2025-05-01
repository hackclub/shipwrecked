import redis from '@/lib/redis';

const RSVP_CACHE_KEY = 'rsvp_data';
const RSVP_CACHE_TTL = 60; // 1 minute in seconds

interface RSVP {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralType: string;
  referralCode: string;
  createdAt: string;
}

export async function setRSVPData(rsvps: RSVP[]) {
  try {
    await redis.set(RSVP_CACHE_KEY, JSON.stringify(rsvps), 'EX', RSVP_CACHE_TTL);
    console.log('RSVP data cached in Redis');
  } catch (error) {
    console.error('Error caching RSVP data:', error);
  }
}

export async function getRSVPData(): Promise<RSVP[] | null> {
  try {
    const data = await redis.get(RSVP_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting RSVP data from cache:', error);
    return null;
  }
} 