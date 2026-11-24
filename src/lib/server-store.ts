// Unified Server Store for Quantrix V2
// V2 adds: Google Sheets config + sync queue, mission progress tracking

import {
  AppUser,
  CustomerProfile,
  EvaluationConfig,
  GoogleSheetsConfig,
  IntegrityEvent,
  Judge,
  JudgeEvaluation,
  MissionProgress,
  RoundTimerState,
  SheetsSyncRecord,
  SubmissionRevision,
  Team,
  TeamScoreSummary,
  TeamSubmission,
} from '@/types';
import { RAW_CUSTOMER_PROFILES } from './data';
import bcrypt from 'bcryptjs';

declare global {
  var __quantrix_store_initialized: boolean | undefined;
  var __quantrix_users: Map<string, AppUser & { password_hash: string }>;
  var __quantrix_teams: Map<string, Team>;
  var __quantrix_profiles: Map<number, CustomerProfile>;
  var __quantrix_timer: RoundTimerState;
  var __quantrix_submissions: Map<string, TeamSubmission>;
  var __quantrix_revisions: SubmissionRevision[];
  var __quantrix_judges: Map<string, Judge>;
  var __quantrix_eval_config: EvaluationConfig;
  var __quantrix_evaluations: Map<string, JudgeEvaluation>;
  var __quantrix_integrity: IntegrityEvent[];
  var __quantrix_audit_logs: any[];
  // V2 additions
  var __quantrix_sheets_config: GoogleSheetsConfig;
  var __quantrix_sync_queue: Map<string, SheetsSyncRecord>;
  var __quantrix_mission_progress: Map<string, MissionProgress>;
  var __quantrix_ai_penalty_resets: Set<string>;
}

