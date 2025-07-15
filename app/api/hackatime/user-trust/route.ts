import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';

const HACKATIME_ADMIN_TOKEN = process.env.HACKATIME_ADMIN_TOKEN;

interface HackatimeTrustData {
  user: {
    id: number;
    username: string;
    display_name: string;
    slack_uid: string;
    slack_username: string;
    github_username: string;
    timezone: string;
    country_code: string;
    admin_level: string;
    trust_level: string;
    suspected: boolean;
    banned: boolean;
    created_at: string;
    updated_at: string;
    last_heartbeat_at: number;
    email_addresses: string[];
    api_keys_count: number;
    stats: {
      total_heartbeats: number;
      total_coding_time: number;
      languages_used: number;
      projects_worked_on: number;
      days_active: number;
    };
  };
}

// GET - Retrieve user's trust status from Hackatime (admin/reviewer only)
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

    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const hackatimeId = searchParams.get('hackatimeId');
    
    if (!hackatimeId) {
      return NextResponse.json({ error: 'hackatimeId parameter is required' }, { status: 400 });
    }

    // Check if admin token is configured
    if (!HACKATIME_ADMIN_TOKEN) {
      console.error('HACKATIME_ADMIN_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Fetch trust data from Hackatime admin API
    const uri = `https://hackatime.hackclub.com/api/admin/v1/user/info?id=${hackatimeId}`;
    
    const response = await fetch(uri, {
      headers: {
        'Authorization': `Bearer ${HACKATIME_ADMIN_TOKEN}`,
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'User not found in Hackatime' }, { status: 404 });
      }
      console.error(`Error fetching Hackatime trust data: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: 'Failed to fetch trust data from Hackatime',
        status: response.status
      }, { status: 500 });
    }

    const data: HackatimeTrustData = await response.json();
    
    // Extract relevant trust information
    const trustInfo = {
      trust_level: data.user.trust_level,
      suspected: data.user.suspected,
      banned: data.user.banned,
      admin_level: data.user.admin_level,
      stats: data.user.stats
    };

    return NextResponse.json(trustInfo);
  } catch (error) {
    console.error('Error fetching Hackatime trust data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust data' },
      { status: 500 }
    );
  }
}
