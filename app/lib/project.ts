// @DEPRECATED - Do not use this file anymore 
// This file is kept for backward compatibility but will be removed
// Always use the implementation in /lib/project.ts instead

import { prisma } from "@/lib/prisma";

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
}

export type ProjectInput = Omit<Project, 'projectID' | 'submitted'>

// This createProject implementation is deprecated and incomplete
// Always use the implementation in /lib/project.ts which has proper handling for rawHours,
// viral/shipped flags, and Hackatime integration
export async function createProject(data: ProjectInput) {
    console.warn('⚠️ USING DEPRECATED PROJECT CREATION IMPLEMENTATION ⚠️', new Error().stack);
    
    return prisma.project.create({
        data: {
            projectID: crypto.randomUUID(),
            name: data.name,
            description: data.description,
            codeUrl: data.codeUrl,
            playableUrl: data.playableUrl,
            screenshot: data.screenshot || "",
            hackatime: data.hackatime || "",
            userId: data.userId,
            submitted: false,
            rawHours: 0,
            shipped: false,
            viral: false,
            in_review: false
        }
    });
}

export async function deleteProject(projectID: string, userId: string) {
    return prisma.project.delete({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        }
    });
} 