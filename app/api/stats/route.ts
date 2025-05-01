import { NextResponse } from 'next/server';
import { getRecordCount } from '@/lib/airtable';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET() {
  return withRateLimit(
    {
      window: 5,
      maxRequests: 10,
      keyPrefix: 'api/stats'
    },
    async () => {
      try {
        const count = await getRecordCount("RSVPs");
        console.log("received RSVP count from airtalbe", count);
        return NextResponse.json({ count });
      } catch (error) {
        console.error('Error fetching Airtable stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }
    }
  );
} 