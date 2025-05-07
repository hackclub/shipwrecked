import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(opts);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.json({ 
      success: false, 
      message: "Missing verification parameters" 
    }, { status: 400 });
  }

  try {
    // Verify the token with NextAuth
    const result = await opts.providers.find(p => p.id === 'email')?.verifyRequest?.({
      token,
      email,
    });

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Email verified successfully" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid or expired verification link" 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to verify email" 
    }, { status: 500 });
  }
} 