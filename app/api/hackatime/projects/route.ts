import { fetchHackatimeProjects } from "@/lib/hackatime";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/requireUserSession";

export async function GET(request: Request) {
    // console.log('🎯 /api/hackatime/projects GET request received');
    try {
        console.log('🔒 Verifying user session...');
        const user = await requireUserSession();
        console.log('✅ User authenticated:', { userId: user.id });
        
        // console.log('🔍 Looking up user slack ID in database...');
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { slack: true }
        });
        // console.log('📋 Database lookup result:', dbUser);

        if (!dbUser?.slack) {
            console.log('⚠️ No slack ID found for user, returning empty array');
            return Response.json([]);
        }
        // console.log('✨ Found slack ID:', dbUser.slack);

        console.log('📡 Fetching projects from Hackatime API...');
        const projects = await fetchHackatimeProjects(dbUser.slack);
        // console.log('📦 Received Hackatime projects:', {
        //     count: projects.length,
        //     projectNames: projects.map(p => p.name)
        // });

        // console.log('🏁 Successfully returning projects');
        return Response.json(projects);
    } catch (error) {
        console.error('❌ Error in /api/hackatime/projects:', error);
        if (error instanceof Error) {
            console.error('  Error message:', error.message);
            console.error('  Stack trace:', error.stack);
        }
        return Response.json({ error: 'Failed to fetch Hackatime projects' }, { status: 500 });
    }
} 