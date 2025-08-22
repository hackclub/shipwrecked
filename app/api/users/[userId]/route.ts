import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not provided' }, { status: 400 });
  }

  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden: You are not allowed to access this user' }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        isAdmin: true,
        role: true,
        status: true,
        hackatimeId: true,
        identityToken: true,
        purchasedProgressHours: true,
        totalShellsSpent: true,
        adminShellAdjustment: true,
        projects: {
          include: {
            hackatimeLinks: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
} 