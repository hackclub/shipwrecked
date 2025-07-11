import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request: Request) {
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
    const { tagId, description, color } = data;

    // Validate required fields
    if (!tagId) {
      return NextResponse.json(
        { error: 'Missing required field: tagId' },
        { status: 400 }
      );
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Update the tag
    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        description: description !== undefined ? description : existingTag.description,
        color: color !== undefined ? color : existingTag.color,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            userTags: true,
            projectTags: true
          }
        }
      }
    });

    console.log(`Successfully updated tag "${updatedTag.name}" (ID: ${tagId})`);

    return NextResponse.json({
      success: true,
      message: `Tag "${updatedTag.name}" updated successfully`,
      data: {
        tag: {
          ...updatedTag,
          userCount: updatedTag._count.userTags,
          projectCount: updatedTag._count.projectTags,
          totalUsage: updatedTag._count.userTags + updatedTag._count.projectTags
        }
      }
    });

  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
} 