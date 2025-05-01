import { NextResponse } from 'next/server';
import { getRecords } from '@/lib/airtable';

export async function GET() {
  try {
    const records = await getRecords("RSVPs");
    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 });
  }
} 