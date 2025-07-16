import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeOrderUsdValue } from '@/lib/shop-utils';
import { verifyShopAdminAccess } from '@/lib/shop-admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyShopAdminAccess();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'all'; // 'all', '7d', '24h', '1h'
    const itemId = searchParams.get('itemId'); // Optional: filter by specific item

    // Calculate date range
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = undefined; // All time
    }

    // Build where clause
    const whereClause: any = {
      status: 'fulfilled' // Only count fulfilled orders
    };

    if (startDate) {
      whereClause.fulfilledAt = {
        gte: startDate
      };
    }

    if (itemId) {
      whereClause.itemId = itemId;
    }

    // Get orders with items
    const orders = await prisma.shopOrder.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fulfilledAt: 'desc'
      }
    });

    // Get all shop items for USD calculation
    const shopItems = await prisma.shopItem.findMany();
    const itemMap = new Map(shopItems.map(item => [item.id, item]));

    // Calculate analytics
    let totalShells = 0;
    let totalUsd = 0;
    const itemBreakdown: Record<string, { shells: number; usd: number; count: number }> = {};

    for (const order of orders) {
      const item = itemMap.get(order.itemId);
      if (!item) continue;

      const orderUsd = computeOrderUsdValue(item, order);
      
      totalShells += order.price;
      totalUsd += orderUsd;

      // Item breakdown
      if (!itemBreakdown[order.itemId]) {
        itemBreakdown[order.itemId] = { shells: 0, usd: 0, count: 0 };
      }
      itemBreakdown[order.itemId].shells += order.price;
      itemBreakdown[order.itemId].usd += orderUsd;
      itemBreakdown[order.itemId].count += 1;
    }

    // Calculate payout rate
    const payoutRate = totalShells > 0 ? totalUsd / totalShells : 0;

    // Get item details for breakdown
    const itemAnalytics = Object.entries(itemBreakdown).map(([itemId, data]) => {
      const item = itemMap.get(itemId);
      return {
        itemId,
        itemName: item?.name || 'Unknown Item',
        shells: data.shells,
        usd: data.usd,
        count: data.count,
        payoutRate: data.shells > 0 ? data.usd / data.shells : 0
      };
    });

    return NextResponse.json({
      timeRange,
      totalShells,
      totalUsd,
      payoutRate,
      orderCount: orders.length,
      itemAnalytics,
      recentOrders: orders.slice(0, 10) // Last 10 orders
    });

  } catch (error) {
    console.error('Error fetching shop analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 