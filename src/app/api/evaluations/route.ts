import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'judge')) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const teamId = req.nextUrl.searchParams.get('teamId');
  const config = serverStore.getEvaluationConfig();
  const evaluations = serverStore.getEvaluations();
  const judges = serverStore.getJudges();

  // Also provide teams, profiles (with benchmarks for judges), and submissions directly
  // so judges do not rely on /api/admin
  const teams = serverStore.getTeams();
  const profiles = serverStore.getProfiles(true); // Judges see benchmarks
  const submissions = serverStore.getSubmissions();

  return NextResponse.json({
    success: true,
    config,
    judges,
    teams,
    profiles,
    submissions,
    evaluations: teamId ? evaluations.filter((e) => e.team_id === teamId) : evaluations,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'judge')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, teamId, evaluationData, configData } = body;

    // Admin configuration updates
    if (action === 'update_config') {
      if (session.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Admin required to configure evaluations' }, { status: 403 });
      }
      const updated = serverStore.updateEvaluationConfig(configData);
      serverStore.logAuditAction(session.userId, 'admin', 'UPDATE_EVALUATION_CONFIG', 'evaluation_config', '1', configData);
      return NextResponse.json({ success: true, config: updated });
    }

    // Save evaluation by judge
    if (action === 'save_evaluation') {
      const judgeId = session.role === 'judge' ? session.userId : body.judgeId || 'judge_01';
      const res = serverStore.saveEvaluation(teamId, judgeId, evaluationData);
      if (res.success && evaluationData.is_final) {
        serverStore.logAuditAction(session.userId, session.role, 'FINALIZE_EVALUATION', 'judge_evaluations', `${teamId}_${judgeId}`);
      }
      return NextResponse.json(res);
    }

    // Reopen finalized evaluation (Admin only)
    if (action === 'reopen_evaluation') {
      if (session.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Admin required to reopen evaluation' }, { status: 403 });
      }
      const judgeId = body.judgeId || 'judge_01';
      const success = serverStore.reopenEvaluation(teamId, judgeId);
      serverStore.logAuditAction(session.userId, 'admin', 'REOPEN_EVALUATION', 'judge_evaluations', `${teamId}_${judgeId}`);
      return NextResponse.json({ success, message: success ? 'Evaluation unlocked' : 'Failed' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
