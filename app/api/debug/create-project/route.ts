import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/requireUserSession";
import { NextResponse } from "next/server";

export async function POST() {
  let debugStage = "start";
  
  try {
    console.log("[DEBUG] 1. Starting debug endpoint");
    debugStage = "requireUserSession";
    
    // Get authenticated user
    let user;
    try {
      user = await requireUserSession();
      console.log(`[DEBUG] 2. User authenticated: ${user.id}`);
    } catch (authError: any) {
      console.error("[DEBUG] Authentication failed:", authError);
      return NextResponse.json({ 
        success: false,
        error: "Authentication failed: " + (authError instanceof Error ? authError.message : "Unknown auth error"),
        stage: debugStage
      }, { status: 401 });
    }
    
    debugStage = "generate_uuid";
    // Create project with minimal fields
    const projectID = crypto.randomUUID();
    console.log(`[DEBUG] 3. Generated project ID: ${projectID}`);
    
    debugStage = "prisma_create";
    try {
      console.log("[DEBUG] 4. About to call prisma.project.create");
      
      // Add a connection test first
      debugStage = "connection_test";
      try {
        const connectionTest = await prisma.$queryRaw`SELECT 1 as connection_test`;
        console.log("[DEBUG] 4a. Database connection verified:", connectionTest);
      } catch (connError: any) {
        console.error("[DEBUG] Database connection failed:", connError);
        return NextResponse.json({ 
          success: false,
          error: "Database connection failed: " + (connError instanceof Error ? connError.message : "Unknown conn error"),
          stage: debugStage
        }, { status: 500 });
      }
      
      // Try the creation with just the required fields
      debugStage = "project_create";
      console.log("[DEBUG] 5. Executing prisma.project.create with data:", {
        projectID,
        name: "Debug Test Project",
        userId: user.id
      });
      
      const project = await prisma.project.create({
        data: {
          projectID: projectID,
          name: "Debug Test Project",
          description: "Test project for debugging purposes",
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
          // Intentionally omitting hoursOverride
        }
      });
      
      if (!project) {
        console.error("[DEBUG] Prisma returned null/undefined project without throwing");
        return NextResponse.json({ 
          success: false,
          error: "Prisma returned null project",
          stage: debugStage
        }, { status: 500 });
      }
      
      console.log(`[DEBUG] 6. Project created successfully with ID: ${project.projectID}`);
      
      return NextResponse.json({ 
        success: true,
        project: project
      });
    } catch (error: any) {
      console.error(`[DEBUG] Project creation failed at stage "${debugStage}":`, error);
      
      if (error.code) {
        console.error("[DEBUG] Prisma error code:", error.code);
      }
      
      if (error.meta) {
        console.error("[DEBUG] Prisma error metadata:", error.meta);
      }
      
      return NextResponse.json({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: error.code || "UNKNOWN",
        stage: debugStage
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error(`[DEBUG] Overall operation failed at stage "${debugStage}":`, error);
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stage: debugStage
    }, { status: 500 });
  }
} 