import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/lib/project";
import { requireUserSession } from "@/lib/requireUserSession";
import metrics from "@/metrics";
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';

export type Project = {
    projectID: string
    name: string
    description: string
    codeUrl: string
    playableUrl: string
    screenshot: string
    hackatime?: string
    submitted: boolean
    userId: string
    viral: boolean
    shipped: boolean
    in_review: boolean
    approved: boolean
}

export type ProjectType = Project;

export type ProjectInput = Omit<Project, 'projectID' | 'submitted'>

// Helper functions
async function deleteProject(projectID: string, userId: string) {
    console.log(`[DELETE] Attempting to delete project ${projectID} for user ${userId}`);
    try {
        const result = await prisma.project.delete({
            where: {
                projectID_userId: {
                    projectID,
                    userId
                }
            }
        });
        metrics.increment("success.delete_project", 1);
        console.log(`[DELETE] Successfully deleted project ${projectID}`);
        return result;
    } catch (err) {
        metrics.increment("errors.delete_project", 1);
        console.error(`[DELETE] Failed to delete project ${projectID}:`, err);
        throw err;
    }
}

// API Route handlers
export async function GET(request: Request) { 
    console.log('[GET] Received request to fetch projects');
    try {
        const user = await requireUserSession();
        console.log(`[GET] Authenticated user ${user.id}, fetching their projects`);
        
        const projects = await prisma.project.findMany({
            where: {
                userId: user.id
            }
        });
        console.log(`[GET] Successfully fetched ${projects.length} projects for user ${user.id}`);
        metrics.increment("success.fetch_project", 1);
        return Response.json(projects);
    } catch (err) {
        console.error("[GET] Error fetching projects:", err);
        metrics.increment("errors.fetch_project", 1);
        return Response.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('[POST] Received request to create new project');
    try {
        const user = await requireUserSession();
        console.log(`[POST] Authenticated user ${user.id}`);
        
        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        console.log('[POST] Content-Type:', contentType);

        let projectData;
        if (contentType?.includes('multipart/form-data')) {
            console.log('[POST] Parsing FormData');
            const formData = await request.formData();
            projectData = {
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                hackatime: formData.get('hackatime')?.toString(),
                codeUrl: formData.get('codeUrl')?.toString() || '',
                playableUrl: formData.get('playableUrl')?.toString() || '',
                screenshot: formData.get('screenshot')?.toString() || '',
                viral: formData.get('viral') === 'true',
                shipped: formData.get('shipped') === 'true',
                in_review: formData.get('in_review') === 'true',
                approved: formData.get('approved') === 'true'
            };
        } else {
            console.log('[POST] Parsing JSON');
            projectData = await request.json();
        }
        
        console.log('[POST] Project creation payload:', {
            ...projectData,
            hasScreenshot: !!projectData.screenshot
        });

        const createdProject = await createProject({ 
            ...projectData,
            userId: user.id
        });
        
        // Create audit log for project creation
        await logProjectEvent({
            eventType: AuditLogEventType.ProjectCreated,
            description: createdProject.hackatime 
                ? `Project "${createdProject.name}" was created (Hackatime: ${createdProject.hackatime})` 
                : `Project "${createdProject.name}" was created`,
            projectId: createdProject.projectID,
            userId: user.id,
            actorUserId: user.id,
            metadata: {
                projectDetails: {
                    projectID: createdProject.projectID,
                    name: createdProject.name,
                    description: createdProject.description,
                    hackatime: createdProject.hackatime || null,
                    codeUrl: createdProject.codeUrl,
                    playableUrl: createdProject.playableUrl,
                    screenshot: createdProject.screenshot,
                    url: `/bay/projects/${createdProject.projectID}`
                }
            }
        });
        
        console.log(`[POST] Successfully created project ${createdProject.projectID}`);
        metrics.increment("success.create_project", 1);
        return Response.json({ success: true, data: createdProject });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[POST] Failed to create project:', err);
        metrics.increment("errors.create_project", 1);
        return Response.json({ 
            success: false, 
            error: err.message,
            type: err.constructor.name
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    console.log('[DELETE] Received request to delete project');
    try {
        const user = await requireUserSession();
        console.log(`[DELETE] Authenticated user ${user.id}`);
        
        // Get request body and handle potential parsing errors
        let body;
        try {
            body = await request.json();
            console.log('[DELETE] Request body:', body);
        } catch (error) {
            console.error('[DELETE] Failed to parse request body:', error);
            return Response.json({ 
                success: false, 
                error: 'Invalid request body format' 
            }, { status: 400 });
        }

        const { projectID } = body;
        if (!projectID) {
            console.error('[DELETE] No projectID provided in request body');
            return Response.json({ 
                success: false, 
                error: 'projectID is required' 
            }, { status: 400 });
        }

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

export async function PUT(request: Request) {
    console.log('[PUT] Received request to update project');
    try {
        const user = await requireUserSession();
        console.log(`[PUT] Authenticated user ${user.id}`);

        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        console.log('[PUT] Content-Type:', contentType);

        let projectData: any = {};
        if (contentType?.includes('multipart/form-data')) {
            console.log('[PUT] Parsing FormData');
            const formData = await request.formData();
            projectData = {
                projectID: formData.get('projectID')?.toString() || '',
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                hackatime: formData.get('hackatime')?.toString(),
                codeUrl: formData.get('codeUrl')?.toString() || '',
                playableUrl: formData.get('playableUrl')?.toString() || '',
                screenshot: formData.get('screenshot')?.toString() || '',
                viral: formData.get('viral') === 'true',
                shipped: formData.get('shipped') === 'true',
                in_review: formData.get('in_review') === 'true',
                approved: formData.get('approved') === 'true'
            };
        } else {
            console.log('[PUT] Parsing JSON');
            projectData = await request.json();
        }

        const { projectID, ...updateFields } = projectData;
        if (!projectID) {
            return Response.json({ success: false, error: 'projectID is required' }, { status: 400 });
        }

        // Remove undefined fields
        Object.keys(updateFields).forEach(key => {
            if (updateFields[key] === undefined) {
                delete updateFields[key];
            }
        });

        const updatedProject = await prisma.project.update({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            },
            data: updateFields
        });

        console.log(`[PUT] Successfully updated project ${projectID}`);
        metrics.increment("success.update_project", 1);
        return Response.json({ success: true, data: updatedProject });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[PUT] Failed to update project:', err);
        metrics.increment("errors.update_project", 1);
        return Response.json({ 
            success: false, 
            error: err.message,
            type: err.constructor.name
        }, { status: 500 });
    }
}