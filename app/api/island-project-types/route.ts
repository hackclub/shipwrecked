import { NextResponse } from 'next/server';
import { getIslandProjectTypesForClient } from '@/lib/islandProjectTypes';

/**
 * API endpoint to get available island project types
 * This allows the client to access environment variables securely
 */
export async function GET() {
  try {
    const projectTypes = getIslandProjectTypesForClient();
    return NextResponse.json(projectTypes);
  } catch (error) {
    console.error('Error fetching island project types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch island project types' },
      { status: 500 }
    );
  }
}