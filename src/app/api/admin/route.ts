// V2 Admin API – extended with Google Sheets integration data
import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const teams = serverStore.getTeams();
  const profiles = serverStore.getProfiles(true);
  const submissions = serverStore.getSubmissions();
  const timer = serverStore.getTimerState();
  const judges = serverStore.getJudges();
  const evalConfig = serverStore.getEvaluationConfig();
  const revisions = serverStore.getRevisions();
  const integrity = serverStore.getIntegrityEvents();
  const auditLogs = serverStore.getAuditLogs();
  const results = serverStore.computeTeamScores();
  // V2: Google Sheets
  const sheetsConfig = serverStore.getSheetsConfig();
  const syncStats = serverStore.getSyncStats();
  const syncQueue = serverStore.getSyncQueue().slice(0, 50); // Last 50 records

  // V2: Mission progress aggregate
  const missionProgress = serverStore.getAllMissionProgress();
  const missionStats = {
    mission_01: Array.from(missionProgress.values()).filter((m) => m.mission_01_complete).length,
    mission_02: Array.from(missionProgress.values()).filter((m) => m.mission_02_complete).length,
    mission_03: Array.from(missionProgress.values()).filter((m) => m.mission_03_complete).length,
    mission_04: Array.from(missionProgress.values()).filter((m) => m.mission_04_complete).length,
  };

  return NextResponse.json({
    success: true,
    teams,
    profiles,
    submissions,
    timer,
    judges,
    evalConfig,
    revisions,
    integrity,
    auditLogs,
    results,
    sheetsConfig,
    syncStats,
    syncQueue,
    missionStats,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetId, data } = body;

    if (action === 'update_team_name') {
      serverStore.updateTeamName(targetId, data.name);
      serverStore.logAuditAction(session.userId, 'admin', 'UPDATE_TEAM_NAME', 'teams', targetId, { name: data.name });
      return NextResponse.json({ success: true });
    }

    if (action === 'reassign_profile') {
      const timer = serverStore.getTimerState();
      serverStore.assignProfileToTeam(targetId, Number(data.profileId));
      serverStore.logAuditAction(session.userId, 'admin', 'REASSIGN_PROFILE', 'teams', targetId, { newProfileId: data.profileId, roundStatus: timer.status });
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      serverStore.setUserPassword(targetId, data.password);
      serverStore.logAuditAction(session.userId, 'admin', 'RESET_PASSWORD', 'app_users', targetId);
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_active') {
      serverStore.toggleUserActive(targetId, data.active);
      serverStore.logAuditAction(session.userId, 'admin', 'TOGGLE_USER_ACTIVE', 'app_users', targetId, { active: data.active });
      return NextResponse.json({ success: true });
    }

    if (action === 'add_judge') {
      const newJudge = serverStore.addJudge(data.judge_id, data.name, data.email, data.password);
      serverStore.logAuditAction(session.userId, 'admin', 'ADD_JUDGE', 'judges', data.judge_id, { name: data.name });
      return NextResponse.json({ success: true, judge: newJudge });
    }

    if (action === 'set_lead_judge') {
      serverStore.setLeadJudge(targetId);
      serverStore.logAuditAction(session.userId, 'admin', 'SET_LEAD_JUDGE', 'judges', targetId);
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_ai_penalty') {
      serverStore.resetAiPenalty(targetId, session.userId);
      return NextResponse.json({ success: true, message: `AI penalty for team ${targetId} reset by administrator.` });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
