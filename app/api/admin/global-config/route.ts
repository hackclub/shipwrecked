import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET - Fetch global config
export async function GET() {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== 'Admin' && !user.isAdmin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const configs = await prisma.globalConfig.findMany();
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ config: configMap });
  } catch (error) {
    console.error('Error fetching global config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update global config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== 'Admin' && !user.isAdmin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ 
        error: 'Key and value are required' 
      }, { status: 400 });
    }

    const config = await prisma.globalConfig.upsert({
      where: { key },
      update: { value: value.toString() },
      create: { key, value: value.toString() },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating global config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 