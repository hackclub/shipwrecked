import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    // Check for valid session - user must be logged in
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch tags that start with 'challenge' and have at least one project association
    const challengeTags = await prisma.tag.findMany({
      where: {
        name: {
          startsWith: 'challenge'
        },
        projectTags: {
          some: {
            // Only include tags that are actually used by projects
            project: {
              projectTags: {
                some: {
                  tag: {
                    name: 'island-project'
                  }
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        _count: {
          select: {
            projectTags: {
              where: {
                project: {
                  projectTags: {
                    some: {
                      tag: {
                        name: 'island-project'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to include project counts
    const tagsWithCounts = challengeTags.map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      projectCount: tag._count.projectTags
    }));

    return NextResponse.json(tagsWithCounts);

  } catch (error) {
    console.error('Error fetching challenge tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge tags' },
      { status: 500 }
    );
  }
} 