function initializeStore() {
  if (global.__quantrix_store_initialized) return;

  global.__quantrix_users = new Map();
  global.__quantrix_teams = new Map();
  global.__quantrix_profiles = new Map();
  global.__quantrix_submissions = new Map();
  global.__quantrix_revisions = [];
  global.__quantrix_judges = new Map();
  global.__quantrix_evaluations = new Map();
  global.__quantrix_integrity = [];
  global.__quantrix_audit_logs = [];
  // V2
  global.__quantrix_sync_queue = new Map();
  global.__quantrix_mission_progress = new Map();
  global.__quantrix_ai_penalty_resets = new Set();

  // Seed Profiles
  RAW_CUSTOMER_PROFILES.forEach((p) => {
    global.__quantrix_profiles.set(p.id, { ...p });
  });

  // Seed Admin
  const adminSalt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('QuantrixAdmin@2026!', adminSalt);
  global.__quantrix_users.set('admin', {
    id: 'admin',
    username: 'admin',
    password_hash: adminHash,
    role: 'admin',
    display_name: 'Lead Organiser (Quantrix)',
    is_active: true,
    created_at: new Date().toISOString(),
  });

  // Seed 30 Teams
  for (let i = 1; i <= 30; i++) {
    const teamNum = i.toString().padStart(2, '0');
    const teamId = `team_${teamNum}`;
    const defaultPassword = `TeamPass@${teamNum}`;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    global.__quantrix_users.set(teamId, {
      id: teamId,
      username: teamId,
      password_hash: hash,
      role: 'team',
      display_name: `Team ${teamNum}`,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    global.__quantrix_teams.set(teamId, {
      team_id: teamId,
      team_number: i,
      team_name: `Team ${teamNum}`,
      assigned_profile_id: i,
      login_status: 'offline',
    });

    global.__quantrix_submissions.set(teamId, {
      id: `sub_${teamId}`,
      team_id: teamId,
      q1_target_customer: '',
      q2_factor_1: '',
      q2_factor_2: '',
      q2_factor_3: '',
      q3_survey_top_price_range: '',
      q4_recommended_price: null,
      q5_price_justification: '',
      status: 'not_started',
      is_auto_submitted: false,
      last_saved_at: new Date().toISOString(),
      submitted_at: null,
      edit_permitted: false,
      edit_approved_by: null,
      edit_reason: null,
      mission_progress: {
        mission_01_complete: false,
        mission_02_complete: false,
        mission_03_complete: false,
        mission_04_complete: false,
        badges_earned: [],
      },
    });

    global.__quantrix_mission_progress.set(teamId, {
      mission_01_complete: false,
      mission_02_complete: false,
      mission_03_complete: false,
      mission_04_complete: false,
      badges_earned: [],
    });
  }

  // Seed Sandbox / Demonstration Trial Profile (ID: 999)
  global.__quantrix_profiles.set(999, {
    id: 999,
    customer_profile: 'SAMPLE DEMO PROFILE (Trial & Demonstration Only)',
    age_range: '25 – 35 Years (Sample Data)',
    budget_income_context: '₹40,000 – ₹55,000 / month (Sample Demonstration Household)',
    primary_purchase_factor: 'Balanced Value & Durability (Sample)',
    other_preferences: 'Prefers ergonomic daily essentials with prompt after-sales support.',
    preferred_product: 'Sample Demonstration Product Category',
    purchase_channel: 'Omnichannel (Online & Retail)',
    indicative_wtp: '₹250 – ₹350 (Confidential Benchmark - Demo Only)',
  });

  // Seed Sandbox / Trial Account (team_trial / demo)
  const trialSalt = bcrypt.genSaltSync(10);
  const trialHash = bcrypt.hashSync('Trial2026!', trialSalt);
  global.__quantrix_users.set('trial', {
    id: 'trial',
    username: 'trial',
    password_hash: trialHash,
    role: 'team',
    display_name: 'Trial / Demo Team (Sandbox)',
    is_active: true,
    created_at: new Date().toISOString(),
  });

  global.__quantrix_teams.set('trial', {
    team_id: 'trial',
    team_number: 99,
    team_name: 'Trial / Demonstration Team',
    assigned_profile_id: 999,
    login_status: 'offline',
  });

  global.__quantrix_submissions.set('trial', {
    id: 'sub_trial',
    team_id: 'trial',
    q1_target_customer: '',
    q2_factor_1: '',
    q2_factor_2: '',
    q2_factor_3: '',
    q3_survey_top_price_range: '',
    q4_recommended_price: null,
    q5_price_justification: '',
    status: 'not_started',
    is_auto_submitted: false,
    last_saved_at: new Date().toISOString(),
    submitted_at: null,
    edit_permitted: true,
    edit_approved_by: 'system',
    edit_reason: 'Trial Sandbox Mode',
    mission_progress: {
      mission_01_complete: false,
      mission_02_complete: false,
      mission_03_complete: false,
      mission_04_complete: false,
      badges_earned: [],
    },
  });

  global.__quantrix_mission_progress.set('trial', {
    mission_01_complete: false,
    mission_02_complete: false,
    mission_03_complete: false,
    mission_04_complete: false,
    badges_earned: [],
  });

  // Seed 10 Demo Trial Accounts (demo_01 … demo_10)
  for (let d = 1; d <= 10; d++) {
    const dNum = d.toString().padStart(2, '0');
    const demoId = `demo_${dNum}`;
    const demoHash = bcrypt.hashSync(`Demo${dNum}@2026`, bcrypt.genSaltSync(10));
    global.__quantrix_users.set(demoId, {
      id: demoId,
      username: demoId,
      password_hash: demoHash,
      role: 'team',
      display_name: `Demo Trial Team ${dNum}`,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    global.__quantrix_teams.set(demoId, {
      team_id: demoId,
      team_number: 100 + d,
      team_name: `Trial Demo ${dNum}`,
      assigned_profile_id: 999,
      login_status: 'offline',
    });
    global.__quantrix_submissions.set(demoId, {
      id: `sub_${demoId}`,
      team_id: demoId,
      q1_target_customer: '',
      q2_factor_1: '',
      q2_factor_2: '',
      q2_factor_3: '',
      q3_survey_top_price_range: '',
      q4_recommended_price: null,
      q5_price_justification: '',
      status: 'not_started',
      is_auto_submitted: false,
      last_saved_at: new Date().toISOString(),
      submitted_at: null,
      edit_permitted: true,
      edit_approved_by: 'system',
      edit_reason: 'Trial Sandbox Mode',
      mission_progress: {
        mission_01_complete: false,
        mission_02_complete: false,
        mission_03_complete: false,
        mission_04_complete: false,
        badges_earned: [],
      },
    });
    global.__quantrix_mission_progress.set(demoId, {
      mission_01_complete: false,
      mission_02_complete: false,
      mission_03_complete: false,
      mission_04_complete: false,
      badges_earned: [],
    });
  }

  // Seed Default Judge 1
  const judge1Salt = bcrypt.genSaltSync(10);
  const judge1Hash = bcrypt.hashSync('Judge2026!', judge1Salt);
  global.__quantrix_users.set('judge_01', {
    id: 'judge_01',
    username: 'judge_01',
    password_hash: judge1Hash,
    role: 'judge',
    display_name: 'Dr. R. Ramanathan (Lead Judge)',
    is_active: true,
    created_at: new Date().toISOString(),
  });

  global.__quantrix_judges.set('judge_01', {
    judge_id: 'judge_01',
    name: 'Dr. R. Ramanathan (Lead Judge)',
    email: 'lead.judge@tsm.ac.in',
    is_lead: true,
    is_active: true,
  });

  // Seed Central Timer State
  global.__quantrix_timer = {
    id: 1,
    status: 'not_started',
    duration_seconds: 720,
    started_at: null,
    deadline_at: null,
    remaining_seconds_on_pause: 720,
    server_time_reference: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Seed Evaluation Config
  global.__quantrix_eval_config = {
    id: 1,
    is_open: false,
    scheduled_open_at: null,
    scheduled_close_at: null,
    scoring_mode: 'panel_common',
    lead_judge_id: 'judge_01',
    results_published: false,
    published_at: null,
    published_by: null,
    updated_at: new Date().toISOString(),
  };

  // V2: Seed Google Sheets Config
  global.__quantrix_sheets_config = {
    id: 1,
    is_connected: false,
    owner_email: undefined,
    spreadsheet_id: undefined,
    spreadsheet_url: undefined,
    spreadsheet_title: undefined,
    created_at: undefined,
    last_sync_at: undefined,
    token_expiry: undefined,
    recipients: [],
    updated_at: new Date().toISOString(),
  };

  global.__quantrix_store_initialized = true;
}

initializeStore();

export const serverStore = {
  // Authentication & Users
  getUserByUsername: (username: string) => {
    initializeStore();
    return global.__quantrix_users.get(username.trim().toLowerCase());
  },
  getUserById: (id: string) => {
    initializeStore();
    return global.__quantrix_users.get(id);
  },
  getAllUsers: () => {
    initializeStore();
    return Array.from(global.__quantrix_users.values());
  },
  setUserPassword: (userId: string, plainTextPass: string) => {
    initializeStore();
    const user = global.__quantrix_users.get(userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(plainTextPass, salt);
    user.updated_at = new Date().toISOString();
    return true;
  },
  toggleUserActive: (userId: string, active: boolean) => {
    initializeStore();
    const user = global.__quantrix_users.get(userId);
    if (!user) return false;
    user.is_active = active;
    return true;
  },

  // Teams
  getTeams: () => {
    initializeStore();
    return Array.from(global.__quantrix_teams.values()).sort(
      (a, b) => a.team_number - b.team_number
    );
  },
  getTeamById: (teamId: string) => {
    initializeStore();
    return global.__quantrix_teams.get(teamId);
  },
  updateTeamName: (teamId: string, name: string) => {
    initializeStore();
    const t = global.__quantrix_teams.get(teamId);
    if (!t) return false;
    t.team_name = name;
    return true;
  },
  assignProfileToTeam: (teamId: string, profileId: number) => {
    initializeStore();
    const t = global.__quantrix_teams.get(teamId);
    if (!t) return false;
    t.assigned_profile_id = profileId;
    return true;
  },
  setTeamLoginStatus: (teamId: string, status: 'online' | 'offline') => {
    initializeStore();
    const t = global.__quantrix_teams.get(teamId);
    if (!t) return false;
    t.login_status = status;
    t.last_active_at = new Date().toISOString();
    return true;
  },

  // Profiles
  getProfiles: (includeConfidentialBenchmark: boolean = false): CustomerProfile[] => {
    initializeStore();
    const list = Array.from(global.__quantrix_profiles.values()).sort((a, b) => a.id - b.id);
    if (includeConfidentialBenchmark) return list;
    return list.map((p) => {
      const { indicative_wtp, ...safeProfile } = p;
      return safeProfile;
    });
  },
  getProfileById: (id: number, includeConfidentialBenchmark: boolean = false): CustomerProfile | undefined => {
    initializeStore();
    const p = global.__quantrix_profiles.get(id);
    if (!p) return undefined;
    if (includeConfidentialBenchmark) return p;
    const { indicative_wtp, ...safeProfile } = p;
    return safeProfile;
  },

  // Central Timer
  getTimerState: (): RoundTimerState => {
    initializeStore();
    const timer = { ...global.__quantrix_timer };
    const now = new Date();
    timer.server_time_reference = now.toISOString();

    if (timer.status === 'running' && timer.deadline_at) {
      const deadline = new Date(timer.deadline_at).getTime();
      const current = now.getTime();
      if (current >= deadline) {
        timer.status = 'completed';
        timer.remaining_seconds_on_pause = 0;
        global.__quantrix_timer = { ...timer };
        // NOTE: Server deadline passing intentionally does NOT trigger auto-submission.
        // Submissions remain in their existing status (draft or submitted) without forced auto-submit.
      }
    }
    return timer;
  },
  startTimer: (durationMinutes?: number, actorId?: string): RoundTimerState => {
    initializeStore();
    const now = new Date();
    const durationSec = durationMinutes ? durationMinutes * 60 : global.__quantrix_timer.duration_seconds;
    const deadline = new Date(now.getTime() + durationSec * 1000);

    global.__quantrix_timer = {
      id: 1,
      status: 'running',
      duration_seconds: durationSec,
      started_at: now.toISOString(),
      deadline_at: deadline.toISOString(),
      remaining_seconds_on_pause: durationSec,
      server_time_reference: now.toISOString(),
      updated_at: now.toISOString(),
      updated_by: actorId || 'admin',
    };
    return global.__quantrix_timer;
  },
  pauseTimer: (actorId?: string): RoundTimerState => {
    initializeStore();
    const timer = global.__quantrix_timer;
    if (timer.status !== 'running') return timer;

    const now = new Date().getTime();
    const deadline = timer.deadline_at ? new Date(timer.deadline_at).getTime() : now;
    const remaining = Math.max(0, Math.round((deadline - now) / 1000));

    global.__quantrix_timer = {
      ...timer,
      status: 'paused',
      remaining_seconds_on_pause: remaining,
      deadline_at: null,
      server_time_reference: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: actorId || 'admin',
    };
    return global.__quantrix_timer;
  },
  resumeTimer: (actorId?: string): RoundTimerState => {
    initializeStore();
    const timer = global.__quantrix_timer;
    if (timer.status !== 'paused') return timer;

    const now = new Date();
    const remaining = timer.remaining_seconds_on_pause;
    const deadline = new Date(now.getTime() + remaining * 1000);

    global.__quantrix_timer = {
      ...timer,
      status: 'running',
      deadline_at: deadline.toISOString(),
      server_time_reference: now.toISOString(),
      updated_at: now.toISOString(),
      updated_by: actorId || 'admin',
    };
    return global.__quantrix_timer;
  },
  endTimer: (actorId?: string): RoundTimerState => {
    initializeStore();
    global.__quantrix_timer = {
      ...global.__quantrix_timer,
      status: 'completed',
      remaining_seconds_on_pause: 0,
      deadline_at: null,
      server_time_reference: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: actorId || 'admin',
    };
    serverStore.lockAllSubmissionsAtExpiry();
    return global.__quantrix_timer;
  },
  resetTimer: (newDurationMinutes: number = 12, actorId?: string): RoundTimerState => {
    initializeStore();
    const durationSec = newDurationMinutes * 60;
    global.__quantrix_timer = {
      id: 1,
      status: 'not_started',
      duration_seconds: durationSec,
      started_at: null,
      deadline_at: null,
      remaining_seconds_on_pause: durationSec,
      server_time_reference: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: actorId || 'admin',
    };
    return global.__quantrix_timer;
  },

  // Submissions
  getSubmissions: () => {
    initializeStore();
    return Array.from(global.__quantrix_submissions.values());
  },
  getSubmissionByTeamId: (teamId: string) => {
    initializeStore();
    return global.__quantrix_submissions.get(teamId);
  },
  saveDraftSubmission: (teamId: string, data: Partial<TeamSubmission>): { success: boolean; message: string; submission?: TeamSubmission } => {
    initializeStore();
    const timer = serverStore.getTimerState();
    const sub = global.__quantrix_submissions.get(teamId);
    if (!sub) return { success: false, message: 'Submission not found' };

    if (
      (sub.status === 'submitted' || sub.status === 'auto_submitted_at_expiry') &&
      !sub.edit_permitted
    ) {
      return { success: false, message: 'Submission is locked and cannot be edited.' };
    }

    if (timer.status === 'completed' && !sub.edit_permitted) {
      return { success: false, message: 'Round time has elapsed. Submissions are closed.' };
    }

    const updated: TeamSubmission = {
      ...sub,
      q1_target_customer: data.q1_target_customer !== undefined ? data.q1_target_customer : sub.q1_target_customer,
      q2_factor_1: data.q2_factor_1 !== undefined ? data.q2_factor_1 : sub.q2_factor_1,
      q2_factor_2: data.q2_factor_2 !== undefined ? data.q2_factor_2 : sub.q2_factor_2,
      q2_factor_3: data.q2_factor_3 !== undefined ? data.q2_factor_3 : sub.q2_factor_3,
      q3_survey_top_price_range: data.q3_survey_top_price_range !== undefined ? data.q3_survey_top_price_range : sub.q3_survey_top_price_range,
      q4_recommended_price: data.q4_recommended_price !== undefined ? data.q4_recommended_price : sub.q4_recommended_price,
      q5_price_justification: data.q5_price_justification !== undefined ? data.q5_price_justification : sub.q5_price_justification,
      status: sub.status === 'not_started' ? 'draft_in_progress' : sub.status,
      last_saved_at: new Date().toISOString(),
    };

    // V2: Compute mission completion
    const mp: MissionProgress = {
      mission_01_complete: !!(updated.q1_target_customer?.trim() && updated.q2_factor_1?.trim() && updated.q2_factor_2?.trim() && updated.q2_factor_3?.trim()),
      mission_02_complete: !!(updated.q3_survey_top_price_range?.trim()),
      mission_03_complete: !!(updated.q4_recommended_price && Number(updated.q4_recommended_price) > 0),
      mission_04_complete: !!(updated.q5_price_justification?.trim() && updated.q5_price_justification.trim().length >= 10),
      badges_earned: [],
    };
    if (mp.mission_01_complete) mp.badges_earned.push('Customer Detective');
    if (mp.mission_02_complete) mp.badges_earned.push('Data Decoder');
    if (mp.mission_03_complete) mp.badges_earned.push('Pricing Strategist');
    if (mp.mission_04_complete) mp.badges_earned.push('Business Thinker');

    updated.mission_progress = mp;
    global.__quantrix_mission_progress.set(teamId, mp);
    global.__quantrix_submissions.set(teamId, updated);
    return { success: true, message: 'Draft autosaved', submission: updated };
  },
  finalizeSubmission: (teamId: string): { success: boolean; message: string; submission?: TeamSubmission } => {
    initializeStore();
    const sub = global.__quantrix_submissions.get(teamId);
    if (!sub) return { success: false, message: 'Submission not found' };

    const timer = serverStore.getTimerState();
    if (timer.status === 'completed' && !sub.edit_permitted) {
      return { success: false, message: 'Time expired. Round has closed.' };
    }

    if (!sub.q1_target_customer?.trim()) {
      return { success: false, message: 'Mission 01: Target Customer (Q1) is required.' };
    }
    if (!sub.q2_factor_1?.trim() || !sub.q2_factor_2?.trim() || !sub.q2_factor_3?.trim()) {
      return { success: false, message: 'Mission 01: All three influencing factors (Q2) are required.' };
    }
    if (!sub.q3_survey_top_price_range?.trim()) {
      return { success: false, message: 'Mission 02: Survey price range (Q3) is required.' };
    }
    if (sub.q4_recommended_price === null || isNaN(Number(sub.q4_recommended_price)) || Number(sub.q4_recommended_price) <= 0) {
      return { success: false, message: 'Mission 03: Recommended price (Q4) must be a positive number.' };
    }
    if (!sub.q5_price_justification?.trim() || sub.q5_price_justification.trim().length < 10) {
      return { success: false, message: 'Mission 04: Justification (Q5) must be answered with meaningful reasoning.' };
    }

    const isRevision = sub.edit_permitted;
    const now = new Date().toISOString();

    const finalized: TeamSubmission = {
      ...sub,
      status: isRevision ? 'revised_and_resubmitted' : 'submitted',
      is_auto_submitted: false,
      submitted_at: now,
      last_saved_at: now,
      edit_permitted: false,
    };

    global.__quantrix_submissions.set(teamId, finalized);

    // V2: Queue Google Sheets sync
    serverStore.queueSheetsSync('submission', sub.id);

    return { success: true, message: 'Mission complete! Your answers have been submitted.', submission: finalized };
  },
  lockAllSubmissionsAtExpiry: () => {
    initializeStore();
    const now = new Date().toISOString();
    global.__quantrix_submissions.forEach((sub, teamId) => {
      if (sub.status === 'draft_in_progress' || sub.status === 'not_started') {
        const hasSomeContent =
          sub.q1_target_customer ||
          sub.q2_factor_1 ||
          sub.q3_survey_top_price_range ||
          sub.q4_recommended_price ||
          sub.q5_price_justification;

        if (hasSomeContent) {
          sub.status = 'auto_submitted_at_expiry';
          sub.is_auto_submitted = true;
          sub.submitted_at = now;
          serverStore.queueSheetsSync('submission', sub.id);
        }
        sub.edit_permitted = false;
        global.__quantrix_submissions.set(teamId, sub);
      }
    });
  },
  grantEditPermission: (teamId: string, adminId: string, reason: string): boolean => {
    initializeStore();
    const sub = global.__quantrix_submissions.get(teamId);
    if (!sub) return false;

    const revNum = global.__quantrix_revisions.filter((r) => r.team_id === teamId).length + 1;
    global.__quantrix_revisions.push({
      id: `rev_${teamId}_${revNum}`,
      team_id: teamId,
      revision_number: revNum,
      previous_q1: sub.q1_target_customer,
      previous_q2_f1: sub.q2_factor_1,
      previous_q2_f2: sub.q2_factor_2,
      previous_q2_f3: sub.q2_factor_3,
      previous_q3: sub.q3_survey_top_price_range,
      previous_q4: sub.q4_recommended_price,
      previous_q5: sub.q5_price_justification,
      previous_submitted_at: sub.submitted_at,
      approved_by: adminId,
      reason: reason,
      recorded_at: new Date().toISOString(),
    });

    sub.edit_permitted = true;
    sub.edit_approved_by = adminId;
    sub.edit_reason = reason;
    sub.status = 'revision_in_progress';
    global.__quantrix_submissions.set(teamId, sub);
    return true;
  },
  revokeEditPermission: (teamId: string): boolean => {
    initializeStore();
    const sub = global.__quantrix_submissions.get(teamId);
    if (!sub) return false;
    sub.edit_permitted = false;
    sub.status = 'submitted';
    global.__quantrix_submissions.set(teamId, sub);
    return true;
  },
  getRevisions: (teamId?: string) => {
    initializeStore();
    if (teamId) return global.__quantrix_revisions.filter((r) => r.team_id === teamId);
    return global.__quantrix_revisions;
  },

  // Judges
  getJudges: () => {
    initializeStore();
    return Array.from(global.__quantrix_judges.values());
  },
  getJudgeById: (judgeId: string) => {
    initializeStore();
    return global.__quantrix_judges.get(judgeId);
  },
  addJudge: (id: string, name: string, email: string, defaultPassword?: string) => {
    initializeStore();
    const pass = defaultPassword || 'Judge2026!';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pass, salt);

    global.__quantrix_users.set(id, {
      id,
      username: id,
      password_hash: hash,
      role: 'judge',
      display_name: name,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    const newJudge: Judge = { judge_id: id, name, email, is_lead: false, is_active: true };
    global.__quantrix_judges.set(id, newJudge);
    return newJudge;
  },
  toggleJudgeActive: (judgeId: string, active: boolean) => {
    initializeStore();
    const j = global.__quantrix_judges.get(judgeId);
    if (!j) return false;
    j.is_active = active;
    const u = global.__quantrix_users.get(judgeId);
    if (u) u.is_active = active;
    return true;
  },
  setLeadJudge: (judgeId: string) => {
    initializeStore();
    global.__quantrix_judges.forEach((j) => { j.is_lead = j.judge_id === judgeId; });
    global.__quantrix_eval_config.lead_judge_id = judgeId;
    return true;
  },

  // Evaluation Config
  getEvaluationConfig: (): EvaluationConfig => {
    initializeStore();
    const cfg = { ...global.__quantrix_eval_config };
    if (!cfg.is_open && cfg.scheduled_open_at) {
      const openTime = new Date(cfg.scheduled_open_at).getTime();
      if (Date.now() >= openTime) {
        cfg.is_open = true;
        global.__quantrix_eval_config.is_open = true;
      }
    }
    return cfg;
  },
  updateEvaluationConfig: (data: Partial<EvaluationConfig>) => {
    initializeStore();
    global.__quantrix_eval_config = {
      ...global.__quantrix_eval_config,
      ...data,
      updated_at: new Date().toISOString(),
    };
    return global.__quantrix_eval_config;
  },

  // Judge Evaluations
  getEvaluations: () => {
    initializeStore();
    return Array.from(global.__quantrix_evaluations.values());
  },
  getEvaluationForTeamAndJudge: (teamId: string, judgeId: string) => {
    initializeStore();
    return global.__quantrix_evaluations.get(`${teamId}_${judgeId}`);
  },
  saveEvaluation: (
    teamId: string,
    judgeId: string,
    data: {
      criterion_1_identification: number;
      criterion_2_survey: number;
      criterion_3_price: number;
      criterion_4_justification: number;
      strengths?: string;
      areas_for_improvement?: string;
      general_comments?: string;
      is_final: boolean;
    }
  ): { success: boolean; message: string; evaluation?: JudgeEvaluation } => {
    initializeStore();
    const cfg = serverStore.getEvaluationConfig();
    if (!cfg.is_open) {
      return { success: false, message: 'Evaluation is currently locked by the administrator.' };
    }

    const key = `${teamId}_${judgeId}`;
    const existing = global.__quantrix_evaluations.get(key);
    if (existing?.is_final && data.is_final === false) {
      return { success: false, message: 'This evaluation has already been finalised and locked.' };
    }

    const c1 = Math.min(20, Math.max(0, Number(data.criterion_1_identification) || 0));
    const c2 = Math.min(30, Math.max(0, Number(data.criterion_2_survey) || 0));
    const c3 = Math.min(30, Math.max(0, Number(data.criterion_3_price) || 0));
    const c4 = Math.min(20, Math.max(0, Number(data.criterion_4_justification) || 0));
    const total = Number((c1 + c2 + c3 + c4).toFixed(2));

    const evalRecord: JudgeEvaluation = {
      id: existing?.id || `eval_${key}`,
      team_id: teamId,
      judge_id: judgeId,
      criterion_1_identification: c1,
      criterion_2_survey: c2,
      criterion_3_price: c3,
      criterion_4_justification: c4,
      total_score: total,
      strengths: data.strengths || '',
      areas_for_improvement: data.areas_for_improvement || '',
      general_comments: data.general_comments || '',
      is_final: Boolean(data.is_final),
      evaluated_at: new Date().toISOString(),
    };

    global.__quantrix_evaluations.set(key, evalRecord);

    if (data.is_final) {
      serverStore.queueSheetsSync('evaluation', key);
    }

    return {
      success: true,
      message: data.is_final ? 'Evaluation finalised and locked!' : 'Draft evaluation saved.',
      evaluation: evalRecord,
    };
  },
  reopenEvaluation: (teamId: string, judgeId: string): boolean => {
    initializeStore();
    const key = `${teamId}_${judgeId}`;
    const existing = global.__quantrix_evaluations.get(key);
    if (!existing) return false;
    existing.is_final = false;
    global.__quantrix_evaluations.set(key, existing);
    return true;
  },

  // Score Calculator
  computeTeamScores: (): TeamScoreSummary[] => {
    initializeStore();
    const teams = serverStore.getTeams();
    const submissions = serverStore.getSubmissions();
    const evaluations = serverStore.getEvaluations();
    const config = serverStore.getEvaluationConfig();
    const activeJudges = serverStore.getJudges().filter((j) => j.is_active);

    const summaries: TeamScoreSummary[] = teams.map((t) => {
      const sub = submissions.find((s) => s.team_id === t.team_id);
      const profile = global.__quantrix_profiles.get(t.assigned_profile_id);
      const teamEvals = evaluations.filter((e) => e.team_id === t.team_id && e.is_final);

      let isEvaluated = false;
      let c1 = 0, c2 = 0, c3 = 0, c4 = 0, total = 0;
      const comments: string[] = [];

      if (config.scoring_mode === 'panel_common') {
        const leadEval = teamEvals.find((e) => e.judge_id === config.lead_judge_id) || teamEvals[0];
        if (leadEval) {
          isEvaluated = true;
          c1 = leadEval.criterion_1_identification;
          c2 = leadEval.criterion_2_survey;
          c3 = leadEval.criterion_3_price;
          c4 = leadEval.criterion_4_justification;
          total = leadEval.total_score;
          if (leadEval.general_comments) comments.push(leadEval.general_comments);
        }
      } else {
        const hasAllActiveJudges =
          activeJudges.length > 0 &&
          activeJudges.every((j) => teamEvals.some((e) => e.judge_id === j.judge_id));

        if (hasAllActiveJudges && teamEvals.length > 0) {
          isEvaluated = true;
          const count = teamEvals.length;
          c1 = Number((teamEvals.reduce((acc, e) => acc + e.criterion_1_identification, 0) / count).toFixed(2));
          c2 = Number((teamEvals.reduce((acc, e) => acc + e.criterion_2_survey, 0) / count).toFixed(2));
          c3 = Number((teamEvals.reduce((acc, e) => acc + e.criterion_3_price, 0) / count).toFixed(2));
          c4 = Number((teamEvals.reduce((acc, e) => acc + e.criterion_4_justification, 0) / count).toFixed(2));
          total = Number((c1 + c2 + c3 + c4).toFixed(2));
          teamEvals.forEach((e) => { if (e.general_comments) comments.push(e.general_comments); });
        }
      }

      // Check for AI Intervention & Apply Negative Penalty
      const integrityLogs = (global.__quantrix_integrity || []).filter((l: IntegrityEvent) => l.team_id === t.team_id);
      const hasAiSuspicion = integrityLogs.some((l: IntegrityEvent) => l.event_type === 'ai_suspect_phrase');
      const isPenaltyReset = (global.__quantrix_ai_penalty_resets || new Set<string>()).has(t.team_id);

      let aiPenaltyApplied = false;
      let aiPenaltyPoints = 0;

      if (hasAiSuspicion && !isPenaltyReset) {
        aiPenaltyApplied = true;
        // Negative penalty: docks 25 marks by default if AI detected
        aiPenaltyPoints = 25;
        total = Number((total - aiPenaltyPoints).toFixed(2));
      }

      return {
        team_id: t.team_id,
        team_number: t.team_number,
        team_name: t.team_name,
        assigned_profile_id: t.assigned_profile_id,
        customer_profile_name: profile?.customer_profile || 'Unknown Profile',
        submission_status: sub?.status || 'not_started',
        submitted_at: sub?.submitted_at,
        evaluations_count: teamEvals.length,
        is_evaluated: isEvaluated,
        criterion_1: c1,
        criterion_2: c2,
        criterion_3: c3,
        criterion_4: c4,
        total_score: total,
        ai_penalty_applied: aiPenaltyApplied,
        ai_penalty_points: aiPenaltyPoints,
        comments,
      };
    });

    const sorted = [...summaries].sort((a, b) => b.total_score - a.total_score);
    sorted.forEach((item, idx) => {
      if (item.is_evaluated && item.total_score > 0) item.rank = idx + 1;
    });

    return summaries;
  },

  // Integrity Monitoring
  recordIntegrityEvent: (teamId: string, event_type: any, details?: string) => {
    initializeStore();
    const event: IntegrityEvent = {
      id: `integ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      team_id: teamId,
      event_type,
      details,
      recorded_at: new Date().toISOString(),
    };
    global.__quantrix_integrity.push(event);
    return event;
  },
  getIntegrityEvents: (teamId?: string) => {
    initializeStore();
    if (teamId) return global.__quantrix_integrity.filter((e) => e.team_id === teamId);
    return global.__quantrix_integrity;
  },
  resetAiPenalty: (teamId: string, adminId: string): boolean => {
    initializeStore();
    global.__quantrix_ai_penalty_resets.add(teamId);
    serverStore.logAuditAction(adminId, 'admin', 'reset_ai_penalty', 'team', teamId, {
      message: `AI negative score penalty reset/forgiven by admin ${adminId}`,
    });
    return true;
  },

  // Audit Logs
  logAuditAction: (actorId: string, actorRole: string, action: string, targetType: string, targetId?: string, details?: any) => {
    initializeStore();
    const log = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor_id: actorId,
      actor_role: actorRole,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    };
    global.__quantrix_audit_logs.unshift(log);
    return log;
  },
  getAuditLogs: () => {
    initializeStore();
    return global.__quantrix_audit_logs;
  },

  // ─── V2: Mission Progress ──────────────────────────────────────────────────
  getMissionProgress: (teamId: string): MissionProgress | undefined => {
    initializeStore();
    return global.__quantrix_mission_progress.get(teamId);
  },
  getAllMissionProgress: (): Map<string, MissionProgress> => {
    initializeStore();
    return global.__quantrix_mission_progress;
  },

  // ─── V2: Google Sheets Config ─────────────────────────────────────────────
  getSheetsConfig: (): GoogleSheetsConfig => {
    initializeStore();
    return { ...global.__quantrix_sheets_config };
  },
  updateSheetsConfig: (data: Partial<GoogleSheetsConfig>) => {
    initializeStore();
    global.__quantrix_sheets_config = {
      ...global.__quantrix_sheets_config,
      ...data,
      updated_at: new Date().toISOString(),
    };
    return global.__quantrix_sheets_config;
  },

  // ─── V2: Sheets Sync Queue ────────────────────────────────────────────────
  queueSheetsSync: (eventType: 'submission' | 'evaluation' | 'results', entityId: string): SheetsSyncRecord => {
    initializeStore();
    const id = `sync_${eventType}_${entityId}_${Date.now()}`;
    const record: SheetsSyncRecord = {
      id,
      event_type: eventType,
      entity_id: entityId,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
    };
    global.__quantrix_sync_queue.set(id, record);
    return record;
  },
  getSyncQueue: (): SheetsSyncRecord[] => {
    initializeStore();
    return Array.from(global.__quantrix_sync_queue.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  getSyncStats: () => {
    initializeStore();
    const records = Array.from(global.__quantrix_sync_queue.values());
    const pending = records.filter((r) => r.status === 'pending' || r.status === 'retrying').length;
    const failed = records.filter((r) => r.status === 'failed').length;
    const success = records.filter((r) => r.status === 'success');
    const lastSync = success.length > 0
      ? success.sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())[0].completed_at
      : undefined;
    return { total_synced: success.length, pending, failed, last_sync_at: lastSync };
  },
  updateSyncRecord: (id: string, update: Partial<SheetsSyncRecord>) => {
    initializeStore();
    const record = global.__quantrix_sync_queue.get(id);
    if (!record) return null;
    const updated = { ...record, ...update };
    global.__quantrix_sync_queue.set(id, updated);
    return updated;
  },
  getPendingSyncRecords: (): SheetsSyncRecord[] => {
    initializeStore();
    return Array.from(global.__quantrix_sync_queue.values()).filter(
      (r) => r.status === 'pending' || r.status === 'retrying'
    );
  },
  getFailedSyncRecords: (): SheetsSyncRecord[] => {
    initializeStore();
    return Array.from(global.__quantrix_sync_queue.values()).filter((r) => r.status === 'failed');
  },
};
