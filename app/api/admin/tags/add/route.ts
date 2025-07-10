import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
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
    const { entityType, entityId, tagName, tagDescription, tagColor } = data;

    // Validate required fields
    if (!entityType || !entityId || !tagName) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, and tagName are required' },
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

    // Verify entity exists
    if (entityType === 'user') {
      const userExists = await prisma.user.findUnique({
        where: { id: entityId }
      });
      if (!userExists) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } else {
      const projectExists = await prisma.project.findFirst({
        where: { projectID: entityId }
      });
      if (!projectExists) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Ensure tag name is lowercase
    const normalizedTagName = tagName.toLowerCase().trim();

    // Find or create the tag
    let tag = await prisma.tag.findUnique({
      where: { name: normalizedTagName }
    });

    if (!tag) {
      // Create new tag if it doesn't exist
      tag = await prisma.tag.create({
        data: {
          name: normalizedTagName,
          description: tagDescription || null,
          color: tagColor || null
        }
      });
      console.log(`Created new tag: ${normalizedTagName}`);
    }

    // Check if the tag is already associated with the entity
    let existingAssociation;
    if (entityType === 'user') {
      existingAssociation = await prisma.userTag.findUnique({
        where: {
          userId_tagId: {
            userId: entityId,
            tagId: tag.id
          }
        }
      });
    } else {
      existingAssociation = await prisma.projectTag.findUnique({
        where: {
          projectID_tagId: {
            projectID: entityId,
            tagId: tag.id
          }
        }
      });
    }

    if (existingAssociation) {
      return NextResponse.json(
        { error: `Tag "${normalizedTagName}" is already associated with this ${entityType}` },
        { status: 409 }
      );
    }

    // Create the association
    let association;
    if (entityType === 'user') {
      association = await prisma.userTag.create({
        data: {
          userId: entityId,
          tagId: tag.id
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
    } else {
      association = await prisma.projectTag.create({
        data: {
          projectID: entityId,
          tagId: tag.id
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

    console.log(`Successfully added tag "${normalizedTagName}" to ${entityType} ${entityId}`);

    return NextResponse.json({
      success: true,
      message: `Tag "${normalizedTagName}" successfully added to ${entityType}`,
      data: {
        tag,
        association,
        entityType,
        entityId
      }
    });

  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json(
      { error: 'Failed to add tag' },
      { status: 500 }
    );
  }
} 