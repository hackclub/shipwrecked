import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    rawHours: number
    hoursOverride?: number
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
    console.log('[POST-TRACE] ===== PROJECT CREATION FLOW TRACING =====');
    console.log('[POST-TRACE] 1. Received request to create new project');
    try {
        console.log('[POST-TRACE] 2. About to authenticate user');
        const user = await requireUserSession();
        console.log(`[POST-TRACE] 3. Authentication successful, user ID: ${user.id}`);
        
        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        console.log('[POST-TRACE] 4. Content-Type:', contentType);

        let projectData;
        console.log('[POST-TRACE] 5. Parsing request data');
        if (contentType?.includes('multipart/form-data')) {
            console.log('[POST-TRACE] 5.1 Parsing as FormData');
            const formData = await request.formData();
            
            // Log each form field received for debugging
            console.log('[POST-TRACE] 5.1.1 Received FormData fields:');
            for (const [key, value] of formData.entries()) {
                // Don't log the entire screenshot if it's a long string
                if (key === 'screenshot' && typeof value === 'string' && value.length > 100) {
                    console.log(`[POST-TRACE] FormData field: ${key} = (screenshot data, length: ${value.length})`);
                } else {
                    console.log(`[POST-TRACE] FormData field: ${key} = ${value}`);
                }
            }
            
            projectData = {
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                hackatime: formData.get('hackatime')?.toString() || '',
                codeUrl: formData.get('codeUrl')?.toString() || '',
                playableUrl: formData.get('playableUrl')?.toString() || '',
                screenshot: formData.get('screenshot')?.toString() || '',
                viral: formData.get('viral') === 'true',
                shipped: formData.get('shipped') === 'true',
                in_review: formData.get('in_review') === 'true',
                rawHours: parseFloat(formData.get('rawHours')?.toString() || '0'),
                hoursOverride: formData.get('hoursOverride') ? parseFloat(formData.get('hoursOverride')?.toString() || '0') : undefined
            };
        } else {
            console.log('[POST-TRACE] 5.2 Parsing as JSON');
            try {
                const rawData = await request.json();
                console.log('[POST-TRACE] 5.2.1 Raw JSON data received:', {
                    ...rawData,
                    screenshot: rawData.screenshot ? `(screenshot data, length: ${rawData.screenshot.length})` : '(none)',
                });
                
                projectData = rawData;
                
                // Ensure required fields are present
                projectData.rawHours = typeof projectData.rawHours === 'number' ? projectData.rawHours : 0;
                projectData.hackatime = projectData.hackatime || '';
                projectData.codeUrl = projectData.codeUrl || '';
                projectData.playableUrl = projectData.playableUrl || '';
                projectData.screenshot = projectData.screenshot || '';
                
                if ('hoursOverride' in projectData && typeof projectData.hoursOverride !== 'undefined') {
                    projectData.hoursOverride = Number(projectData.hoursOverride);
                }
            } catch (parseError) {
                console.error('[POST-TRACE] 5.3 Error parsing JSON:', parseError);
                metrics.increment("errors.parse_json", 1);
                return Response.json({ error: 'Failed to parse request JSON' }, { status: 400 });
            }
        }
        
        console.log('[POST-TRACE] 6. Processed project data:', {
            ...projectData,
            screenshot: projectData.screenshot ? `(screenshot data, length: ${projectData.screenshot.length})` : '(none)'
        });

        // Validate required fields
        console.log('[POST-TRACE] 7. Validating required fields');
        if (!projectData.name) {
            console.error('[POST-TRACE] 7.1 Missing required field: name');
            throw new Error('Project name is required');
        }

        if (!projectData.description) {
            console.error('[POST-TRACE] 7.2 Missing required field: description');
            throw new Error('Project description is required');
        }

        // Detailed error trapping around project creation
        console.log('[POST-TRACE] 8. About to call createProject function with data:', {
            ...projectData,
            userId: user.id,
            screenshot: projectData.screenshot ? `(screenshot data, length: ${projectData.screenshot.length})` : '(none)'
        });
        
        try {
            console.time('[POST-TRACE] createProject execution time');
            // Import createProject directly from the root lib path to ensure we use the correct implementation
            const { createProject } = require('../../lib/project');
            
            console.log('[POST-TRACE] 8.1 Using createProject from root lib path');
            
            const createdProject = await createProject({ 
                ...projectData,
                userId: user.id
            });
            
            console.timeEnd('[POST-TRACE] createProject execution time');
            console.log('[POST-TRACE] 9. createProject returned successfully');
            
            // Check result
            if (!createdProject) {
                console.error('[POST-TRACE] 9.1 createProject returned null or undefined');
                metrics.increment("errors.create_project_null_result", 1);
                return Response.json({ 
                    success: false, 
                    error: 'Project creation failed - no project data returned',
                    type: 'NullResult'
                }, { status: 500 });
            }
            
            console.log('[POST-TRACE] 10. Successfully created project:', {
                projectID: createdProject.projectID,
                name: createdProject.name,
                userId: createdProject.userId
            });
            
            try {
                console.log('[POST-TRACE] 11. Creating audit log entry');
                // Create audit log for project creation
                await logProjectEvent({
                    eventType: AuditLogEventType.ProjectCreated,
                    description: createdProject.hackatime 
                        ? `Project "${createdProject.name || 'Unnamed'}" was created (Hackatime: ${createdProject.hackatime})` 
                        : `Project "${createdProject.name || 'Unnamed'}" was created`,
                    projectId: createdProject.projectID || 'unknown-id',
                    userId: user.id,
                    actorUserId: user.id,
                    metadata: {
                        projectDetails: {
                            projectID: createdProject.projectID || 'unknown-id',
                            name: createdProject.name || 'Unnamed',
                            description: createdProject.description || '',
                            hackatime: createdProject.hackatime || null,
                            codeUrl: createdProject.codeUrl || "",
                            playableUrl: createdProject.playableUrl || "",
                            screenshot: createdProject.screenshot || "",
                            url: createdProject.projectID ? `/bay/projects/${createdProject.projectID}` : '/bay'
                        }
                    }
                });
                console.log('[POST-TRACE] 12. Audit log created successfully');
            } catch (logError) {
                // Log but don't throw, allow project creation to succeed even if audit log fails
                console.error('[POST-TRACE] 12.1 Failed to create audit log:', logError);
            }
            
            console.log(`[POST-TRACE] 13. Successfully completed project creation ${createdProject.projectID}`);
            metrics.increment("success.create_project", 1);
            return Response.json({ success: true, data: createdProject });
        } catch (createError: unknown) {
            console.error('[POST-TRACE] Error in createProject:', createError);
            if (createError instanceof Error) {
                console.error('[POST-TRACE] Error name:', createError.name);
                console.error('[POST-TRACE] Error message:', createError.message);
                console.error('[POST-TRACE] Error stack:', createError.stack);
            }
            metrics.increment("errors.create_project_exception", 1);
            return Response.json({ 
                success: false, 
                error: createError instanceof Error ? createError.message : 'Unknown error in project creation',
                type: createError instanceof Error && createError.constructor ? createError.constructor.name : 'Unknown'
            }, { status: 500 });
        }
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[POST-TRACE] FATAL ERROR in project creation flow:', err);
        console.error('[POST-TRACE] Error name:', err.name);
        console.error('[POST-TRACE] Error message:', err.message);
        console.error('[POST-TRACE] Error stack:', err.stack);
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

        console.log(`[DELETE] Admin attempting to delete project ${projectID}`);
        
        // Fetch project details before deletion to use in audit log - as admin, we don't restrict by userId
        const projectToDelete = await prisma.project.findUnique({
            where: { projectID },
            include: { user: true }
        });
        
        if (!projectToDelete) {
            return Response.json({
                success: false,
                error: 'Project not found'
            }, { status: 404 });
        }
        
        // Create audit log for project deletion BEFORE deletion
        console.log(`[DELETE] Creating audit log for admin project deletion: ${projectID}`);
        const auditLogResult = await logProjectEvent({
            eventType: AuditLogEventType.ProjectDeleted,
            description: projectToDelete.hackatime 
                ? `Project "${projectToDelete.name}" was deleted by admin (Hackatime: ${projectToDelete.hackatime})` 
                : `Project "${projectToDelete.name}" was deleted by admin`,
            projectId: projectID,
            userId: projectToDelete.userId,
            actorUserId: user.id,
            metadata: {
                projectDetails: {
                    projectID: projectToDelete.projectID,
                    name: projectToDelete.name,
                    description: projectToDelete.description,
                    hackatime: projectToDelete.hackatime || null,
                    adminAction: true,
                    ownerEmail: projectToDelete.user?.email
                }
            }
        });
        
        console.log(`[DELETE] Audit log creation result: ${auditLogResult ? 'Success' : 'Failed'}`);
        
        // Delete any reviews associated with the project
        await prisma.review.deleteMany({
            where: { projectID }
        });
        
        // Delete the project - as admin we don't restrict by userId
        await prisma.project.delete({
            where: { projectID }
        });
        
        console.log(`[DELETE] Admin successfully deleted project ${projectID}`);
        metrics.increment("success.admin_delete_project", 1);
        
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
                rawHours: parseFloat(formData.get('rawHours')?.toString() || '0'),
                hoursOverride: formData.get('hoursOverride') ? parseFloat(formData.get('hoursOverride')?.toString() || '0') : undefined
            };
        } else {
            console.log('[PUT] Parsing JSON');
            projectData = await request.json();
            // Ensure rawHours is present and a number
            projectData.rawHours = typeof projectData.rawHours === 'number' ? projectData.rawHours : 0;
            if ('hoursOverride' in projectData && typeof projectData.hoursOverride !== 'undefined') {
                projectData.hoursOverride = Number(projectData.hoursOverride);
            }
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
        
        console.log(`[PUT] Updating project ${projectID} with fields:`, updateFields);
        
        // Verify the project exists before attempting to update
        const existingProject = await prisma.project.findUnique({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            }
        });
        
        if (!existingProject) {
            console.error(`[PUT] Project ${projectID} not found for user ${user.id}`);
            return Response.json({ 
                success: false, 
                error: 'Project not found' 
            }, { status: 404 });
        }
        
        try {
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
            return Response.json({ 
                success: true, 
                data: updatedProject || { projectID }
            });
        } catch (updateError) {
            console.error(`[PUT] Prisma error updating project ${projectID}:`, updateError);
            return Response.json({ 
                success: false, 
                error: 'Database error updating project',
                details: updateError instanceof Error ? updateError.message : 'Unknown error' 
            }, { status: 500 });
        }
    } catch (error: unknown) {
        // This catch block now only catches errors from requireUserSession or request parsing
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[PUT] Failed to process request:', err);
        metrics.increment("errors.update_project", 1);
        return Response.json({ 
            success: false, 
            error: err.message,
            type: err.constructor.name
        }, { status: 500 });
    }
}