import { ShopItem, ShopOrder } from '../app/generated/prisma/client';

/**
 * Create a deterministic random number based on user ID, item ID, and hour
 * This ensures the same user gets the same price for the same item within an hour
 */
function createHourlyRandom(userId: string, itemId: string, hour: number): number {
  // Create a simple hash from the combined string
  const combined = `${userId}-${itemId}-${hour}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to a number between 0 and 1
  return Math.abs(hash) / 2147483647;
}

/**
 * Calculate randomized price for a user based on hourly rotation
 * @param userId User ID for deterministic randomization
 * @param itemId Item ID for deterministic randomization  
 * @param basePrice Base price in shells
 * @param minPercent Minimum percentage (e.g., 90 for 10% off)
 * @param maxPercent Maximum percentage (e.g., 110 for 10% more)
 * @returns Randomized price in shells
 */
export function calculateRandomizedPrice(
  userId: string,
  itemId: string,
  basePrice: number,
  minPercent: number = 90,
  maxPercent: number = 110
): number {
  // Get current hour for this user (deterministic per hour)
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  
  // Create deterministic random number for this user/item/hour combination
  const random = createHourlyRandom(userId, itemId, currentHour);
  
  // Calculate percentage multiplier
  const percentRange = maxPercent - minPercent;
  const priceMultiplier = (minPercent + (random * percentRange)) / 100;
  
  // Calculate final price and round to nearest integer
  const randomizedPrice = Math.round(basePrice * priceMultiplier);
  
  // Ensure price is at least 1
  return Math.max(1, randomizedPrice);
}

/**
 * Get the current hour timestamp for pricing calculations
 * @returns Current hour as number
 */
export function getCurrentHour(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60));
}

/**
 * Compute the USD value of a shop order.
 * @param item The ShopItem (with costType, usdCost, config)
 * @param order The ShopOrder (with quantity, config)
 * @returns USD value (number)
 */
export function computeOrderUsdValue(item: ShopItem, order: ShopOrder): number {
  if (item.costType === 'fixed') {
    return item.usdCost * order.quantity;
  }
  if (item.costType === 'config') {
    // Config-driven logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((item.config as any)?.dollars_per_hour) {
      // Travel stipend: USD = hours * dollars_per_hour
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hours = (order.config as any)?.hours || order.quantity;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return hours * (item.config as any).dollars_per_hour;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((item.config as any)?.progress_per_hour) {
      // Island progress: USD = percent * $10 (or use progress_per_hour as percent per unit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const percent = (order.config as any)?.percent || (order.quantity * (item.config as any).progress_per_hour);
      return percent * 10;
    }
    // For other config items, use usdCost if present
    if (item.usdCost && item.usdCost > 0) {
      return item.usdCost * order.quantity;
    }
    return 0;
  }
  // Fallback
  return 0;
}

/**
 * Calculate shell price based on USD cost and global dollars per hour rate
 * Formula: shells = (usdCost / dollarsPerHour) * phi * 10
 * @param usdCost USD cost of the item
 * @param dollarsPerHour Global dollars per hour rate
 * @returns Shell price
 */
export function calculateShellPrice(usdCost: number, dollarsPerHour: number): number {
  if (dollarsPerHour <= 0) return 0;
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
  const hours = usdCost / dollarsPerHour; // Convert USD to hours
  return Math.round(hours * phi * 10);
} 