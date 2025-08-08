import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../auth/[...nextauth]/route';
import { randomBytes } from 'crypto';
import { redis } from '@/lib/redis/redis';

// Accept multipart/form-data, store file bytes in Redis (10 min TTL), return a temporary URL
export async function POST(request: NextRequest) {
  const session = await getServerSession(opts);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const mime = file.type;
    if (mime !== 'image/png' && mime !== 'image/jpeg') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const key = `tmp:chat:${new Date().toISOString().slice(0,10)}:${session.user.id}:${randomBytes(8).toString('hex')}`;
    await redis.set(key, buf, 'EX', 60 * 10);
    await redis.hset(`${key}:meta`, { mime, size: String(buf.length) });
    await redis.expire(`${key}:meta`, 60 * 10);
    const tempUrl = `/api/uploads/${encodeURIComponent(key)}`;
    return NextResponse.json({ tempUrl });
  } catch (e: any) {
    console.error('Upload failed', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}



