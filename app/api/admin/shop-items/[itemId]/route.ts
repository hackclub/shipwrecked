import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';

// PUT - Update shop item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
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

    const { itemId } = params;
    const { name, description, image, price, usdCost, costType, config, active } = await request.json();

    // Validate required fields
    if (!name || !description || price === undefined || price === null) {
      return NextResponse.json({ 
        error: 'Name, description, and price are required' 
      }, { status: 400 });
    }

    if (price <= 0) {
      return NextResponse.json({ 
        error: 'Price must be greater than 0' 
      }, { status: 400 });
    }

    const item = await prisma.shopItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        image: image || null,
        price, // Always use the provided price
        usdCost: usdCost !== undefined ? usdCost : 0,
        costType: costType || 'fixed',
        config: config || null,
        active: active !== undefined ? active : true,
      },
    });

    // Log audit event
    await createAuditLog({
      eventType: AuditLogEventType.OtherEvent,
      description: `Admin updated shop item: ${name}`,
      targetUserId: user.id,
      actorUserId: user.id,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        active: item.active,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete shop item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
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

    const { itemId } = params;

    // Get item details before deletion for audit log
    const item = await prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.shopItem.delete({
      where: { id: itemId },
    });

    // Log audit event
    await createAuditLog({
      eventType: AuditLogEventType.OtherEvent,
      description: `Admin deleted shop item: ${item.name}`,
      targetUserId: user.id,
      actorUserId: user.id,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        price: item.price,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 