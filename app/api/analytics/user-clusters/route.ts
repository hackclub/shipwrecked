import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';
import { getUserClusterAnalysis, classifyUser } from '@/lib/userClustering';

// GET - Get user cluster analysis data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';
    
    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin or Reviewer role' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classifyUserId = searchParams.get('classifyUser');

    // If classifyUser parameter is provided, classify that user
    if (classifyUserId) {
      try {
        const classification = await classifyUser(classifyUserId);
        return NextResponse.json(classification);
      } catch (error) {
        return NextResponse.json(
          { error: 'User not found or classification failed' },
          { status: 404 }
        );
      }
    }

    // Otherwise, return the full cluster analysis
    const analysis = await getUserClusterAnalysis();
    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error fetching user cluster analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user cluster analysis' },
      { status: 500 }
    );
  }
}

// POST - Classify multiple users at once
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';
    
    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin or Reviewer role' }, { status: 403 });
    }

    const body = await request.json();
    
    if (!Array.isArray(body.userIds)) {
      return NextResponse.json(
        { error: 'Request body must contain a "userIds" field with an array of user IDs' },
        { status: 400 }
      );
    }

    const classifications = await Promise.all(
      body.userIds.map(async (userId: string) => {
        try {
          const classification = await classifyUser(userId);
          return {
            userId,
            ...classification
          };
        } catch (error) {
          return {
            userId,
            error: 'Classification failed'
          };
        }
      })
    );

    return NextResponse.json({ classifications });

  } catch (error) {
    console.error('Error classifying users:', error);
    return NextResponse.json(
      { error: 'Failed to classify users' },
      { status: 500 }
    );
  }
} 