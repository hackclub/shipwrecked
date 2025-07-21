import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';
import { calculateProgressMetrics } from '@/lib/project-client';
import { calculateRandomizedPrice, calculateShellPrice } from '@/lib/shop-utils';

async function getUserShellBalance(userId: string): Promise<number> {
  // Get user with totalShellsSpent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalShellsSpent: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get projects with their Hackatime links for the current user
  const projects = await prisma.project.findMany({
    where: { userId },
    include: { hackatimeLinks: true }
  });

  // Calculate shell balance
  const metrics = calculateProgressMetrics(projects);
  const earnedShells = metrics.currency;
  const totalSpent = user.totalShellsSpent;
  const shells = Math.max(0, earnedShells - totalSpent);

  return shells;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, quantity = 1 } = await request.json();

    if (quantity <= 0 || isNaN(quantity)) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check eligibility (not fraud suspect, identity verified, or admin)
    if (user.status === 'FraudSuspect' && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (user.status === 'Unknown' && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Identity verification required' }, { status: 403 });
    }

    // Get shop item from database
    const item = await prisma.shopItem.findFirst({
      where: { 
        id: itemId,
        active: true 
      },
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

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

    // Calculate price
    let unitPrice: number;
    if (
      item.name.toLowerCase().includes('travel stipend') &&
      item.costType === 'config' &&
      item.config && typeof item.config === 'object' && 'dollars_per_hour' in item.config
    ) {
      const dollarsPerHour = parseFloat(String(item.config.dollars_per_hour)) || globalDollarsPerHour;
      unitPrice = calculateShellPrice(item.usdCost, dollarsPerHour);
    } else if (item.useRandomizedPricing) {
      unitPrice = calculateRandomizedPrice(user.id, item.id, item.price, minPercent, maxPercent);
    } else {
      unitPrice = item.price;
    }
    const totalPrice = unitPrice * quantity;

    // Check if user has enough shells
    const userShells = await getUserShellBalance(user.id);
    if (userShells < totalPrice) {
      return NextResponse.json({ 
        error: 'Insufficient shells', 
        currentShells: userShells,
        requiredShells: totalPrice
      }, { status: 400 });
    }

    // Prepare order config for dynamic items
    function safeConfigObject(config: unknown) {
      return (config && typeof config === 'object' && !Array.isArray(config)) ? config : {};
    }
    let orderConfig = item.config || undefined;
    if (item.costType === 'config') {
      if (item.name.toLowerCase().includes('travel stipend')) {
        // For travel stipend, store hours (default to quantity)
        orderConfig = { ...safeConfigObject(item.config as unknown), hours: quantity };
      } else if (item.name.toLowerCase().includes('progress')) {
        // For island progress, store percent (quantity * hours_equal_to_one_percent_progress)
        const configObj = safeConfigObject(item.config as unknown) as Record<string, unknown>;
        const hoursEqualToOnePercentRaw = configObj.hours_equal_to_one_percent_progress;
        const hoursEqualToOnePercent = typeof hoursEqualToOnePercentRaw === 'number' ? hoursEqualToOnePercentRaw : 0;
        const percent = quantity * hoursEqualToOnePercent;
        orderConfig = { ...configObj, percent };
      }
      // Add more dynamic item types as needed
    }

    // Create shop order
    const order = await prisma.shopOrder.create({
      data: {
        userId: user.id,
        itemId: item.id,
        itemName: item.name,
        price: totalPrice,
        quantity,
        config: orderConfig,
      },
    });

    // Update user's total shells spent (progress will be applied when order is fulfilled)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalShellsSpent: {
          increment: totalPrice
        }
        // Note: purchasedProgressHours is NOT incremented here - it will be applied when the order is fulfilled
      }
    });

    // Log audit event
    await createAuditLog({
      eventType: AuditLogEventType.ShopOrderCreated,
      description: `User purchased ${quantity}x ${item.name} for ${totalPrice} shells`,
      targetUserId: user.id,
      metadata: {
        orderId: order.id,
        itemId: item.id,
        itemName: item.name,
        price: totalPrice,
        quantity,
      },
    });

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      shellsSpent: totalPrice,
      remainingShells: userShells - totalPrice
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 