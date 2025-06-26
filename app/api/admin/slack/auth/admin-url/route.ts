import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = '2210535565.9097926739654';
  const redirectUri =  'https://localhost:3000/api/admin/slack/auth/callback';
  const scopes = 'users:read,chat:write,im:write,users:read.email';
  const url = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.json({ url });
} 