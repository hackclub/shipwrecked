import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Whitelist of admin users who can access shop admin features
const SHOP_ADMIN_WHITELIST = (process.env.SHOP_ADMIN_WHITELIST || process.env.SHOP_ORDERS_ADMIN_WHITELIST || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

export type ShopAdminAuthResult = {
  success: true;
  user: {
    id: string;
    email: string;
    role: string;
  };
} | {
  success: false;
  error: string;
  status: number;
}

/**
 * Verifies that the current user is authenticated and whitelisted for shop admin access
 * @returns Promise<ShopAdminAuthResult> - Success with user data or error with details
 */
export async function verifyShopAdminAccess(): Promise<ShopAdminAuthResult> {
  try {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user?.email) {
      return {
        success: false,
        error: 'Unauthorized',
        status: 401
      };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
        isAdmin: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    // Check if user has Admin role
    if (user.role !== 'Admin' && !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }

    // Check if user is in shop admin whitelist
    if (!SHOP_ADMIN_WHITELIST.includes(user.email)) {
      return {
        success: false,
        error: 'Access denied. Only authorized shop administrators can access this resource.',
        status: 403
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

  } catch (error) {
    console.error('Shop admin auth error:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    };
  }
}

/**
 * Checks if an email is in the shop admin whitelist
 * @param email - Email to check
 * @returns boolean - True if email is whitelisted
 */
export function isShopAdminWhitelisted(email: string): boolean {
  return SHOP_ADMIN_WHITELIST.includes(email);
}

/**
 * Gets the list of whitelisted shop admin emails (for debugging/testing)
 * @returns string[] - Array of whitelisted emails
 */
export function getShopAdminWhitelist(): string[] {
  return [...SHOP_ADMIN_WHITELIST];
} 