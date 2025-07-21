import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';
import { verifyShopItemAdminAccess } from '@/lib/shop-admin-auth';

// PUT - Update shop item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const authResult = await verifyShopItemAdminAccess();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;

    const { itemId } = params;
    const { name, description, image, price, usdCost, costType, config, active, useRandomizedPricing } = await request.json();

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

    // Fetch previous item state for audit log
    const previousItem = await prisma.shopItem.findUnique({ where: { id: itemId } });

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
        useRandomizedPricing: useRandomizedPricing !== undefined ? useRandomizedPricing : true,
      },
    });

    const changedFields: Record<string, { old: unknown, new: unknown }> = {};
    if (previousItem) {
      if (previousItem.name !== name) changedFields.name = { old: previousItem.name, new: name };
      if (previousItem.description !== description) changedFields.description = { old: previousItem.description, new: description };
      if (previousItem.image !== image) changedFields.image = { old: previousItem.image, new: image };
      if (previousItem.price !== price) changedFields.price = { old: previousItem.price, new: price };
      if (previousItem.usdCost !== usdCost) changedFields.usdCost = { old: previousItem.usdCost, new: usdCost };
      if (previousItem.costType !== costType) changedFields.costType = { old: previousItem.costType, new: costType };
      if (JSON.stringify(previousItem.config) !== JSON.stringify(config)) changedFields.config = { old: previousItem.config, new: config };
      if (previousItem.active !== active) changedFields.active = { old: previousItem.active, new: active };
    }

    await createAuditLog({
      eventType: AuditLogEventType.OtherEvent,
      description: `Admin updated shop item: ${name}. Old price: ${previousItem?.price}, new price: ${item.price}`,
      targetUserId: user.id,
      actorUserId: user.id,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        changedFields,
        previous: previousItem,
        updated: item,
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
    const authResult = await verifyShopItemAdminAccess();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;

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