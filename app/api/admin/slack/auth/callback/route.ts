import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession(opts)
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }
  const clientId = process.env.SLACK_ADMIN_CLIENT_ID;
  const clientSecret = process.env.SLACK_ADMIN_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_ADMIN_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Missing Slack admin OAuth env vars' }, { status: 500 });
  }
  // Exchange code for token
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.ok) {
    return NextResponse.json({ error: 'Slack token exchange failed', details: tokenData }, { status: 500 });
  }
  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: 'slack',
        providerAccountId: tokenData.team.id
      }
    },
    data: {
      access_token: tokenData.access_token,
    },
  });
  // For now, just return the token in the response (in production, store securely!)
  return NextResponse.redirect(new URL('/admin/users', req.url));
} 