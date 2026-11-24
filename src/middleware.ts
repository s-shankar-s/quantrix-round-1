import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // /display is public — no auth required (projector screen)
  if (path.startsWith('/display')) {
    return NextResponse.next();
  }

  // Protect Admin Routes
  if (path.startsWith('/admin')) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/login?role=admin&error=unauthorized', request.url));
    }
  }

  // Protect Team Routes
  if (path.startsWith('/team')) {
    const session = await getSession();
    if (!session || session.role !== 'team') {
      return NextResponse.redirect(new URL('/login?role=team&error=unauthorized', request.url));
    }
  }

  // Protect Judge Routes
  if (path.startsWith('/judge')) {
    const session = await getSession();
    if (!session || session.role !== 'judge') {
      return NextResponse.redirect(new URL('/login?role=judge&error=unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/team/:path*', '/judge/:path*', '/display/:path*'],
};
