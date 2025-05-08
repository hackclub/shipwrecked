import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

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
  console.log('Token present:', !!token);

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
    
    const result = await emailProvider.verifyRequest({
      token,
      email,
    });
    console.log('Verification result:', result ? 'success' : 'failed');

    if (result) {
      console.log('Email verified successfully');
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