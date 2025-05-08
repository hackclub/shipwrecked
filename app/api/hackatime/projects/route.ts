import { fetchHackatimeProjects, lookupHackatimeIdByEmail, lookupHackatimeIdBySlack } from "@/lib/hackatime";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/requireUserSession";

export async function GET(request: Request) {
    // console.log('🎯 /api/hackatime/projects GET request received');
    try {
        console.log('🔒 Verifying user session...');
        const user = await requireUserSession();
        console.log('✅ User authenticated:', { userId: user.id });
        
        console.log('🔍 Looking up user in database...');
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });
        // console.log('📋 Database lookup result:', dbUser);

        if (!dbUser) {
            console.error('❌ User not found in database');
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        let hackatimeId = dbUser.hackatimeId;

        // If we don't have a Hackatime ID, try to find it
        if (!hackatimeId) {
            console.log('🔄 No Hackatime ID found, attempting to look it up...');
            
            // Try email first
            hackatimeId = await lookupHackatimeIdByEmail(dbUser.email);
            
            // If email lookup fails and we have a Slack ID, try that
            if (!hackatimeId && dbUser.slack) {
                console.log('📧 Email lookup failed, trying Slack ID...');
                hackatimeId = await lookupHackatimeIdBySlack(dbUser.slack);
            }

            // If we found an ID, save it
            if (hackatimeId) {
                console.log('💾 Saving found Hackatime ID to database...');
                await prisma.user.update({
                    where: { id: user.id },
                    data: { hackatimeId: hackatimeId.toString() }
                });
            } else {
                console.log('⚠️ No Hackatime ID found for user');
                
                return Response.json([]);
            }
        }
        // console.log('✨ Found Hackatime ID:', dbUser.hackatimeId);

        console.log('📡 Fetching projects from Hackatime API...');
        const projects = await fetchHackatimeProjects(hackatimeId);
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