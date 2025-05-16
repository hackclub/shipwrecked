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
  try {
    console.log('Creating audit log with params:', JSON.stringify(params, null, 2));
    
    // Use a try/catch inside a promise to handle errors and return null instead of throwing
    return await new Promise(async (resolve) => {
      try {
        // Use @prisma/client directly
        const result = await prisma.auditLog.create({
          data: {
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
          }
        });
        
        console.log('Successfully created audit log:', result.id);
        resolve(result);
      } catch (error) {
        console.error('Error in createAuditLog:', error);
        
        // Add more detailed error logging
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            params: {
              eventType: params.eventType,
              projectId: params.projectId,
              targetUserId: params.targetUserId,
            }
          });
        }
        
        resolve(null);
      }
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
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
  console.log(`Logging project event: ${eventType} for project ${projectId}`);
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
  console.log(`Logging user event: ${eventType} for user ${targetUserId}`);
  return createAuditLog({
    eventType,
    description,
    targetUserId,
    actorUserId,
    metadata
  });
} 