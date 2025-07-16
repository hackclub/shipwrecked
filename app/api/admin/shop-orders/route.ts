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

    if (status === 'refunded' && existingOrder.status !== 'fulfilled') {
      return NextResponse.json({ error: 'Only fulfilled orders can be refunded' }, { status: 400 });
    } else if (status !== 'refunded' && existingOrder.status !== 'pending') {
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

    // If fulfilling, apply the purchased progress
    if (status === 'fulfilled') {
      // Check if this is a progress item by name (case-insensitive)
      if (existingOrder.itemName.toLowerCase().includes('progress')) {
        const progressToApply = existingOrder.quantity;
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

      if (existingOrder.itemName.toLowerCase().includes('progress')) {
        const progressToReimburse = existingOrder.quantity;
        updateData.purchasedProgressHours = {
          decrement: progressToReimburse
        };
      }

      await prisma.user.update({
        where: { id: existingOrder.userId },
        data: updateData
      });
    }

    // If refunding, reimburse the shells and remove applied progress
    if (status === 'refunded') {
      const updateData: {
        totalShellsSpent: { decrement: number };
        purchasedProgressHours?: { decrement: number };
      } = {
        totalShellsSpent: {
          decrement: existingOrder.price
        }
      };

      if (existingOrder.itemName.toLowerCase().includes('progress')) {
        const progressToRemove = existingOrder.quantity;
        updateData.purchasedProgressHours = {
          decrement: progressToRemove
        };
      }

      await prisma.user.update({
        where: { id: existingOrder.userId },
        data: updateData
      });
    }

    // Log audit event
    if (status === 'fulfilled' || status === 'rejected' || status === 'refunded') {
      const userDisplay = existingOrder.user?.name || existingOrder.user?.email || existingOrder.userId;
      let eventType: AuditLogEventType;
      let description: string;
      
      if (status === 'fulfilled') {
        eventType = AuditLogEventType.ShopOrderFulfilled;
        description = `Order for ${order.itemName} by ${userDisplay} marked as fulfilled and progress applied.`;
      } else if (status === 'rejected') {
        eventType = AuditLogEventType.ShopOrderRejected;
        description = `Order for ${order.itemName} by ${userDisplay} rejected and ${existingOrder.price} shells reimbursed.`;
      } else { // status === 'refunded'
        eventType = AuditLogEventType.ShopOrderRejected; // Reusing rejected event type for refunds
        description = `Order for ${order.itemName} by ${userDisplay} refunded and ${existingOrder.price} shells reimbursed.`;
      }
      
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
          shellsReimbursed: (status === 'rejected' || status === 'refunded') ? existingOrder.price : 0,
          progressApplied: status === 'fulfilled' ? (existingOrder.itemName.toLowerCase().includes('progress') ? existingOrder.quantity : 0) : 0,
          progressRemoved: status === 'refunded' ? (existingOrder.itemName.toLowerCase().includes('progress') ? existingOrder.quantity : 0) : 0,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      order,
      shellsReimbursed: (status === 'rejected' || status === 'refunded') ? existingOrder.price : 0,
      progressApplied: status === 'fulfilled' ? (existingOrder.itemName.toLowerCase().includes('progress') ? existingOrder.quantity : 0) : 0,
      progressRemoved: status === 'refunded' ? (existingOrder.itemName.toLowerCase().includes('progress') ? existingOrder.quantity : 0) : 0
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 