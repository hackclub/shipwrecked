import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { 
  addHackatimeProjectLink, 
  getHackatimeProjectLinks,
  removeHackatimeProjectLink,
  removeHackatimeProjectLinkByName,
  syncHackatimeProjectHours,
  getProjectTotalRawHours,
  getProjectEffectiveHours
} from '@/lib/hackatime-links';
import { prisma } from '@/lib/prisma';
import { fetchHackatimeProjects } from '@/lib/hackatime';

// Helper to verify project ownership
async function verifyProjectAccess(projectID: string, session: any) {
  const userId = session?.user?.id;
  if (!userId) return false;

  const project = await prisma.project.findUnique({
    where: { projectID },
    select: { userId: true }
  });

  // Allow access if the user owns the project or is an admin
  return (project?.userId === userId || session.user.isAdmin === true || session.user.role === 'Admin');
}

// GET - Retrieve all Hackatime project links for a project
export async function GET(
  request: Request,
  { params }: { params: { projectID: string } }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectID = params.projectID;
    const hasAccess = await verifyProjectAccess(projectID, session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all links for this project
    const links = await getHackatimeProjectLinks(projectID);
    
    // Get the total hours
    const totalRawHours = await getProjectTotalRawHours(projectID);
    const effectiveHours = await getProjectEffectiveHours(projectID);

    return NextResponse.json({
      links,
      totalRawHours,
      effectiveHours
    });
  } catch (error) {
    console.error('Error getting Hackatime project links:', error);
    return NextResponse.json(
      { error: 'Failed to get Hackatime project links' },
      { status: 500 }
    );
  }
}

// POST - Add a new Hackatime project link
export async function POST(
  request: Request,
  { params }: { params: { projectID: string } }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectID = params.projectID;
    const hasAccess = await verifyProjectAccess(projectID, session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const { hackatimeName } = await request.json();
    
    if (!hackatimeName) {
      return NextResponse.json(
        { error: 'Hackatime project name is required' },
        { status: 400 }
      );
    }

    // Add the link
    const link = await addHackatimeProjectLink(projectID, hackatimeName);

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error adding Hackatime project link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to add Hackatime project link: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove a Hackatime project link
export async function DELETE(
  request: Request,
  { params }: { params: { projectID: string } }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectID = params.projectID;
    const hasAccess = await verifyProjectAccess(projectID, session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // SECURITY CHECK: Only allow admins to unlink Hackatime projects via API
    const isAdmin = session.user.isAdmin === true || session.user.role === 'Admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can unlink Hackatime projects' },
        { status: 403 }
      );
    }

    // Get the Hackatime project name from the URL
    const url = new URL(request.url);
    const hackatimeName = url.searchParams.get('hackatimeName');
    
    if (!hackatimeName) {
      return NextResponse.json(
        { error: 'Hackatime project name is required as a query parameter' },
        { status: 400 }
      );
    }

    // Get the current number of links
    const links = await getHackatimeProjectLinks(projectID);
    
    // Don't allow removing the last link
    if (links.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last Hackatime project link. A project must have at least one Hackatime project.' },
        { status: 400 }
      );
    }

    // Remove the link using the new function that works with hackatime project name
    await removeHackatimeProjectLinkByName(projectID, hackatimeName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing Hackatime project link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to remove Hackatime project link: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH - Sync Hackatime project hours
export async function PATCH(
  request: Request,
  { params }: { params: { projectID: string } }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectID = params.projectID;
    const hasAccess = await verifyProjectAccess(projectID, session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sync hours for all linked Hackatime projects
    await syncHackatimeProjectHours(projectID);

    // Get updated links
    const updatedLinks = await getHackatimeProjectLinks(projectID);

    return NextResponse.json(updatedLinks);
  } catch (error) {
    console.error('Error syncing Hackatime project hours:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to sync Hackatime project hours: ${errorMessage}` },
      { status: 500 }
    );
  }
} 