import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';
import { getProjectHistogramAnalysis, classifyProjectHours } from '@/lib/projectHistogram';

// GET - Get histogram analysis data
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
    const classifyHours = searchParams.get('classifyHours');

    // If classifyHours parameter is provided, classify those hours
    if (classifyHours) {
      const hours = parseFloat(classifyHours);
      if (isNaN(hours) || hours < 0) {
        return NextResponse.json(
          { error: 'Invalid hours value. Must be a positive number.' },
          { status: 400 }
        );
      }

      const classification = await classifyProjectHours(hours);
      return NextResponse.json(classification);
    }

    // Otherwise, return the full histogram analysis
    const analysis = await getProjectHistogramAnalysis();
    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error fetching project histogram analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch histogram analysis' },
      { status: 500 }
    );
  }
}

// POST - Classify multiple project hours at once
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
    
    if (!Array.isArray(body.hoursArray)) {
      return NextResponse.json(
        { error: 'Request body must contain a "hoursArray" field with an array of numbers' },
        { status: 400 }
      );
    }

    const classifications = await Promise.all(
      body.hoursArray.map(async (hours: number) => {
        if (typeof hours !== 'number' || hours < 0) {
          return {
            hours,
            error: 'Invalid hours value'
          };
        }

        const classification = await classifyProjectHours(hours);
        return {
          hours,
          ...classification
        };
      })
    );

    return NextResponse.json({ classifications });

  } catch (error) {
    console.error('Error classifying project hours:', error);
    return NextResponse.json(
      { error: 'Failed to classify project hours' },
      { status: 500 }
    );
  }
} 