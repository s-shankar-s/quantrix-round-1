import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const config = serverStore.getEvaluationConfig();
  const isPublished = config.results_published;

  // If not published, only authenticated admins and judges can see scores
  if (!isPublished) {
    if (!session || session.role === 'team') {
      return NextResponse.json({
        success: true,
        published: false,
        message: 'Official results have not been published by the organisers.',
      });
    }
  }

  const results = serverStore.computeTeamScores();
  return NextResponse.json({
    success: true,
    published: isPublished,
    config,
    results,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, publish } = body;

    if (action === 'toggle_publish') {
      const config = serverStore.updateEvaluationConfig({
        results_published: Boolean(publish),
        published_at: publish ? new Date().toISOString() : null,
        published_by: publish ? session.userId : null,
      });
      serverStore.logAuditAction(session.userId, 'admin', publish ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS', 'evaluation_config', '1');
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
