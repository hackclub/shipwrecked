import { NextResponse } from 'next/server';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { calculateRandomizedPrice, calculateShellPrice } from '@/lib/shop-utils';

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
          in: ['price_random_min_percent', 'price_random_max_percent', 'dollars_per_hour']
        }
      }
    });

    const configMap = globalConfigs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);

    const minPercent = parseFloat(configMap.price_random_min_percent || '90');
    const maxPercent = parseFloat(configMap.price_random_max_percent || '110');
    const globalDollarsPerHour = parseFloat(configMap.dollars_per_hour || '10');

    // Apply correct pricing logic
    const publicItems = items.map(item => {
      // If travel stipend, use calculateShellPrice with dollars_per_hour from config or global
      if (
        item.name.toLowerCase().includes('travel stipend') &&
        item.costType === 'config' &&
        item.config && typeof item.config === 'object' && 'dollars_per_hour' in item.config
      ) {
        const dollarsPerHour = parseFloat(String(item.config.dollars_per_hour)) || globalDollarsPerHour;
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          image: item.image,
          price: calculateShellPrice(item.usdCost, dollarsPerHour),
        };
      }
      // Otherwise, use randomized pricing
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price: calculateRandomizedPrice(user.id, item.id, item.price, minPercent, maxPercent),
      };
    });

    return NextResponse.json({ items: publicItems });
  } catch (error) {
    console.error('Error loading shop items:', error);
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 });
  }
} 