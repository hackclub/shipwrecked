import { NextResponse } from 'next/server';

export async function GET() {
    const params = {
    client_id: process.env.IDENTITY_CLIENT_ID || '',
    redirect_uri: `${process.env.NEXTAUTH_URL}/identity`,
    response_type: "code",
    scope: "basic_info address",
  };
    const queryString = new URLSearchParams(params).toString();
    console.log(`${process.env.IDENTITY_URL}/oauth/authorize?${queryString}`)
    return NextResponse.json({ url: `${process.env.IDENTITY_URL}/oauth/authorize?${queryString}` });
}