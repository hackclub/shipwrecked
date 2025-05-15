import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { UserStatus } from '@/app/generated/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = params.userId;
    
    // Fetch the specific user
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        hackatimeId: true,
        slack: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = params.userId;
    const data = await request.json();
    
    // Only allow updating specific fields for security
    const { isAdmin, status } = data;
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isAdmin: isAdmin,
        status: status ? status as UserStatus : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        hackatimeId: true,
        slack: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
} 