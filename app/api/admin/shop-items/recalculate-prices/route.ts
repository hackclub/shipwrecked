import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateShellPrice } from '@/lib/shop-utils';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';
import { verifyShopAdminAccess } from '@/lib/shop-admin-auth';

// POST - Recalculate prices for fixed shop items
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyShopAdminAccess();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;

    const { dollarsPerHour } = await request.json();

    if (!dollarsPerHour || dollarsPerHour <= 0) {
      return NextResponse.json({ 
        error: 'Valid dollars per hour value is required' 
      }, { status: 400 });
    }

  
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