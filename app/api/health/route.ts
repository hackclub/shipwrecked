import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[HEALTH] Testing database connection");
    
    // Basic connection test
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log("[HEALTH] Database connection test result:", result);
    
    // Try an actual query
    const userCount = await prisma.user.count();
    console.log("[HEALTH] Database user count:", userCount);
    
    // Try a more complex query
    const projectCount = await prisma.project.count();
    console.log("[HEALTH] Database project count:", projectCount);
    
    return NextResponse.json({ 
      status: "ok", 
      database: "connected",
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        projects: projectCount
      }
    });
  } catch (error) {
    console.error("[HEALTH] Database connection test failed:", error);
    
    return NextResponse.json(
      { 
        status: "error", 
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 