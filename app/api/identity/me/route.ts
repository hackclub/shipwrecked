import { NextResponse } from 'next/server';

import { opts } from '../../auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
    });

    const response = await fetch(`${process.env.IDENTITY_URL}/api/v1/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${user?.identityToken}`,
        },
    });
    const data = await response.json();
    
    return NextResponse.json(data.identity);
}