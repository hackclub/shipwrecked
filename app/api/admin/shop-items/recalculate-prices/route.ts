import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { calculateShellPrice } from '@/lib/shop-utils';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';

// POST - Recalculate prices for fixed shop items
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

    const { dollarsPerHour } = await request.json();

    if (!dollarsPerHour || dollarsPerHour <= 0) {
      return NextResponse.json({ 
        error: 'Valid dollars per hour value is required' 
      }, { status: 400 });
    }

    // Get all fixed shop items that have a USD cost
    const fixedItems = await prisma.shopItem.findMany({
      where: { 
        costType: 'fixed',
        usdCost: { gt: 0 }
      },
    });

    let updatedCount = 0;
    const updateResults = [];

    // Recalculate and update each item's price
    for (const item of fixedItems) {
      const newPrice = calculateShellPrice(item.usdCost, dollarsPerHour);
      
      if (newPrice !== item.price) {
        const oldPrice = item.price;
        
        await prisma.shopItem.update({
          where: { id: item.id },
          data: { price: newPrice },
        });

        updatedCount++;
        updateResults.push({
          itemId: item.id,
          itemName: item.name,
          oldPrice,
          newPrice,
          usdCost: item.usdCost
        });
      }
    }

    // Log audit event
    if (updatedCount > 0) {
      await createAuditLog({
        eventType: AuditLogEventType.OtherEvent,
        description: `Admin recalculated prices for ${updatedCount} shop items using dollars_per_hour: ${dollarsPerHour}`,
        targetUserId: user.id,
        actorUserId: user.id,
        metadata: {
          dollarsPerHour,
          updatedCount,
          itemUpdates: updateResults,
        },
      });
    }

    return NextResponse.json({ 
      success: true,
      updatedCount,
      dollarsPerHour,
      updateResults
    });
  } catch (error) {
    console.error('Error recalculating prices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 