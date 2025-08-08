import { NextRequest, NextResponse } from 'next/server';

function resolvePublicOrigin(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_PUBLIC_ORIGIN;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    // Prefer server env, but allow Authorization header or NEXT_PUBLIC_API_TOKEN for dev
    const headerAuth = request.headers.get('authorization') || '';
    const headerToken = headerAuth.toLowerCase().startsWith('bearer ')
      ? headerAuth.slice(7)
      : '';
    const token = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || headerToken;
    if (!token) {
      return NextResponse.json({ error: 'Missing API token. Set API_TOKEN, or send Authorization: Bearer <token>.' }, { status: 400 });
    }
    const { tempPath } = await request.json();
    if (typeof tempPath !== 'string' || !tempPath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid tempPath' }, { status: 400 });
    }

    const base = resolvePublicOrigin(request);
    const fileUrl = `${base}${tempPath}`;

    const res = await fetch('https://cdn.hackclub.com/api/v3/new', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([fileUrl]),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('CDN ingest failed', res.status, text);
      return NextResponse.json({ error: 'CDN ingest failed', status: res.status, details: text }, { status: 502 });
    }

    const data = await res.json();
    const deployedUrl = data?.files?.[0]?.deployedUrl;
    return NextResponse.json({ deployedUrl });
  } catch (e: any) {
    console.error('Ingest error', e);
    return NextResponse.json({ error: 'Ingest error', details: e?.message || String(e) }, { status: 500 });
  }
}


