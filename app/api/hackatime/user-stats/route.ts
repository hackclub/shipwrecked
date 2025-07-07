import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '../../auth/[...nextauth]/route';
import { HackatimeStatsLanguageData } from '@/types/hackatime';

const HACKATIME_API_TOKEN = process.env.HACKATIME_API_TOKEN;
const HACKATIME_RACK_ATTACK_BYPASS_TOKEN = process.env.HACKATIME_RACK_ATTACK_BYPASS_TOKEN;

interface HackatimeUserStatsResponse {
  data: HackatimeStatsLanguageData;
  trust_factor: {
    trust_level: string;
    trust_value: number;
  };
}

// GET - Retrieve user's Hackatime language statistics
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';
    
    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Admin or Reviewer access required' }, { status: 403 });
    }

    // Get the user ID from query parameters (the user whose project is being reviewed)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    // Get the target user's Hackatime ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        name: true,
        hackatimeId: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.hackatimeId) {
      return NextResponse.json({ 
        error: 'User does not have a Hackatime account connected',
        languages: []
      }, { status: 200 });
    }

    // Fetch language stats from Hackatime API
    const uri = `https://hackatime.hackclub.com/api/v1/users/${user.hackatimeId}/stats?features=languages&limit=10`;
    
    const response = await fetch(uri, {
      headers: {
        'Authorization': `Bearer ${HACKATIME_API_TOKEN}`,
        'Rack-Attack-Bypass': HACKATIME_RACK_ATTACK_BYPASS_TOKEN || '',
      }
    });

    if (!response.ok) {
      console.error(`Error fetching Hackatime user stats: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: 'Failed to fetch Hackatime user stats',
        languages: []
      }, { status: 500 });
    }

    const data: HackatimeUserStatsResponse = await response.json();
    
    if (!data?.data?.languages) {
      return NextResponse.json({ 
        error: 'No language data available',
        languages: []
      }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        hackatimeId: user.hackatimeId
      },
      languages: data.data.languages,
      summary: {
        username: data.data.username,
        total_seconds: data.data.total_seconds,
        human_readable_total: data.data.human_readable_total,
        range: data.data.human_readable_range
      }
    });
  } catch (error) {
    console.error('Error getting Hackatime user stats:', error);
    return NextResponse.json(
      { error: 'Failed to get Hackatime user stats', languages: [] },
      { status: 500 }
    );
  }
}
