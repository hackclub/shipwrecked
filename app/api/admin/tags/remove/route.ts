import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin role or isAdmin flag
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request data
    const data = await request.json();
    const { entityType, entityId, tagId, associationId } = data;

    // Validate required fields
    if (!entityType || (!associationId && (!entityId || !tagId))) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType and either associationId or both entityId and tagId' },
        { status: 400 }
      );
    }

    // Validate entityType
    if (entityType !== 'user' && entityType !== 'project') {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be "user" or "project"' },
        { status: 400 }
      );
    }

    let deletedAssociation;

    if (entityType === 'user') {
      if (associationId) {
        // Delete by association ID
        deletedAssociation = await prisma.userTag.delete({
          where: { id: associationId },
          include: {
            tag: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      } else {
        // Delete by user ID and tag ID
        deletedAssociation = await prisma.userTag.delete({
          where: {
            userId_tagId: {
              userId: entityId,
              tagId: tagId
            }
          },
          include: {
            tag: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      }
    } else {
      if (associationId) {
        // Delete by association ID
        deletedAssociation = await prisma.projectTag.delete({
          where: { id: associationId },
          include: {
            tag: true,
            project: {
              select: {
                projectID: true,
                name: true,
                userId: true
              }
            }
          }
        });
      } else {
        // Delete by project ID and tag ID
        deletedAssociation = await prisma.projectTag.delete({
          where: {
            projectID_tagId: {
              projectID: entityId,
              tagId: tagId
            }
          },
          include: {
            tag: true,
            project: {
              select: {
                projectID: true,
                name: true,
                userId: true
              }
            }
          }
        });
      }
    }

    console.log(`Successfully removed tag "${deletedAssociation.tag.name}" from ${entityType} ${entityId || 'via association'}`);

    // Get the entity ID for the response
    let responseEntityId = entityId;
    if (!responseEntityId) {
      if (entityType === 'user' && 'user' in deletedAssociation) {
        responseEntityId = deletedAssociation.user.id;
      } else if (entityType === 'project' && 'project' in deletedAssociation) {
        responseEntityId = deletedAssociation.project.projectID;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tag "${deletedAssociation.tag.name}" successfully removed from ${entityType}`,
      data: {
        deletedAssociation,
        entityType,
        entityId: responseEntityId
      }
    });

  } catch (error) {
    console.error('Error removing tag:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Tag association not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove tag' },
      { status: 500 }
    );
  }
} 