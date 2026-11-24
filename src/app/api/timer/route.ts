import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function GET() {
  const timer = serverStore.getTimerState();
  return NextResponse.json({
    success: true,
    timer,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, durationMinutes } = body;

    let updatedTimer;
    switch (action) {
      case 'start':
        updatedTimer = serverStore.startTimer(durationMinutes, session.userId);
        serverStore.logAuditAction(session.userId, 'admin', 'TIMER_START', 'round_timer_state', '1', { durationMinutes });
        break;
      case 'pause':
        updatedTimer = serverStore.pauseTimer(session.userId);
        serverStore.logAuditAction(session.userId, 'admin', 'TIMER_PAUSE', 'round_timer_state', '1');
        break;
      case 'resume':
        updatedTimer = serverStore.resumeTimer(session.userId);
        serverStore.logAuditAction(session.userId, 'admin', 'TIMER_RESUME', 'round_timer_state', '1');
        break;
      case 'end':
        updatedTimer = serverStore.endTimer(session.userId);
        serverStore.logAuditAction(session.userId, 'admin', 'TIMER_END', 'round_timer_state', '1');
        break;
      case 'reset':
        updatedTimer = serverStore.resetTimer(durationMinutes || 12, session.userId);
        serverStore.logAuditAction(session.userId, 'admin', 'TIMER_RESET', 'round_timer_state', '1', { durationMinutes });
        break;
      default:
        return NextResponse.json({ success: false, message: 'Unknown timer action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      timer: updatedTimer,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Timer update failed' }, { status: 500 });
  }
}
