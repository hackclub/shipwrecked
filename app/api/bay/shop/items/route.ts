import { NextResponse } from 'next/server';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { calculateRandomizedPrice } from '@/lib/shop-utils';

export async function GET() {
  const session = await getServerSession(opts);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user for randomized pricing
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get active shop items from database
    const items = await prisma.shopItem.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get pricing bounds from global config
    const globalConfigs = await prisma.globalConfig.findMany({
      where: {
        key: {
          in: ['price_random_min_percent', 'price_random_max_percent']
        }
      }
    });

    const configMap = globalConfigs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);

    const minPercent = parseFloat(configMap.price_random_min_percent || '90');
    const maxPercent = parseFloat(configMap.price_random_max_percent || '110');

    // Apply randomized pricing to each item and filter to only public fields
    const publicItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      price: calculateRandomizedPrice(user.id, item.id, item.price, minPercent, maxPercent),
    }));

    return NextResponse.json({ items: publicItems });
  } catch (error) {
    console.error('Error loading shop items:', error);
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 });
  }
} 