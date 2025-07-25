import { ShopItem, ShopOrder } from '../app/generated/prisma/client';
import { createHash } from 'crypto';

/**
 * Create a high-quality deterministic random number based on user ID, item ID, and hour
 * Uses SHA256 for a high-quality hash (evenly-distributed and has the avalanche effect)
 */
function createHourlyRandom(userId: string, itemId: string, hour: number): number {
  // Create a combined seed string
  const combined = `${userId}-${itemId}-${hour}`;

  // Use SHA256 for a high-quality hash
  // We could use crypto.subtle.digest without importing Node.js 'crypto', but that's async
  const hash = createHash('sha256').update(combined).digest('hex');

  // Convert the first 8 characters of the hash (32 bits) to a number between 0 and 1
  const subHash = hash.substring(0, 8);
  const intHash = parseInt(subHash, 16);
  return intHash / 0xffffffff;
}

/**
 * Calculate randomized price for a user based on hourly rotation
 * Uses improved hash distribution to ensure fair pricing across all users
 * Final price is clamped between floor(basePrice * minPercent/100) and ceil(basePrice * maxPercent/100)
 * @param userId User ID for deterministic randomization
 * @param itemId Item ID for deterministic randomization  
 * @param basePrice Base price in shells
 * @param minPercent Minimum percentage (e.g., 90 for 10% off)
 * @param maxPercent Maximum percentage (e.g., 110 for 10% more)
 * @returns Randomized price in shells, clamped to percentage bounds
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
  
  // Create high-quality deterministic random number for this user/item/hour combination
  const random = createHourlyRandom(userId, itemId, currentHour);
  
  // Ensure we're working with valid percentages
  const safeMinPercent = Math.max(1, minPercent);
  const safeMaxPercent = Math.max(safeMinPercent + 1, maxPercent);
  
  // Calculate price bounds from percentages
  const minPrice = Math.floor(basePrice * safeMinPercent / 100);
  const maxPrice = Math.ceil(basePrice * safeMaxPercent / 100);
  
  // Calculate percentage multiplier - this ensures full sliding scale from min to max
  const percentRange = safeMaxPercent - safeMinPercent;
  const randomPercent = safeMinPercent + (random * percentRange);
  const priceMultiplier = randomPercent / 100;
  
  // Calculate randomized price and clamp between min/max bounds
  const randomizedPrice = Math.round(basePrice * priceMultiplier);
  const clampedPrice = Math.max(minPrice, Math.min(maxPrice, randomizedPrice));
  
  // Ensure price is at least 1
  const finalPrice = Math.max(1, clampedPrice);
  
  // Optional: Add debug logging (remove in production)
  // console.log(`User ${userId.slice(0,8)}..., Item ${itemId}, Hour ${currentHour}: random=${random.toFixed(4)}, percent=${randomPercent.toFixed(1)}%, price=${basePrice}->${finalPrice}`);
  
  return finalPrice;
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

  // The config determines what the user gets (hours, progress, etc.), but not the cost
  return item.usdCost * order.quantity;
}

/**
 * Calculate shell price based on USD cost and global dollars per hour rate
 * Formula: shells = round((usdCost / dollarsPerHour) * phi * 10)
 * @param usdCost USD cost of the item
 * @param dollarsPerHour Global dollars per hour rate
 * @returns Shell price
 */
export function calculateShellPrice(usdCost: number, dollarsPerHour: number): number {
  if (dollarsPerHour <= 0) return 0;
  const phi = (1 + Math.sqrt(5)) / 2;
  const hours = usdCost / dollarsPerHour;
  return Math.round(hours * phi * 10);
} 