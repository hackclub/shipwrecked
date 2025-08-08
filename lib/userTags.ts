import { prisma } from '@/lib/prisma';

/**
 * Check if a user has a specific tag
 * @param userId - The user ID to check
 * @param tagName - The tag name to look for (case-insensitive)
 * @returns Promise<boolean> - True if user has the tag, false otherwise
 */
export async function userHasTag(userId: string, tagName: string): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || !tagName) {
      console.warn(`Invalid input for userHasTag: userId=${userId}, tagName=${tagName}`);
      return false;
    }

    const userTag = await prisma.userTag.findFirst({
      where: {
        userId,
        tag: {
          name: tagName.toLowerCase().trim()
        }
      }
    });
    
    return !!userTag;
  } catch (error) {
    console.error(`Error checking if user ${userId} has tag "${tagName}":`, error);
    // Return false on any error to avoid breaking authentication flows
    return false;
  }
}

/**
 * Check if a user is an island attendee (has the 'attendee' tag)
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is an attendee, false otherwise
 */
export async function isAttendee(userId: string): Promise<boolean> {
  return userHasTag(userId, 'attendee');
}

/**
 * Get all tags for a user
 * @param userId - The user ID to get tags for
 * @returns Promise<Array<{id: string, name: string, description?: string, color?: string}>>
 */
export async function getUserTags(userId: string) {
  try {
    const userTags = await prisma.userTag.findMany({
      where: { userId },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true
          }
        }
      }
    });
    
    return userTags.map(ut => ut.tag);
  } catch (error) {
    console.error(`Error fetching tags for user ${userId}:`, error);
    return [];
  }
}