import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/requireUserSession";

type DiagnosticResult = {
  success: boolean;
  [key: string]: any;
};

type DiagnosticResults = {
  connection?: DiagnosticResult;
  user_read?: DiagnosticResult;
  project_read?: DiagnosticResult;
  auth_session?: DiagnosticResult;
  user_verify?: DiagnosticResult;
  project_create?: DiagnosticResult;
};

export async function GET() {
  try {
    console.log("[DATABASE-DEBUG] Starting database diagnostics");
    const diagnosticResults: DiagnosticResults = {};
    
    // Test 1: Basic connection test
    try {
      const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
      diagnosticResults['connection'] = {
        success: true,
        result
      };
      console.log("[DATABASE-DEBUG] Connection test passed:", result);
    } catch (error) {
      diagnosticResults['connection'] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
      console.error("[DATABASE-DEBUG] Connection test failed:", error);
    }
    
    // Test 2: Read user table
    try {
      const userCount = await prisma.user.count();
      diagnosticResults['user_read'] = {
        success: true,
        count: userCount
      };
      console.log("[DATABASE-DEBUG] User count test passed:", userCount);
    } catch (error) {
      diagnosticResults['user_read'] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
      console.error("[DATABASE-DEBUG] User count test failed:", error);
    }
    
    // Test 3: Read project table
    try {
      const projectCount = await prisma.project.count();
      diagnosticResults['project_read'] = {
        success: true,
        count: projectCount
      };
      console.log("[DATABASE-DEBUG] Project count test passed:", projectCount);
    } catch (error) {
      diagnosticResults['project_read'] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
      console.error("[DATABASE-DEBUG] Project count test failed:", error);
    }
    
    // Test 4: Try to get authenticated user
    let currentUser = null;
    try {
      currentUser = await requireUserSession();
      diagnosticResults['auth_session'] = {
        success: true,
        userId: currentUser.id
      };
      console.log("[DATABASE-DEBUG] Auth session test passed:", currentUser.id);
    } catch (error) {
      diagnosticResults['auth_session'] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
      console.error("[DATABASE-DEBUG] Auth session test failed:", error);
    }
    
    // Test 5: If user is authenticated, verify user existence 
    if (currentUser) {
      try {
        const userExists = await prisma.user.findUnique({
          where: { id: currentUser.id },
          select: { id: true, email: true }
        });
        
        diagnosticResults['user_verify'] = {
          success: !!userExists,
          user: userExists ? { id: userExists.id, email: userExists.email } : null
        };
        console.log("[DATABASE-DEBUG] User verification test:", userExists ? "passed" : "failed");
      } catch (error) {
        diagnosticResults['user_verify'] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
        console.error("[DATABASE-DEBUG] User verification test failed:", error);
      }
    }
    
    // Test 6: Try creating a diagnostic record (if user authenticated)
    if (currentUser) {
      try {
        const testProjectId = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        const testProject = await prisma.project.create({
          data: {
            projectID: testProjectId,
            name: "Database Diagnostic Test",
            description: "This is a test project created for database diagnostics",
            codeUrl: "",
            playableUrl: "",
            screenshot: "",
            hackatime: "",
            submitted: false,
            userId: currentUser.id,
            shipped: false,
            viral: false,
            in_review: false,
            rawHours: 0
          }
        });
        
        diagnosticResults['project_create'] = {
          success: true,
          projectId: testProject.projectID
        };
        console.log("[DATABASE-DEBUG] Project creation test passed:", testProject.projectID);
        
        // Clean up by deleting the test project
        await prisma.project.delete({
          where: {
            projectID_userId: {
              projectID: testProject.projectID,
              userId: currentUser.id
            }
          }
        });
        console.log("[DATABASE-DEBUG] Test project deleted");
      } catch (error) {
        diagnosticResults['project_create'] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
        console.error("[DATABASE-DEBUG] Project creation test failed:", error);
      }
    }
    
    return NextResponse.json({ 
      status: "completed",
      diagnosticResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[DATABASE-DEBUG] Overall diagnostic failed:", error);
    
    return NextResponse.json(
      { 
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 