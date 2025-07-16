import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';

// Whitelist of admin users who can access shop orders
const SHOP_ORDERS_ADMIN_WHITELIST = (process.env.SHOP_ORDERS_ADMIN_WHITELIST || '').split(',').map(e => e.trim()).filter(Boolean);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'Admin' || !SHOP_ORDERS_ADMIN_WHITELIST.includes(user.email)) {
      return NextResponse.json({ error: 'Access denied. Only authorized shop order administrators can access this resource.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const whereClause: { status?: string } = {};
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter;
    }

    const orders = await prisma.shopOrder.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'Admin' || !SHOP_ORDERS_ADMIN_WHITELIST.includes(user.email)) {
      return NextResponse.json({ error: 'Access denied. Only authorized shop order administrators can access this resource.' }, { status: 403 });
    }

    const { orderId, status } = await request.json();

    // Get the order first to check if it's currently pending
    const existingOrder = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            totalShellsSpent: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.status !== 'pending') {
      return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });
    }

    // Update the order status
    const order = await prisma.shopOrder.update({
      where: { id: orderId },
      data: {
        status,
        fulfilledAt: status === 'fulfilled' ? new Date() : null,
        fulfilledBy: status === 'fulfilled' ? user.id : null,
      },
    });

    // Get config for progress calculations
    const config = existingOrder.config as { progress_per_hour?: number };

    // If fulfilling, apply the purchased progress
    if (status === 'fulfilled') {
      if (config?.progress_per_hour) {
        const progressToApply = config.progress_per_hour * existingOrder.quantity;
        await prisma.user.update({
          where: { id: existingOrder.userId },
          data: {
            purchasedProgressHours: {
              increment: progressToApply
            }
          }
        });
      }
    }

    // If rejecting, reimburse the shells and progress
    if (status === 'rejected') {
      const updateData: {
        totalShellsSpent: { decrement: number };
        purchasedProgressHours?: { decrement: number };
      } = {
        totalShellsSpent: {
          decrement: existingOrder.price
        }
      };

      // Reimburse purchased progress if this was a progress item
      if (config?.progress_per_hour) {
        const progressToReimburse = config.progress_per_hour * existingOrder.quantity;
        updateData.purchasedProgressHours = {
          decrement: progressToReimburse
        };
      }

      await prisma.user.update({
        where: { id: existingOrder.userId },
        data: updateData
      });
    }

    // Log audit event
    if (status === 'fulfilled' || status === 'rejected') {
      const userDisplay = existingOrder.user?.name || existingOrder.user?.email || existingOrder.userId;
      const eventType = status === 'fulfilled' ? AuditLogEventType.ShopOrderFulfilled : AuditLogEventType.ShopOrderRejected;
      const description = status === 'rejected' 
        ? `Order for ${order.itemName} by ${userDisplay} rejected and ${existingOrder.price} shells reimbursed.`
        : `Order for ${order.itemName} by ${userDisplay} marked as fulfilled and progress applied.`;
      
      await createAuditLog({
        eventType,
        description,
        targetUserId: order.userId,
        actorUserId: user.id,
        metadata: {
          orderId,
          itemId: order.itemId,
          itemName: order.itemName,
          price: existingOrder.price,
          quantity: order.quantity,
          shellsReimbursed: status === 'rejected' ? existingOrder.price : 0,
          progressApplied: status === 'fulfilled' ? (config?.progress_per_hour ? config.progress_per_hour * existingOrder.quantity : 0) : 0,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      order,
      shellsReimbursed: status === 'rejected' ? existingOrder.price : 0,
      progressApplied: status === 'fulfilled' ? (config?.progress_per_hour ? config.progress_per_hour * existingOrder.quantity : 0) : 0
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 