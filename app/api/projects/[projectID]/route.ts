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
        
        // Get the referer to check where the request is coming from
        const referer = request.headers.get('referer') || '';
        const isFromAdminPanel = referer.includes('/admin/projects');
        
        // Only allow deletion from the admin panel
        if (!isFromAdminPanel) {
            return Response.json({
                success: false,
                error: 'Sorry, you cannot unlink your hackatime project from Shipwrecked.'
            }, { status: 403 });
        }
        
        // Check if user is an admin
        const isAdmin = user.role === 'Admin' || user.isAdmin === true;
        if (!isAdmin) {
            return Response.json({
                success: false,
                error: 'Only administrators can delete projects'
            }, { status: 403 });
        }
        
        // Use params in a way that will work with future Next.js versions
        // where params might be a Promise
        const { projectID } = params;
        console.log(`[DELETE] Admin attempting to delete project ${projectID}`);
        
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
            // For admins, try to find the project without user restriction
            const adminProjectFind = await prisma.project.findUnique({
                where: { projectID },
                include: { user: true }
            });
            
            if (!adminProjectFind) {
                return Response.json({
                    success: false,
                    error: 'Project not found'
                }, { status: 404 });
            }
            
            // Create audit log for admin-initiated project deletion
            console.log(`[DELETE] Creating audit log for admin project deletion: ${projectID}`);
            const auditLogResult = await logProjectEvent({
                eventType: AuditLogEventType.ProjectDeleted,
                description: adminProjectFind.hackatime 
                    ? `Project "${adminProjectFind.name}" was deleted by admin (Hackatime: ${adminProjectFind.hackatime})` 
                    : `Project "${adminProjectFind.name}" was deleted by admin`,
                projectId: projectID,
                userId: adminProjectFind.userId,
                actorUserId: user.id,
                metadata: {
                    projectDetails: {
                        projectID: adminProjectFind.projectID,
                        name: adminProjectFind.name,
                        description: adminProjectFind.description,
                        hackatime: adminProjectFind.hackatime || null,
                        adminAction: true,
                        ownerEmail: adminProjectFind.user?.email
                    }
                }
            });
            
            console.log(`[DELETE] Audit log creation result: ${auditLogResult ? 'Success' : 'Failed'}`);
            
            // Delete any reviews associated with the project
            await prisma.review.deleteMany({
                where: { projectID }
            });
            
            // Delete the project (admin can delete any project)
            await prisma.project.delete({
                where: { projectID }
            });
            
            console.log(`[DELETE] Admin successfully deleted project ${projectID}`);
            metrics.increment("success.admin_delete_project", 1);
            
            return Response.json({ success: true });
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