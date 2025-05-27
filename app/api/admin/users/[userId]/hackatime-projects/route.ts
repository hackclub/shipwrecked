import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { fetchHackatimeProjects } from '@/lib/hackatime';

// GET - Retrieve all Hackatime projects for a user (admin only)
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  
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

  try {
    // Get the user's Hackatime ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        name: true,
        email: true,
        hackatimeId: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.hackatimeId) {
      return NextResponse.json({ 
        error: 'User does not have a Hackatime account connected',
        projects: []
      }, { status: 200 });
    }

    // Get all projects for this user
    const hackatimeProjects = await fetchHackatimeProjects(user.hackatimeId);
    
    // Get all project names
    const projectNames = hackatimeProjects.map(project => project.name);
    
    // Get all projects already linked to any Shipwrecked project for this user
    const linkedProjects = await prisma.hackatimeProjectLink.findMany({
      where: {
        project: {
          userId: userId
        }
      },
      select: {
        hackatimeName: true
      }
    });
    
    const linkedProjectNames = linkedProjects.map(link => link.hackatimeName);
    
    // Filter out already linked projects
    const availableProjects = projectNames.filter(name => !linkedProjectNames.includes(name));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hackatimeId: user.hackatimeId
      },
      projects: availableProjects,
      totalProjects: projectNames.length,
      linkedProjects: linkedProjectNames.length,
      availableProjects: availableProjects.length
    });
  } catch (error) {
    console.error('Error getting Hackatime projects:', error);
    return NextResponse.json(
      { error: 'Failed to get Hackatime projects' },
      { status: 500 }
    );
  }
} 