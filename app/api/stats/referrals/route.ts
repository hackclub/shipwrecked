import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Replace with actual database query
    const mockData = {
      totalReferrals: 150,
      referralsByType: {
        social_media: 75,
        email: 45,
        direct: 30
      },
      topReferrers: [
        { name: 'John Doe', count: 25 },
        { name: 'Jane Smith', count: 20 },
        { name: 'Bob Johnson', count: 15 }
      ]
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral statistics' },
      { status: 500 }
    );
  }
} 