import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';

// PATCH - Update project flags (shipped, viral, approved)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate projectID is provided
    if (!body.projectID) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check which flags are being updated
    const updateData: any = {};
    
    if (typeof body.shipped === 'boolean') updateData.shipped = body.shipped;
    if (typeof body.viral === 'boolean') updateData.viral = body.viral;
    if (typeof body.approved === 'boolean') updateData.approved = body.approved;
    if (typeof body.in_review === 'boolean') updateData.in_review = body.in_review;

    // If no valid flags provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid flags provided to update' }, { status: 400 });
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: {
        projectID: body.projectID,
      },
      data: updateData,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project flags:', error);
    return NextResponse.json({ error: 'Failed to update project flags' }, { status: 500 });
  }
} 