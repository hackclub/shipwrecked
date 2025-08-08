import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis/redis';

export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  const key = decodeURIComponent(params.key.join('/'));
  try {
    const buf = await redis.getBuffer(key);
    if (!buf) {
      return new Response('Not Found', { status: 404 });
    }
    const meta = await redis.hgetall(`${key}:meta`);
    const mime = meta?.mime || 'application/octet-stream';
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch {
    return new Response('Error', { status: 500 });
  }
}


