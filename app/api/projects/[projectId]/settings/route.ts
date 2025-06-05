import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../../auth/[...nextauth]/route';

// PATCH - Update project settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();

    // Find the project and check ownership
    const project = await prisma.project.findUnique({
      where: {
        projectID: projectId,
      },
      select: {
        projectID: true,
        userId: true,
        chat_enabled: true,
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if the user is the owner of the project
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own projects' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};

    // Handle chat_enabled setting
    if (typeof body.chat_enabled === 'boolean') {
      updateData.chat_enabled = body.chat_enabled;

      if (body.chat_enabled && !project.chat_enabled) {
        // Enabling chat for the first time - create a default chat room
        await prisma.chatRoom.create({
          data: {
            projectID: projectId,
            name: 'General Discussion'
          }
        });
      } else if (!body.chat_enabled && project.chat_enabled) {
        // Disabling chat - we'll keep the chat rooms and messages for now
        // but they won't be accessible from the UI. This preserves conversation history
        // in case the user re-enables chat later.
        console.log(`Chat disabled for project ${projectId}. Chat rooms and messages preserved.`);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: {
        projectID: projectId,
      },
      data: updateData,
      select: {
        projectID: true,
        chat_enabled: true,
      }
    });

    return NextResponse.json(updatedProject);

  } catch (error) {
    console.error('Error updating project settings:', error);
    return NextResponse.json({ error: 'Failed to update project settings' }, { status: 500 });
  }
} 