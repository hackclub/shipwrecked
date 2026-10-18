import { NextResponse } from 'next/server';
import { getRecordCount } from '@/lib/airtable/index';
import { withRateLimit } from '@/lib/rateLimit';
import metrics from '@/metrics';

export async function GET() {
  return withRateLimit(
    {
      window: 5,
      maxRequests: 10,
      keyPrefix: 'api/stats',
    },
    async () => {
      try {
        const count = await getRecordCount('RSVPs');
        console.log('received RSVP count from airtalbe', count);
        metrics.increment('sucess.get_rsvp_count', 1);
        return NextResponse.json({ count });
      } catch (error) {
        metrics.increment('errors.get_rsvp_count', 1);
        console.error('Error fetching Airtable stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }
    },
  );
}
