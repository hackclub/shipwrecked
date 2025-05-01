import { NextResponse } from 'next/server';
import { setRSVPData, getRSVPData } from '../store';

export async function GET() {
  try {
    const data = await getRSVPData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting RSVP data:', error);
    return NextResponse.json({ error: 'Failed to get RSVP data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await setRSVPData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting RSVP data:', error);
    return NextResponse.json({ error: 'Failed to set RSVP data' }, { status: 500 });
  }
} 