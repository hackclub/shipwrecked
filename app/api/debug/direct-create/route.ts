import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/requireUserSession";
import { NextResponse } from "next/server";

export async function POST() {
  console.log("[DIRECT-CREATE] Starting direct project creation test");
  
  try {
    // Test database connection first
    try {
      console.log("[DIRECT-CREATE] Testing database connection");
      const connectionResult = await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log("[DIRECT-CREATE] Database connection confirmed:", connectionResult);
    } catch (connectionError) {
      console.error("[DIRECT-CREATE] Database connection failed:", connectionError);
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: connectionError instanceof Error ? connectionError.message : "Unknown error"
      }, { status: 500 });
    }
    
    // Get user session
    let user;
    try {
      console.log("[DIRECT-CREATE] Getting user session");
      user = await requireUserSession();
      console.log("[DIRECT-CREATE] User authenticated:", user.id);
    } catch (authError) {
      console.error("[DIRECT-CREATE] Authentication failed:", authError);
      return NextResponse.json({
        success: false,
        error: "Authentication failed",
        details: authError instanceof Error ? authError.message : "Unknown error"
      }, { status: 401 });
    }
    
    // Verify user exists in database
    try {
      console.log("[DIRECT-CREATE] Verifying user exists in database");
      const userExists = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true }
      });
      
      if (!userExists) {
        console.error("[DIRECT-CREATE] User not found in database:", user.id);
        return NextResponse.json({
          success: false,
          error: "User not found in database",
          userId: user.id
        }, { status: 404 });
      }
      
      console.log("[DIRECT-CREATE] User verified in database:", userExists.id);
    } catch (userVerifyError) {
      console.error("[DIRECT-CREATE] User verification failed:", userVerifyError);
      return NextResponse.json({
        success: false,
        error: "User verification failed",
        details: userVerifyError instanceof Error ? userVerifyError.message : "Unknown error"
      }, { status: 500 });
    }
    
    // Create a project directly using Prisma
    try {
      console.log("[DIRECT-CREATE] Creating project directly with Prisma");
      
      const projectId = `direct_test_${Date.now()}`;
      console.log("[DIRECT-CREATE] Generated project ID:", projectId);
      
      const project = await prisma.project.create({
        data: {
          projectID: projectId,
          name: "Direct Creation Test",
          description: "Test project created directly with Prisma",
          codeUrl: "",
          playableUrl: "",
          screenshot: "",
          hackatime: "",
          userId: user.id,
          submitted: false,
          shipped: false,
          viral: false,
          in_review: false,
          rawHours: 0
          // No hoursOverride
        }
      });
      
      console.log("[DIRECT-CREATE] Project created successfully:", project.projectID);
      
      return NextResponse.json({
        success: true,
        project: {
          id: project.projectID,
          name: project.name,
          userId: project.userId
        },
        message: "Project created successfully with direct Prisma access"
      });
    } catch (createError: any) {
      console.error("[DIRECT-CREATE] Project creation failed:", createError);
      
      // Log additional details if available
      if (createError.code) {
        console.error("[DIRECT-CREATE] Error code:", createError.code);
      }
      
      if (createError.meta) {
        console.error("[DIRECT-CREATE] Error metadata:", createError.meta);
      }
      
      return NextResponse.json({
        success: false,
        error: "Project creation failed",
        details: createError instanceof Error ? createError.message : "Unknown error",
        code: createError.code,
        meta: createError.meta
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[DIRECT-CREATE] Unexpected error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 