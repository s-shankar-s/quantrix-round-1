import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { DisplayStats } from '@/types';

export async function GET(req: NextRequest) {
  const timer = serverStore.getTimerState();
  const teams = serverStore.getTeams();
  const submissions = serverStore.getSubmissions();
  const missionProgress = serverStore.getAllMissionProgress();

  const teamsOnline = teams.filter((t) => t.login_status === 'online').length;
  const submissionsCompleted = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'auto_submitted_at_expiry' || s.status === 'revised_and_resubmitted'
  ).length;
  const submissionsWorking = submissions.filter((s) => s.status === 'draft_in_progress' || s.status === 'revision_in_progress').length;
  const submissionsNotStarted = submissions.filter((s) => s.status === 'not_started').length;

  const m1 = Array.from(missionProgress.values()).filter((m) => m.mission_01_complete).length;
  const m2 = Array.from(missionProgress.values()).filter((m) => m.mission_02_complete).length;
  const m3 = Array.from(missionProgress.values()).filter((m) => m.mission_03_complete).length;
  const m4 = Array.from(missionProgress.values()).filter((m) => m.mission_04_complete).length;

  const totalPossibleMissions = teams.length * 4;
  const totalCompletedMissions = m1 + m2 + m3 + m4;
  const overallProgressPct = Math.round((totalCompletedMissions / (totalPossibleMissions || 1)) * 100);

  const stats: DisplayStats = {
    timer,
    teams_online: teamsOnline,
    teams_total: teams.length,
    submissions_completed: submissionsCompleted,
    submissions_working: submissionsWorking,
    submissions_not_started: submissionsNotStarted,
    overall_progress_pct: overallProgressPct,
    mission_completion: {
      mission_01: m1,
      mission_02: m2,
      mission_03: m3,
      mission_04: m4,
    },
  };

  return NextResponse.json({ success: true, stats });
}
