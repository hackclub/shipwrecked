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
    
    try {
        return NextResponse.json(data.identity);
    } catch (error) {
        console.error('JSON serialization error in identity/me:', error);
        console.error('Data causing error:', data.identity);
        
        // Fallback: sanitize the data by removing non-serializable values
        const sanitizedData = JSON.parse(JSON.stringify(data.identity, (key, value) => {
            // Handle BigInt
            if (typeof value === 'bigint') {
                return value.toString();
            }
            // Handle Date objects
            if (value instanceof Date) {
                return value.toISOString();
            }
            // Handle functions
            if (typeof value === 'function') {
                return undefined;
            }
            return value;
        }));
        
        return NextResponse.json(sanitizedData);
    }
}