import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'team') {
      return NextResponse.json({ success: false, message: 'Only teams record integrity telemetry' }, { status: 403 });
    }

    const body = await req.json();
    const { event_type, details } = body;

    const event = serverStore.recordIntegrityEvent(session.userId, event_type, details);
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Telemetry error' }, { status: 500 });
  }
}
