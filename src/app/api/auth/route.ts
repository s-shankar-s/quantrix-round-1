import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import { serverStore } from '@/lib/server-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password } = body;

    if (action === 'logout') {
      const session = await getSession();
      if (session && session.role === 'team') {
        serverStore.setTeamLoginStatus(session.userId, 'offline');
      }
      await clearSessionCookie();
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
    }

    const user = await verifyCredentials(username, password);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials or account disabled' }, { status: 401 });
    }

    await createSessionCookie(user);

    if (user.role === 'team') {
      serverStore.setTeamLoginStatus(user.id, 'online');
    }

    serverStore.logAuditAction(user.id, user.role, 'LOGIN_SUCCESS', 'app_users', user.id);

    return NextResponse.json({
      success: true,
      user,
      redirectTo: user.role === 'admin' ? '/admin' : user.role === 'judge' ? '/judge' : '/team',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, session });
}
