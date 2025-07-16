import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';

// GET - Fetch all shop items
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

    const items = await prisma.shopItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new shop item
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

    const { name, description, image, price, usdCost, costType, config } = await request.json();

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

    const item = await prisma.shopItem.create({
      data: {
        name,
        description,
        image: image || null,
        price, // Always use the provided price
        usdCost: usdCost !== undefined ? usdCost : 0,
        costType: costType || 'fixed',
        config: config || null,
      },
    });

    // Log audit event
    await createAuditLog({
      eventType: AuditLogEventType.OtherEvent,
      description: `Admin created shop item: ${name}`,
      targetUserId: user.id,
      actorUserId: user.id,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        price: item.price,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error creating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 