import { prisma } from '@/lib/prisma';

// Define the enum locally to match the Prisma schema
export enum AuditLogEventType {
  ProjectCreated = "ProjectCreated",
  ProjectSubmittedForReview = "ProjectSubmittedForReview",
  ProjectMarkedShipped = "ProjectMarkedShipped",
  ProjectMarkedViral = "ProjectMarkedViral",
  ProjectReviewCompleted = "ProjectReviewCompleted",
  UserRoleChanged = "UserRoleChanged",
  UserVerified = "UserVerified",
  UserCreated = "UserCreated",
  ProjectDeleted = "ProjectDeleted",
  SlackConnected = "SlackConnected",
  OtherEvent = "OtherEvent"
}

interface CreateAuditLogParams {
  eventType: AuditLogEventType;
  description: string;
  targetUserId: string;
  actorUserId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an audit log entry in the database
 * @param params The audit log parameters
 * @returns The created audit log or null if an error occurred
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  console.log('[AUDIT-TRACE] 1. Creating audit log:', {
    event: params.eventType,
    project: params.projectId || 'N/A',
    targetUser: params.targetUserId,
    actor: params.actorUserId || 'N/A'
  });
  
  try {
    // Validate inputs
    if (!params.targetUserId) {
      console.error('[AUDIT-TRACE] 2. Missing required targetUserId');
      return null;
    }
    
    // Prepare create data
    const createData = {
      eventType: params.eventType,
      description: params.description,
      targetUser: {
        connect: { id: params.targetUserId }
      },
      // Only include actorUser if actorUserId is provided
      ...(params.actorUserId && {
        actorUser: {
          connect: { id: params.actorUserId }
        }
      }),
      // Only include project if projectId is provided
      ...(params.projectId && {
        project: {
          connect: { projectID: params.projectId }
        }
      }),
      // Include metadata if provided
      ...(params.metadata && { metadata: params.metadata })
    };
    
    console.log('[AUDIT-TRACE] 3. Prepared audit log data:', JSON.stringify({
      ...createData,
      metadata: params.metadata ? 'present' : 'none'
    }, null, 2));
    
    // Verify inputs before making the call
    if (params.projectId) {
      try {
        console.log('[AUDIT-TRACE] 4. Verifying project exists:', params.projectId);
        const projectExists = await prisma.project.findUnique({
          where: { projectID: params.projectId },
          select: { projectID: true }
        });
        
        if (!projectExists) {
          console.error('[AUDIT-TRACE] 4.1 Project not found:', params.projectId);
          console.warn('[AUDIT-TRACE] 4.2 Will continue with audit log but project reference may fail');
        } else {
          console.log('[AUDIT-TRACE] 4.3 Project verified:', projectExists.projectID);
        }
      } catch (projectError) {
        console.error('[AUDIT-TRACE] 4.4 Error verifying project:', projectError);
      }
    }
    
    // Use a try/catch inside a promise to handle errors and return null instead of throwing
    return await new Promise(async (resolve) => {
      try {
        console.log('[AUDIT-TRACE] 5. Calling prisma.auditLog.create');
        
        // Use @prisma/client directly
        const result = await prisma.auditLog.create({
          data: createData
        });
        
        console.log('[AUDIT-TRACE] 6. Successfully created audit log:', result.id);
        resolve(result);
      } catch (error) {
        console.error('[AUDIT-TRACE] 7. Error in prisma.auditLog.create:', error);
        
        // Add more detailed error logging
        if (error instanceof Error) {
          console.error('[AUDIT-TRACE] 7.1 Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            params: {
              eventType: params.eventType,
              projectId: params.projectId,
              targetUserId: params.targetUserId,
            }
          });
          
          // Check for specific error types
          if (error.message.includes('Foreign key constraint failed')) {
            console.error('[AUDIT-TRACE] 7.2 Foreign key constraint error - likely invalid projectId, userId or actorUserId');
            
            // Extra verification of user IDs
            try {
              console.log('[AUDIT-TRACE] 7.3 Verifying targetUserId:', params.targetUserId);
              const targetUserExists = await prisma.user.findUnique({
                where: { id: params.targetUserId },
                select: { id: true }
              });
              console.log('[AUDIT-TRACE] 7.4 Target user exists:', !!targetUserExists);
              
              if (params.actorUserId) {
                console.log('[AUDIT-TRACE] 7.5 Verifying actorUserId:', params.actorUserId);
                const actorUserExists = await prisma.user.findUnique({
                  where: { id: params.actorUserId },
                  select: { id: true }
                });
                console.log('[AUDIT-TRACE] 7.6 Actor user exists:', !!actorUserExists);
              }
            } catch (verifyError) {
              console.error('[AUDIT-TRACE] 7.7 Error during verification:', verifyError);
            }
          }
        }
        
        resolve(null);
      }
    });
  } catch (error) {
    console.error('[AUDIT-TRACE] 8. Outer error in createAuditLog:', error);
    return null;
  }
}

/**
 * Helper function to create a project-related audit log
 */
export async function logProjectEvent({
  eventType,
  description,
  projectId,
  userId,
  actorUserId,
  metadata
}: {
  eventType: AuditLogEventType;
  description: string;
  projectId: string;
  userId: string;
  actorUserId?: string;
  metadata?: Record<string, any>;
}) {
  console.log(`[PROJECT-AUDIT-TRACE] Logging project event: ${eventType} for project ${projectId}`);
  
  // Validate projectId format
  if (!projectId || typeof projectId !== 'string') {
    console.error('[PROJECT-AUDIT-TRACE] Invalid projectId:', projectId);
    return null;
  }
  
  return createAuditLog({
    eventType,
    description,
    targetUserId: userId,
    actorUserId,
    projectId,
    metadata
  });
}

/**
 * Helper function to create a user-related audit log
 */
export async function logUserEvent({
  eventType,
  description,
  targetUserId,
  actorUserId,
  metadata
}: {
  eventType: AuditLogEventType;
  description: string;
  targetUserId: string;
  actorUserId?: string;
  metadata?: Record<string, any>;
}) {
  console.log(`[USER-AUDIT-TRACE] Logging user event: ${eventType} for user ${targetUserId}`);
  return createAuditLog({
    eventType,
    description,
    targetUserId,
    actorUserId,
    metadata
  });
} 