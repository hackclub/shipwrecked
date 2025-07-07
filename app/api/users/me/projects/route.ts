import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
    // Check authentication
    const session = await getServerSession(opts);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the user ID from the session
        const userId = session.user.id;

        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        // Get projects with their Hackatime links for the current user
        const projects = await prisma.project.findMany({
            where: {
                userId: userId
            },
            include: {
                hackatimeLinks: true
            }
        });

        // Enhance the project data with computed properties
        const enhancedProjects = projects.map((project) => {
            // Calculate total raw hours from all links, applying individual overrides when available
            const rawHours = project.hackatimeLinks.reduce(
                (sum, link) => {
                    // Use the link's hoursOverride if it exists, otherwise use rawHours
                    const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
                        ? link.hoursOverride
                        : (typeof link.rawHours === 'number' ? link.rawHours : 0);

                    return sum + effectiveHours;
                },
                0
            );

            return {
                ...project,
                rawHours,
                hackatimeLinks: project.hackatimeLinks
            };
        });

        return NextResponse.json(enhancedProjects);
    } catch (error) {
        console.error('Error fetching user projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user projects' },
            { status: 500 }
        );
    }
}
