import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '../../auth/[...nextauth]/route';

// GET - Retrieve all Hackatime project names that are already linked by any user
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all linked Hackatime project names from all users
    const linkedProjects = await prisma.hackatimeProjectLink.findMany({
      select: {
        hackatimeName: true
      }
    });
    
    // Extract just the project names to a string array
    const linkedProjectNames = linkedProjects.map(link => link.hackatimeName);
    
    // Remove duplicates
    const uniqueLinkedProjects = [...new Set(linkedProjectNames)];
    
    return NextResponse.json({
      linkedProjects: uniqueLinkedProjects,
      count: uniqueLinkedProjects.length
    });
  } catch (error) {
    console.error('Error fetching linked Hackatime projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch linked Hackatime projects' },
      { status: 500 }
    );
  }
} 