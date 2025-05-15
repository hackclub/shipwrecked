import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect the /bay and /admin paths
  if (!request.nextUrl.pathname.startsWith('/bay') && !request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get the authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    // No auth header, return 401 with WWW-Authenticate header
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // Decode the auth header
  const [scheme, encoded] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
    return new NextResponse('Invalid authentication scheme', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // Decode the credentials
  const buffer = Buffer.from(encoded, 'base64');
  const decoded = buffer.toString('ascii');
  const [username, password] = decoded.split(':');

  // Check credentials
  if (
    username !== process.env.AUTH_USERNAME ||
    password !== process.env.AUTH_PASSWORD
  ) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // Authentication successful
  return NextResponse.next();
}

// Configure the middleware to only run on the /bay and /admin paths and their subpaths
export const config = {
  matcher: ['/bay', '/bay/:path*', '/admin', '/admin/:path*'],
};