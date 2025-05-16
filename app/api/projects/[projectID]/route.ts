import { requireUserSession } from "@/lib/requireUserSession";
import { prisma } from "@/lib/prisma";
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';
import metrics from "@/metrics";

export async function DELETE(
    request: Request,
    { params }: { params: { projectID: string } }
) {
    console.log('[DELETE] Received request to delete project');
    try {
        const user = await requireUserSession();
        console.log(`[DELETE] Authenticated user ${user.id}`);
        
        // Use params in a way that will work with future Next.js versions
        // where params might be a Promise
        const { projectID } = params;
        console.log(`[DELETE] Attempting to delete project ${projectID}`);
        
        // Fetch project details before deletion to use in audit log
        const projectToDelete = await prisma.project.findUnique({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            }
        });
        
        if (!projectToDelete) {
            return Response.json({
                success: false,
                error: 'Project not found or you do not have permission to delete it'
            }, { status: 404 });
        }
        
        // Create audit log for project deletion BEFORE deletion
        console.log(`[DELETE] Creating audit log for project deletion: ${projectID}`);
        const auditLogResult = await logProjectEvent({
            eventType: AuditLogEventType.ProjectDeleted,
            description: projectToDelete.hackatime 
                ? `Project "${projectToDelete.name}" was deleted (Hackatime: ${projectToDelete.hackatime})` 
                : `Project "${projectToDelete.name}" was deleted`,
            projectId: projectID,
            userId: user.id,
            actorUserId: user.id,
            metadata: {
                projectDetails: {
                    projectID: projectToDelete.projectID,
                    name: projectToDelete.name,
                    description: projectToDelete.description,
                    hackatime: projectToDelete.hackatime || null
                }
            }
        });
        
        console.log(`[DELETE] Audit log creation result: ${auditLogResult ? 'Success' : 'Failed'}`);
        
        // Delete any reviews associated with the project
        await prisma.review.deleteMany({
            where: {
                projectID: projectID
            }
        });
        
        // Delete the project
        await prisma.project.delete({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            }
        });
        
        console.log(`[DELETE] Successfully deleted project ${projectID}`);
        metrics.increment("success.delete_project", 1);
        
        return Response.json({ success: true });
    } catch (err) {
        console.error('[DELETE] Failed to delete project:', err);
        metrics.increment("errors.delete_project", 1);
        return Response.json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
} 