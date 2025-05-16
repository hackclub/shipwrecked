import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface EmailVerifyRequest {
  verifyRequest?: (params: { token: string; email: string }) => Promise<boolean>;
}

export async function GET(request: Request) {
  console.log('=== Email Verification Request Start ===');
  const session = await getServerSession(opts);
  console.log('Session state:', session ? 'exists' : 'no session');
  
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  console.log('Verification attempt for email:', email);
  console.log('Token present:', !!token, 'token length:', token?.length);

  if (!token || !email) {
    console.log('Verification failed: Missing parameters');
    return NextResponse.json({ 
      success: false, 
      message: "Missing verification parameters" 
    }, { status: 400 });
  }

  try {
    console.log('Attempting to verify token with NextAuth...');
    // Verify the token with NextAuth
    const emailProvider = opts.providers.find(p => p.id === 'email') as EmailVerifyRequest;
    console.log('Email provider found:', !!emailProvider);
    
    if (!emailProvider?.verifyRequest) {
      console.log('Email provider verifyRequest not found');
      return NextResponse.json({ 
        success: false, 
        message: "Email verification not configured" 
      }, { status: 500 });
    }
    
    let result;
    try {
      result = await emailProvider.verifyRequest({
        token,
        email,
      });
      console.log('Verification result:', result ? 'success' : 'failed');
    } catch (verifyError) {
      console.error('Error in verifyRequest:', verifyError);
      return NextResponse.json({ 
        success: false, 
        message: "Error during token verification",
        details: verifyError instanceof Error ? verifyError.message : "Unknown error"
      }, { status: 500 });
    }

    if (result) {
      console.log('Email verified successfully');
      
      try {
        // Find the user by email - use findFirst to be more lenient with case sensitivity
        const user = await prisma.user.findFirst({
          where: { 
            email: {
              equals: email,
              mode: 'insensitive'
            }
          },
          select: { id: true, emailVerified: true, email: true }
        });
        
        if (user) {
          console.log('Found user to update:', user.id, 'email:', user.email);
          console.log('Current emailVerified status:', user.emailVerified);
          
          try {
            // Update the emailVerified field
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date() }
            });
            
            console.log('Updated user emailVerified:', updatedUser.emailVerified);
            
            // Create audit log for email verification
            try {
              // Import dynamically to avoid circular imports
              const { logUserEvent, AuditLogEventType } = await import('@/lib/auditLogger');
              
              const logResult = await logUserEvent({
                eventType: AuditLogEventType.UserVerified,
                description: `User verified email address: ${email}`,
                targetUserId: user.id,
                metadata: {
                  email,
                  verifiedAt: new Date().toISOString()
                }
              });
              
              console.log('Email verification audit log created successfully:', typeof logResult === 'object' ? JSON.stringify(logResult) : logResult);
            } catch (logError) {
              console.error('Failed to create audit log for email verification:', logError);
            }
          } catch (updateError) {
            console.error('Error updating user emailVerified field:', updateError);
            // Continue anyway since verification succeeded, just log error
          }
        } else {
          console.error('Could not find user with email:', email);
          // Try to find any users to debug
          const allUsers = await prisma.user.findMany({
            select: { id: true, email: true, emailVerified: true },
            take: 5
          });
          console.log('Sample users in database:', allUsers);
        }
      } catch (dbError) {
        console.error('Database error during email verification:', dbError);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: "Email verified successfully" 
      });
    } else {
      console.log('Invalid or expired verification token');
      return NextResponse.json({ 
        success: false, 
        message: "Invalid or expired verification link" 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json({ 
      success: false, 
      message: "Failed to verify email" 
    }, { status: 500 });
  } finally {
    console.log('=== Email Verification Request End ===');
  }
} 