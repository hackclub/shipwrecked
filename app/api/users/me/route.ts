import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { isShopAdminWhitelisted } from '@/lib/shop-admin-auth';

// Whitelist of admin users who can access shop orders (legacy)
const SHOP_ORDERS_ADMIN_WHITELIST = (process.env.SHOP_ORDERS_ADMIN_WHITELIST || '').split(',').map(e => e.trim()).filter(Boolean);

export async function GET() {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the user ID from the session
    const userId = session.user.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }
    
    // Fetch the user's fresh data from the database
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        isAdmin: true,
        status: true,
        hackatimeId: true,
        slack: true,
        identityToken: true,
        purchasedProgressHours: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add shop admin status to the response
    const isShopOrdersAdmin = user.email && SHOP_ORDERS_ADMIN_WHITELIST.includes(user.email);
    const isShopAdmin = user.email && isShopAdminWhitelisted(user.email);

    return NextResponse.json({ ...user, isShopOrdersAdmin, isShopAdmin });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
} 