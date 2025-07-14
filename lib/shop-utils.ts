import { ShopItem, ShopOrder } from '@prisma/client';

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
    if (item.config?.dollars_per_hour) {
      // Travel stipend: USD = hours * dollars_per_hour
      const hours = order.config?.hours || order.quantity;
      return hours * item.config.dollars_per_hour;
    }
    if (item.config?.progress_per_hour) {
      // Island progress: USD = percent * $14 (or use progress_per_hour as percent per unit)
      const percent = order.config?.percent || (order.quantity * item.config.progress_per_hour);
      return percent * 14;
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
 * Formula: shells = usdCost * 10 * hours
 * @param usdCost USD cost of the item
 * @param dollarsPerHour Global dollars per hour rate
 * @returns Shell price
 */
export function calculateShellPrice(usdCost: number, dollarsPerHour: number): number {
  if (dollarsPerHour <= 0) return 0;
  return Math.round(usdCost * 10 * dollarsPerHour);
} 