// V2 Submissions API – same as V1 plus Google Sheets sync trigger
import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';
import { processSyncQueue } from '@/lib/google-sheets';
import { inspectTextForAiMarkers } from '@/lib/anti-ai-heuristics';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const teamId = req.nextUrl.searchParams.get('teamId') || (session.role === 'team' ? session.userId : null);

  if (!teamId) {
    return NextResponse.json({ success: false, message: 'Team ID required' }, { status: 400 });
  }

  if (session.role === 'team' && session.userId !== teamId) {
    return NextResponse.json({ success: false, message: 'Forbidden: Access to another team submission is prohibited.' }, { status: 403 });
  }

  const submission = serverStore.getSubmissionByTeamId(teamId);
  const team = serverStore.getTeamById(teamId);
  const includeBenchmark = session.role === 'admin' || session.role === 'judge';
  const profile = team ? serverStore.getProfileById(team.assigned_profile_id, includeBenchmark) : null;

  return NextResponse.json({
    success: true,
    submission,
    team,
    profile,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, teamId, answers } = body;

    const targetTeamId = teamId || session.userId;

    if (session.role === 'team' && session.userId !== targetTeamId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (action === 'autosave') {
      // Check for AI phrases in justification (Q5) or customer identification (Q1)
      if (answers?.q5_price_justification) {
        const aiCheck = inspectTextForAiMarkers(answers.q5_price_justification);
        if (aiCheck.isSuspicious) {
          serverStore.recordIntegrityEvent(
            targetTeamId,
            'ai_suspect_phrase',
            `AI stylistic marker detected: [${aiCheck.matches.join(', ')}] in Q5 Justification`
          );
        }
      }

      const res = serverStore.saveDraftSubmission(targetTeamId, answers);
      return NextResponse.json(res);
    }

    if (action === 'submit') {
      const res = serverStore.finalizeSubmission(targetTeamId);
      if (res.success) {
        serverStore.logAuditAction(session.userId, session.role, 'SUBMISSION_FINALIZED', 'team_submissions', targetTeamId);
        // V2: Trigger async Google Sheets sync (non-blocking)
        // Fire and forget — submission confirmation does NOT depend on Sheets availability
        const sheetsConfig = serverStore.getSheetsConfig();
        if (sheetsConfig.is_connected && sheetsConfig.spreadsheet_id) {
          processSyncQueue().catch((e) => {
            console.error('[Sheets Sync] Background sync failed:', e.message);
          });
        }
      }
      return NextResponse.json(res);
    }

    if (action === 'grant_edit') {
      if (session.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Admin required to grant edit' }, { status: 403 });
      }
      const success = serverStore.grantEditPermission(targetTeamId, session.userId, body.reason || 'Admin approved re-edit');
      serverStore.logAuditAction(session.userId, 'admin', 'GRANT_EDIT_PERMISSION', 'team_submissions', targetTeamId, { reason: body.reason });
      return NextResponse.json({ success, message: success ? 'Edit permission granted' : 'Failed' });
    }

    if (action === 'revoke_edit') {
      if (session.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 });
      }
      const success = serverStore.revokeEditPermission(targetTeamId);
      serverStore.logAuditAction(session.userId, 'admin', 'REVOKE_EDIT_PERMISSION', 'team_submissions', targetTeamId);
      return NextResponse.json({ success, message: success ? 'Edit permission closed' : 'Failed' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
