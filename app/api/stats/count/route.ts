import { NextResponse } from 'next/server';
import { getCount } from '../store';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET() {
  return withRateLimit(
    {
      window: 1, //second
      maxRequests: 3, //# allowable requests over window
      keyPrefix: 'api/stats/count'
    },
    async () => {
      try {
        console.log('Count endpoint called');
        const count = await getCount();
        console.log('Count endpoint returning:', count);
        return NextResponse.json({ count });
      } catch (error) {
        console.error('Error fetching cached stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }
    }
  );
} 