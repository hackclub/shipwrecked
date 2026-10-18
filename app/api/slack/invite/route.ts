import { NextRequest, NextResponse } from 'next/server';

// Define the request body type
interface InviteRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: InviteRequestBody = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 },
      );
    }

    const success = await inviteUserToSlack(email);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to invite user to Slack' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error inviting user to Slack:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

async function inviteUserToSlack(email: string): Promise<boolean> {
  const headers = {
    Cookie: `d=${encodeURIComponent(process.env.SLACK_COOKIE || '')}`,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.SLACK_BROWSER_TOKEN}`,
  };

  const data = {
    invites: [
      {
        email: email,
        type: 'restricted',
        mode: 'manual',
      },
    ],
    restricted: true,
    channels: 'C06V73WGACB, C039PAG1AV7',
  };

  try {
    const response = await fetch('https://slack.com/api/users.admin.inviteBulk', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const responseJson = await response.json();

    if (!responseJson.ok) {
      console.error('Slack API error:', responseJson.error || 'Unknown error');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error making request to Slack API:', error);
    return false;
  }
}
