import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin or reviewer role
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';
    
    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Admin or Reviewer access required' }, { status: 403 });
    }

    // Fetch all tags ordered by name
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        _count: {
          select: {
            userTags: true,
            projectTags: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to include usage counts
    const tagsWithUsage = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      createdAt: tag.createdAt,
      userCount: tag._count.userTags,
      projectCount: tag._count.projectTags,
      totalUsage: tag._count.userTags + tag._count.projectTags
    }));

    return NextResponse.json(tagsWithUsage);

  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
} 