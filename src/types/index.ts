// Shared domain models and types for Quantrix V2 – The Price is Right?
// V2 adds: Google Sheets integration types, gamification badge types

export type UserRole = 'admin' | 'team' | 'judge';

export type RoundTimerStatus = 'not_started' | 'running' | 'paused' | 'completed';

export type SubmissionStatus = 
  | 'not_started' 
  | 'draft_in_progress' 
  | 'submitted' 
  | 'auto_submitted_at_expiry' 
  | 'revision_in_progress' 
  | 'revised_and_resubmitted';

export type ScoringMode = 'panel_common' | 'individual_average';

export type SyncStatus = 'pending' | 'success' | 'failed' | 'retrying';

export type MissionId = 'mission_01' | 'mission_02' | 'mission_03' | 'mission_04';

export interface AppUser {
  id: string; // 'admin_01', 'team_01'..'team_15', 'judge_01'
  username: string;
  role: UserRole;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CustomerProfile {
  id: number;
  customer_profile: string;
  age_range: string;
  budget_income_context: string;
  primary_purchase_factor: string;
  other_preferences: string;
  preferred_product: string;
  purchase_channel: string;
  indicative_wtp?: string; // STRICTLY OMITTED FOR TEAMS
}

export interface PurchaseFactorData {
  id: number;
  factor: string;
  customer_count: number;
  percentage: number;
}

export interface WillingnessToPayData {
  id: number;
  price_range: string;
  customer_count: number;
  percentage: number;
}

export interface Team {
  team_id: string; // matches app_users.id (e.g. 'team_01')
  team_number: number; // 1 to 15
  team_name: string;
  assigned_profile_id: number;
  login_status: 'online' | 'offline';
  last_active_at?: string;
  assigned_profile?: CustomerProfile;
}

export interface Judge {
  judge_id: string; // matches app_users.id (e.g. 'judge_01')
  name: string;
  email?: string;
  is_lead: boolean;
  is_active: boolean;
}

export interface RoundTimerState {
  id: number;
  status: RoundTimerStatus;
  duration_seconds: number;
  started_at?: string | null;
  deadline_at?: string | null;
  remaining_seconds_on_pause: number;
  server_time_reference: string;
  updated_at: string;
  updated_by?: string;
}

export interface TeamSubmission {
  id: string;
  team_id: string;
  q1_target_customer: string;
  q2_factor_1: string;
  q2_factor_2: string;
  q2_factor_3: string;
  q3_survey_top_price_range: string;
  q4_recommended_price: number | null;
  q5_price_justification: string;
  status: SubmissionStatus;
  is_auto_submitted: boolean;
  last_saved_at: string;
  submitted_at?: string | null;
  edit_permitted: boolean;
  edit_approved_by?: string | null;
  edit_reason?: string | null;
  // V2: Mission progress tracking
  mission_progress?: MissionProgress;
}

export interface MissionProgress {
  mission_01_complete: boolean;
  mission_02_complete: boolean;
  mission_03_complete: boolean;
  mission_04_complete: boolean;
  badges_earned: string[];
}

export interface SubmissionRevision {
  id: string;
  team_id: string;
  revision_number: number;
  previous_q1: string;
  previous_q2_f1: string;
  previous_q2_f2: string;
  previous_q2_f3: string;
  previous_q3: string;
  previous_q4: number | null;
  previous_q5: string;
  previous_submitted_at?: string | null;
  approved_by: string;
  reason: string;
  recorded_at: string;
}

export interface EvaluationConfig {
  id: number;
  is_open: boolean;
  scheduled_open_at?: string | null;
  scheduled_close_at?: string | null;
  scoring_mode: ScoringMode;
  lead_judge_id?: string | null;
  results_published: boolean;
  published_at?: string | null;
  published_by?: string | null;
  updated_at: string;
}

export interface JudgeEvaluation {
  id: string;
  team_id: string;
  judge_id: string;
  criterion_1_identification: number; // 0-20
  criterion_2_survey: number;         // 0-30
  criterion_3_price: number;          // 0-30
  criterion_4_justification: number;  // 0-20
  total_score: number;                // 0-100
  strengths: string;
  areas_for_improvement: string;
  general_comments: string;
  is_final: boolean;
  evaluated_at: string;
}

export interface IntegrityEvent {
  id: string;
  team_id: string;
  event_type:
    | 'tab_switch'
    | 'window_blur'
    | 'copy_attempt'
    | 'paste_attempt'
    | 'context_menu'
    | 'fullscreen_exit'
    | 'dev_tools_attempt'
    | 'rapid_typing_burst'
    | 'ai_suspect_phrase';
  details?: string;
  recorded_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface TeamScoreSummary {
  team_id: string;
  team_number: number;
  team_name: string;
  assigned_profile_id: number;
  customer_profile_name: string;
  submission_status: SubmissionStatus;
  submitted_at?: string | null;
  evaluations_count: number;
  is_evaluated: boolean;
  criterion_1: number;
  criterion_2: number;
  criterion_3: number;
  criterion_4: number;
  total_score: number;
  ai_penalty_applied: boolean;
  ai_penalty_points: number;
  comments: string[];
  rank?: number;
}

// ─── V2: Google Sheets Integration Types ─────────────────────────────────────

export type GoogleSheetsPermission = 'editor' | 'viewer';

export interface GoogleSheetsRecipient {
  email: string;
  role: 'organiser' | 'judge' | 'faculty';
  permission: GoogleSheetsPermission;
  share_status: 'pending' | 'shared' | 'failed';
  shared_at?: string;
}

export interface GoogleSheetsConfig {
  id: number;
  is_connected: boolean;
  owner_email?: string;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
  spreadsheet_title?: string;
  created_at?: string;
  last_sync_at?: string;
  token_expiry?: string;
  recipients: GoogleSheetsRecipient[];
  updated_at: string;
}

export interface SheetsSyncRecord {
  id: string;
  event_type: 'submission' | 'evaluation' | 'results';
  entity_id: string;
  status: SyncStatus;
  retry_count: number;
  error_details?: string;
  created_at: string;
  attempted_at?: string;
  completed_at?: string;
}

export interface SheetsSyncStats {
  total_synced: number;
  pending: number;
  failed: number;
  last_sync_at?: string;
}

// ─── V2: Display Mode (Projector) Types ──────────────────────────────────────

export interface DisplayStats {
  timer: RoundTimerState;
  teams_online: number;
  teams_total: number;
  submissions_completed: number;
  submissions_working: number;
  submissions_not_started: number;
  overall_progress_pct: number;
  mission_completion: {
    mission_01: number;
    mission_02: number;
    mission_03: number;
    mission_04: number;
  };
}
