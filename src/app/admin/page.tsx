'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuditLog,
  CustomerProfile,
  EvaluationConfig,
  GoogleSheetsConfig,
  GoogleSheetsRecipient,
  IntegrityEvent,
  Judge,
  RoundTimerState,
  SheetsSyncRecord,
  SheetsSyncStats,
  SubmissionRevision,
  Team,
  TeamScoreSummary,
  TeamSubmission,
} from '@/types';
import { useRealtimeTimer } from '@/hooks/use-realtime-timer';
import { SharedTimerDisplay } from '@/components/shared-timer-display';
import { CustomerProfileCard } from '@/components/customer-profile-card';
import { formatIST } from '@/lib/utils';
import {
  Award,
  Users,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Square,
  Lock,
  Unlock,
  Key,
  Shield,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Sliders,
  Settings,
  Scale,
  Activity,
  UserCheck,
  Edit,
  Tag,
  Search,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { timer, displaySeconds, status: timerStatus, refresh: refreshTimer } = useRealtimeTimer();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'teams' | 'profiles' | 'timer' | 'submissions' | 'judges' | 'scoring' | 'results' | 'integrity' | 'sheets'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [evalConfig, setEvalConfig] = useState<EvaluationConfig | null>(null);
  const [revisions, setRevisions] = useState<SubmissionRevision[]>([]);
  const [integrityLogs, setIntegrityLogs] = useState<IntegrityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [scores, setScores] = useState<TeamScoreSummary[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(null);
  const [syncStats, setSyncStats] = useState<SheetsSyncStats | null>(null);
  const [syncQueue, setSyncQueue] = useState<SheetsSyncRecord[]>([]);

  // Modals and action triggers
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Sheets management states
  const [sheetsActionLoading, setSheetsActionLoading] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientRole, setNewRecipientRole] = useState<'organiser' | 'judge' | 'faculty'>('judge');
  const [newRecipientPermission, setNewRecipientPermission] = useState<'editor' | 'viewer'>('viewer');

  // Password reset modal
  const [resetModalUser, setResetModalUser] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Re-open edit modal
  const [editModalTeam, setEditModalTeam] = useState<string | null>(null);
  const [editReasonInput, setEditReasonInput] = useState('');

  // Add judge modal
  const [showAddJudgeModal, setShowAddJudgeModal] = useState(false);
  const [newJudgeId, setNewJudgeId] = useState('');
  const [newJudgeName, setNewJudgeName] = useState('');
  const [newJudgeEmail, setNewJudgeEmail] = useState('');
  const [newJudgePass, setNewJudgePass] = useState('Judge2026!');

  // Timer custom duration
  const [customTimerMinutes, setCustomTimerMinutes] = useState(12);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) {
        router.push('/login?role=admin');
        return;
      }
      setTeams(data.teams || []);
      setProfiles(data.profiles || []);
      setSubmissions(data.submissions || []);
      setJudges(data.judges || []);
      setEvalConfig(data.evalConfig || null);
      setRevisions(data.revisions || []);
      setIntegrityLogs(data.integrity || []);
      setAuditLogs(data.auditLogs || []);
      setScores(data.results || []);
      setSheetsConfig(data.sheetsConfig || null);
      setSyncStats(data.syncStats || null);
      setSyncQueue(data.syncQueue || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 4000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  // Central Timer Controls
  const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'end' | 'reset') => {
    setActionMessage('');
    setActionError('');
    try {
      const res = await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, durationMinutes: customTimerMinutes }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Timer action [${action.toUpperCase()}] executed successfully.`);
        refreshTimer();
        fetchAdminData();
      } else {
        setActionError(data.message || 'Timer operation failed');
      }
    } catch (e) {
      setActionError('Network error');
    }
  };

  // Team Password Reset
  const handleResetPassword = async () => {
    if (!resetModalUser || !newPasswordInput) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          targetId: resetModalUser,
          data: { password: newPasswordInput },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Password reset successfully for ${resetModalUser}.`);
        setResetModalUser(null);
        setNewPasswordInput('');
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Failed to reset password');
    }
  };

  // Grant Organiser-approved edit
  const handleGrantEdit = async () => {
    if (!editModalTeam || !editReasonInput) return;
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_edit',
          teamId: editModalTeam,
          reason: editReasonInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Edit permission granted to ${editModalTeam}. Historical snapshot archived.`);
        setEditModalTeam(null);
        setEditReasonInput('');
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error granting edit');
    }
  };

  // Close / Revoke Edit
  const handleRevokeEdit = async (teamId: string) => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_edit', teamId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Editing locked again for ${teamId}.`);
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error revoking edit');
    }
  };

  // Add Judge
  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_judge',
          data: {
            judge_id: newJudgeId,
            name: newJudgeName,
            email: newJudgeEmail,
            password: newJudgePass,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Judge ${newJudgeName} (${newJudgeId}) added successfully.`);
        setShowAddJudgeModal(false);
        setNewJudgeId('');
        setNewJudgeName('');
        setNewJudgeEmail('');
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error adding judge');
    }
  };

  // Toggle Evaluation Open/Close
  const handleToggleEvaluationOpen = async (isOpen: boolean) => {
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          configData: { is_open: isOpen },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(isOpen ? 'Evaluation window is now OPEN for judges.' : 'Evaluation window LOCKED.');
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error updating evaluation status');
    }
  };

  // Change Scoring Mode
  const handleSetScoringMode = async (mode: 'panel_common' | 'individual_average') => {
    const confirmChange = window.confirm(
      `Confirm switching scoring mode to: ${
        mode === 'panel_common' ? 'Mode A (Common Panel Score)' : 'Mode B (Average of Individual Judges)'
      }? Existing scores are preserved.`
    );
    if (!confirmChange) return;

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          configData: { scoring_mode: mode },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Scoring mode changed to ${mode}.`);
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error changing scoring mode');
    }
  };

  // Toggle Results Publication
  const handleTogglePublishResults = async (publish: boolean) => {
    const conf = window.confirm(
      publish
        ? 'Confirm publishing final scores to participants? This will make rankings visible.'
        : 'Confirm unpublishing results?'
    );
    if (!conf) return;

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_publish', publish }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(publish ? 'Results published successfully!' : 'Results unpublished.');
        fetchAdminData();
      }
    } catch (e) {
      setActionError('Error toggling publication');
    }
  };

  // CSV Export Engine
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSubmissionsCSV = () => {
    const headers = [
      'Team ID',
      'Team Name',
      'Profile ID',
      'Assigned Profile',
      'Status',
      'Submitted At (IST)',
      'Is Auto-Submitted',
      'Q1 Target Customer',
      'Q2 Factor 1',
      'Q2 Factor 2',
      'Q2 Factor 3',
      'Q3 Survey Top Price Range',
      'Q4 Recommended Price (INR)',
      'Q5 Justification',
    ];

    const rows = teams.map((t) => {
      const sub = submissions.find((s) => s.team_id === t.team_id);
      const prof = profiles.find((p) => p.id === t.assigned_profile_id);
      return [
        `"${t.team_id}"`,
        `"${t.team_name}"`,
        t.assigned_profile_id,
        `"${prof?.customer_profile || ''}"`,
        `"${sub?.status || 'not_started'}"`,
        `"${formatIST(sub?.submitted_at)}"`,
        sub?.is_auto_submitted ? 'YES' : 'NO',
        `"${(sub?.q1_target_customer || '').replace(/"/g, '""')}"`,
        `"${(sub?.q2_factor_1 || '').replace(/"/g, '""')}"`,
        `"${(sub?.q2_factor_2 || '').replace(/"/g, '""')}"`,
        `"${(sub?.q2_factor_3 || '').replace(/"/g, '""')}"`,
        `"${(sub?.q3_survey_top_price_range || '').replace(/"/g, '""')}"`,
        sub?.q4_recommended_price ?? '',
        `"${(sub?.q5_price_justification || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `Quantrix_Round1_Submissions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportScoresCSV = () => {
    const headers = [
      'Rank',
      'Team ID',
      'Team Name',
      'Assigned Profile',
      'Status',
      'Customer Identification (20)',
      'Survey Interpretation (30)',
      'Price Recommendation (30)',
      'Justification (20)',
      'Total Score (100)',
      'Evaluated Status',
    ];

    const rows = scores.map((s) => [
      s.rank || '—',
      `"${s.team_id}"`,
      `"${s.team_name}"`,
      `"${s.customer_profile_name}"`,
      `"${s.submission_status}"`,
      s.criterion_1,
      s.criterion_2,
      s.criterion_3,
      s.criterion_4,
      s.total_score,
      s.is_evaluated ? 'Evaluated' : 'Pending',
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `Quantrix_Round1_FinalScores_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Google Sheets Management Actions
  const handleConnectGoogle = async () => {
    try {
      setSheetsActionLoading(true);
      const res = await fetch('/api/google/auth');
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setActionError(data.message || 'Failed to generate Google authorization URL.');
      }
    } catch (e: any) {
      setActionError(e.message || 'Error connecting to Google.');
    } finally {
      setSheetsActionLoading(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    try {
      setSheetsActionLoading(true);
      const res = await fetch('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_spreadsheet' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Spreadsheet created successfully! ID: ${data.spreadsheet_id}`);
        fetchAdminData();
      } else {
        setActionError(data.message || 'Failed to create spreadsheet.');
      }
    } catch (e: any) {
      setActionError(e.message || 'Error creating spreadsheet.');
    } finally {
      setSheetsActionLoading(false);
    }
  };

  const handleTestSheetsConnection = async () => {
    try {
      setSheetsActionLoading(true);
      const res = await fetch('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
      } else {
        setActionError(data.message);
      }
    } catch (e: any) {
      setActionError(e.message || 'Error testing connection.');
    } finally {
      setSheetsActionLoading(false);
    }
  };

  const handleRetryFailedSync = async () => {
    try {
      setSheetsActionLoading(true);
      const res = await fetch('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_sync' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Retried ${data.retried} failed sync records.`);
        fetchAdminData();
      } else {
        setActionError(data.message || 'Failed to retry sync.');
      }
    } catch (e: any) {
      setActionError(e.message || 'Error retrying sync.');
    } finally {
      setSheetsActionLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipientEmail || !newRecipientEmail.includes('@')) {
      setActionError('Valid email is required.');
      return;
    }
    const currentRecipients = sheetsConfig?.recipients || [];
    const updated = [
      ...currentRecipients.filter((r) => r.email !== newRecipientEmail),
      {
        email: newRecipientEmail,
        role: newRecipientRole,
        permission: newRecipientPermission,
        share_status: 'pending' as const,
      },
    ];

    try {
      setSheetsActionLoading(true);
      const res = await fetch('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_recipients',
          recipients: updated,
          trigger_share: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Recipient added and permissions granted.`);
        setNewRecipientEmail('');
        fetchAdminData();
      } else {
        setActionError(data.message || 'Failed to share with recipient.');
      }
    } catch (e: any) {
      setActionError(e.message || 'Error sharing spreadsheet.');
    } finally {
      setSheetsActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login?role=admin');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <span className="font-bold text-sm tracking-wide">Loading Admin Control Centre...</span>
        </div>
      </div>
    );
  }

  // Summary Metrics
  const totalTeams = teams.length;
  const activeTeamsCount = teams.filter((t) => t.login_status === 'online').length;
  const submittedCount = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'revised_and_resubmitted'
  ).length;
  const autoSubmittedCount = submissions.filter((s) => s.status === 'auto_submitted_at_expiry').length;
  const pendingCount = totalTeams - submittedCount - autoSubmittedCount;
  const evaluatedCount = scores.filter((s) => s.is_evaluated).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-white">QUANTRIX ADMIN</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Control Centre
                </span>
              </div>
              <div className="text-xs text-slate-400">
                The Price Is Right? • Round 1: Know Your Customer • TSM Madurai
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400">Clock:</span>
              <span className="font-mono font-bold text-sky-400">
                {timer ? (timer.status === 'running' ? 'LIVE' : timer.status.toUpperCase()) : '—'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-800/60 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Admin Logout</span>
            </button>
          </div>
        </div>

        {/* 10 Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto border-t border-slate-800/60 text-xs font-bold scrollbar-none">
          {[
            { id: 'overview', label: '1. Overview', icon: Activity },
            { id: 'teams', label: '2. Teams', icon: Users },
            { id: 'profiles', label: '3. Profiles', icon: Tag },
            { id: 'timer', label: '4. Event Control', icon: Clock },
            { id: 'submissions', label: '5. Submissions', icon: FileSpreadsheet },
            { id: 'judges', label: '6. Judges', icon: UserCheck },
            { id: 'scoring', label: '7. Scoring Mode', icon: Sliders },
            { id: 'results', label: '8. Results & Exports', icon: Scale },
            { id: 'integrity', label: '9. Security Logs', icon: Shield },
            { id: 'sheets', label: '10. Google Sheets', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Banner feedback messages */}
        {actionMessage && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage('')} className="text-emerald-400 hover:underline">
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-400 hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Total Teams</span>
                <span className="text-2xl font-black text-white">{totalTeams}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Online Now</span>
                <span className="text-2xl font-black text-emerald-400">{activeTeamsCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Submitted</span>
                <span className="text-2xl font-black text-sky-400">{submittedCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Auto-Submitted</span>
                <span className="text-2xl font-black text-amber-400">{autoSubmittedCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Pending</span>
                <span className="text-2xl font-black text-slate-300">{pendingCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Evaluated</span>
                <span className="text-2xl font-black text-teal-400">{evaluatedCount} / {totalTeams}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold uppercase block">Evaluation Mode</span>
                <span className="text-xs font-bold text-indigo-300 block truncate mt-1">
                  {evalConfig?.scoring_mode === 'panel_common' ? 'Panel Common' : 'Judge Average'}
                </span>
              </div>
            </div>

            {/* Live Realtime Timer Widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" />
                  <span>Central Synchronised Event Clock</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authoritative server timer driving all 15 teams and judges interfaces in real time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <SharedTimerDisplay
                    seconds={displaySeconds}
                    status={timerStatus}
                    size="compact"
                  />
                </div>

                <div className="flex gap-2">
                  {timerStatus !== 'running' ? (
                    <button
                      onClick={() => handleTimerAction(timerStatus === 'paused' ? 'resume' : 'start')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{timerStatus === 'paused' ? 'Resume' : 'Start Round'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTimerAction('pause')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleTimerAction('end')}
                    className="px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>End</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Team Status Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Team Participation Matrix</h3>
                  <p className="text-xs text-slate-400">Continuous telemetry of all 15 teams.</p>
                </div>
                <button
                  onClick={fetchAdminData}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Team</th>
                      <th className="p-3">Assigned Profile</th>
                      <th className="p-3">Login Status</th>
                      <th className="p-3">Submission Status</th>
                      <th className="p-3">Submission Timestamp</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {teams.map((t) => {
                      const sub = submissions.find((s) => s.team_id === t.team_id);
                      const prof = profiles.find((p) => p.id === t.assigned_profile_id);
                      return (
                        <tr key={t.team_id} className="hover:bg-slate-850 transition">
                          <td className="p-3 font-bold text-white">
                            {t.team_name}
                            <span className="block text-[10px] font-normal text-slate-500">{t.team_id}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-200 font-semibold">{prof?.customer_profile}</span>
                            <span className="block text-[10px] text-slate-500">Profile #{t.assigned_profile_id}</span>
                          </td>
                          <td className="p-3">
                            {t.login_status === 'online' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                                Offline
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {sub?.status === 'submitted' || sub?.status === 'revised_and_resubmitted' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                                Submitted
                              </span>
                            ) : sub?.status === 'auto_submitted_at_expiry' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                                Auto-Submitted
                              </span>
                            ) : sub?.status === 'revision_in_progress' ? (
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                                Revision Open
                              </span>
                            ) : sub?.status === 'draft_in_progress' ? (
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px]">
                                Draft in progress
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Not started</span>
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-400 font-mono">
                            {formatIST(sub?.submitted_at)}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {sub?.edit_permitted ? (
                                <button
                                  onClick={() => handleRevokeEdit(t.team_id)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                                >
                                  Lock Edits
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditModalTeam(t.team_id);
                                    setEditReasonInput('');
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium border border-slate-700"
                                >
                                  Allow Edit
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setResetModalUser(t.team_id);
                                  setNewPasswordInput('');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] border border-slate-700"
                              >
                                Pass
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: TEAM MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Team Management & Access Credentials</h3>
                <p className="text-xs text-slate-400 mt-1">
                  15 participating teams provisioned. Export protected credentials for distribution.
                </p>
              </div>
              <button
                onClick={() => {
                  const headers = ['Team ID', 'Team Name', 'Default Password', 'Assigned Profile ID'];
                  const rows = teams.map((t) => {
                    const num = t.team_number.toString().padStart(2, '0');
                    return [`"${t.team_id}"`, `"${t.team_name}"`, `"TeamPass@${num}"`, t.assigned_profile_id].join(
                      ','
                    );
                  });
                  downloadCSV([headers.join(','), ...rows].join('\n'), 'Quantrix_Team_Credentials.csv');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export Team Login Credentials (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teams.map((t) => (
                <div key={t.team_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-sky-400">{t.team_id}</span>
                      <h4 className="font-bold text-sm text-white">{t.team_name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                      Profile #{t.assigned_profile_id}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Login State:</span>
                    <span className={t.login_status === 'online' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {t.login_status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const newName = prompt('Enter new team name:', t.team_name);
                        if (newName && newName.trim()) {
                          fetch('/api/admin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_team_name',
                              targetId: t.team_id,
                              data: { name: newName.trim() },
                            }),
                          }).then(() => fetchAdminData());
                        }
                      }}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setResetModalUser(t.team_id);
                        setNewPasswordInput('');
                      }}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs font-medium"
                    >
                      Reset Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CUSTOMER PROFILES */}
        {/* ============================================================== */}
        {activeTab === 'profiles' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-400" />
                <span>15 Pre-configured Customer Profiles & Benchmarks</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Showing all profile parameters. Confidential indicative willingness-to-pay benchmark is shown here for organiser audit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((p) => {
                const assignedTeam = teams.find((t) => t.assigned_profile_id === p.id);
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-400 font-semibold">Assigned: {assignedTeam?.team_name || 'Unassigned'}</span>
                      <button
                        onClick={() => {
                          const newProf = prompt(`Reassign ${assignedTeam?.team_name} to profile (1-15):`, String(p.id));
                          if (newProf && assignedTeam) {
                            fetch('/api/admin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'reassign_profile',
                                targetId: assignedTeam.team_id,
                                data: { profileId: Number(newProf) },
                              }),
                            }).then(() => fetchAdminData());
                          }
                        }}
                        className="text-sky-400 hover:underline text-[11px]"
                      >
                        Reassign
                      </button>
                    </div>
                    <CustomerProfileCard profile={p} showBenchmark={true} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: EVENT & TIMER CONTROL */}
        {/* ============================================================== */}
        {activeTab === 'timer' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-400" />
                  <span>Central Round Timer & State Controls</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  All connected teams lock synchronously when the timer elapses. Actions take immediate effect across all clients.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-6 bg-slate-950 rounded-2xl border border-slate-800">
                <SharedTimerDisplay
                  seconds={displaySeconds}
                  status={timerStatus}
                  size="large"
                />

                <div className="flex flex-col gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Round Duration (Minutes):</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      disabled={timerStatus === 'running'}
                      value={customTimerMinutes}
                      onChange={(e) => setCustomTimerMinutes(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTimerAction('start')}
                      disabled={timerStatus === 'running'}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Round</span>
                    </button>

                    <button
                      onClick={() => handleTimerAction(timerStatus === 'paused' ? 'resume' : 'pause')}
                      disabled={timerStatus === 'not_started' || timerStatus === 'completed'}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Pause className="w-4 h-4" />
                      <span>{timerStatus === 'paused' ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                      onClick={() => handleTimerAction('end')}
                      disabled={timerStatus === 'completed'}
                      className="px-4 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Square className="w-4 h-4" />
                      <span>End Round</span>
                    </button>

                    <button
                      onClick={() => {
                        const confirmReset = window.confirm(
                          'Strict Warning: Are you sure you want to RESET the round timer? This will set timer back to not started.'
                        );
                        if (confirmReset) handleTimerAction('reset');
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Timer</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-white block">Event Synchronization Architecture:</span>
                <p>
                  • Server-authoritative timestamp verification prevents client-side tampering.
                  <br />
                  • Automatic auto-submission triggers immediately when server deadline timestamp passes.
                  <br />
                  • Reconnecting devices immediately query authoritative server time without local drift.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SUBMISSION MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Submitted Answers & Revisions</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Full visibility into all 5 questions, autosaved drafts and organiser-approved revisions.
                </p>
              </div>
              <button
                onClick={exportSubmissionsCSV}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export Submissions (CSV)</span>
              </button>
            </div>

            <div className="space-y-4">
              {teams.map((t) => {
                const sub = submissions.find((s) => s.team_id === t.team_id);
                const prof = profiles.find((p) => p.id === t.assigned_profile_id);
                const teamRevs = revisions.filter((r) => r.team_id === t.team_id);

                return (
                  <div key={t.team_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{t.team_name}</span>
                          <span className="text-xs text-slate-400 font-mono">({t.team_id})</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-sky-300">
                            {prof?.customer_profile}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Status: <strong className="text-slate-200">{sub?.status || 'not_started'}</strong> • Submitted: {formatIST(sub?.submitted_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub?.edit_permitted ? (
                          <button
                            onClick={() => handleRevokeEdit(t.team_id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded"
                          >
                            Lock Edits
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditModalTeam(t.team_id);
                              setEditReasonInput('');
                            }}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700"
                          >
                            Approve Revision
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 5 Questions View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                          Q1: Target Customer
                        </span>
                        <p className="text-slate-200">{sub?.q1_target_customer || <span className="text-slate-600 italic">None</span>}</p>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                          Q2: Top 3 Influencing Factors
                        </span>
                        <p className="text-slate-200">
                          1. {sub?.q2_factor_1 || '—'} | 2. {sub?.q2_factor_2 || '—'} | 3. {sub?.q2_factor_3 || '—'}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                          Q3: Highest Survey Price Range
                        </span>
                        <p className="text-slate-200">{sub?.q3_survey_top_price_range || <span className="text-slate-600 italic">None</span>}</p>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                          Q4: Recommended Price (INR)
                        </span>
                        <p className="text-sky-400 font-bold text-sm">
                          {sub?.q4_recommended_price ? `₹${sub.q4_recommended_price}` : <span className="text-slate-600 italic">None</span>}
                        </p>
                      </div>

                      <div className="md:col-span-2 p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                          Q5: Price Justification
                        </span>
                        <p className="text-slate-200 leading-relaxed">{sub?.q5_price_justification || <span className="text-slate-600 italic">None</span>}</p>
                      </div>
                    </div>

                    {/* Historical Revisions Log if any */}
                    {teamRevs.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-[11px] font-bold text-purple-400 block mb-1">
                          Revision History ({teamRevs.length} version{teamRevs.length > 1 ? 's' : ''}):
                        </span>
                        <div className="space-y-1">
                          {teamRevs.map((rev) => (
                            <div key={rev.id} className="p-2 bg-slate-950 rounded text-[11px] text-slate-400 flex items-center justify-between">
                              <span>
                                Version {rev.revision_number} • Approved by: {rev.approved_by} • Reason: {rev.reason}
                              </span>
                              <span className="font-mono text-slate-500">{formatIST(rev.recorded_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: JUDGE MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'judges' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Judging Panel Management</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure judge accounts, assign the Lead Judge, and enable or disable access.
                </p>
              </div>
              <button
                onClick={() => setShowAddJudgeModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <UserCheck className="w-4 h-4" />
                <span>Add Additional Judge</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {judges.map((j) => (
                <div key={j.judge_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{j.name}</span>
                        {j.is_lead && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                            LEAD JUDGE
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400 block mt-0.5">{j.judge_id}</span>
                      <span className="text-xs text-slate-500">{j.email || 'No email specified'}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        j.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {j.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {!j.is_lead && (
                      <button
                        onClick={() => {
                          fetch('/api/admin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'set_lead_judge', targetId: j.judge_id }),
                          }).then(() => fetchAdminData());
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-medium"
                      >
                        Make Lead
                      </button>
                    )}

                    <button
                      onClick={() => {
                        fetch('/api/admin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'toggle_active',
                            targetId: j.judge_id,
                            data: { active: !j.is_active },
                          }),
                        }).then(() => fetchAdminData());
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
                    >
                      {j.is_active ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      onClick={() => {
                        setResetModalUser(j.judge_id);
                        setNewPasswordInput('');
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs font-medium"
                    >
                      Reset Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: SCORING CONFIGURATION & DELAYED JUDGING */}
        {/* ============================================================== */}
        {activeTab === 'scoring' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-teal-400" />
                  <span>Evaluation Window & Scoring Mode Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Control when judges can evaluate and how multiple judge scores are aggregated.
                </p>
              </div>

              {/* Evaluation Access Control */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Judge Evaluation Window Access:</span>
                    {evalConfig?.is_open ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                        OPEN FOR SCORING
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30">
                        EVALUATION LOCKED – AWAITING ADMIN ACTIVATION
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Default is locked. Can be opened 3–5 days after event completion.
                  </p>
                </div>

                <div className="flex gap-2">
                  {evalConfig?.is_open ? (
                    <button
                      onClick={() => handleToggleEvaluationOpen(false)}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Lock Evaluation Access
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleEvaluationOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Activate Judge Evaluation Window
                    </button>
                  )}
                </div>
              </div>

              {/* Scoring Mode Selection */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Scoring Methodology:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode A */}
                  <div
                    onClick={() => handleSetScoringMode('panel_common')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      evalConfig?.scoring_mode === 'panel_common'
                        ? 'bg-teal-500/10 border-teal-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">Mode A: Common Panel Score (Default)</span>
                      {evalConfig?.scoring_mode === 'panel_common' && (
                        <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 font-bold text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      The judging panel convenes, deliberates, and agrees on one consensus score per team. The lead judge enters the final verified score.
                    </p>
                  </div>

                  {/* Mode B */}
                  <div
                    onClick={() => handleSetScoringMode('individual_average')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      evalConfig?.scoring_mode === 'individual_average'
                        ? 'bg-teal-500/10 border-teal-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">Mode B: Average of Individual Judges</span>
                      {evalConfig?.scoring_mode === 'individual_average' && (
                        <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 font-bold text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Every judge independently scores each team. The system computes the arithmetic average to two decimal places. Teams with pending judges are marked as pending.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rubric Reference */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-white block">Official 100-Mark Rubric Breakdown:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                  <div className="bg-slate-900 p-2 rounded">1. Customer Identification: <strong>20 Marks</strong></div>
                  <div className="bg-slate-900 p-2 rounded">2. Survey Interpretation: <strong>30 Marks</strong></div>
                  <div className="bg-slate-900 p-2 rounded">3. Price Recommendation: <strong>30 Marks</strong></div>
                  <div className="bg-slate-900 p-2 rounded">4. Quality of Justification: <strong>20 Marks</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: RESULTS & PUBLICATION */}
        {/* ============================================================== */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Final Evaluation Scores & Rankings</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scores remain completely private to organisers and judges until explicitly published.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportScoresCSV}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Scores (CSV)</span>
                </button>

                {evalConfig?.results_published ? (
                  <button
                    onClick={() => handleTogglePublishResults(false)}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold"
                  >
                    Unpublish Results
                  </button>
                ) : (
                  <button
                    onClick={() => handleTogglePublishResults(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Official Results</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Team</th>
                      <th className="p-3">Customer Profile</th>
                      <th className="p-3">Cust Id (20)</th>
                      <th className="p-3">Survey (30)</th>
                      <th className="p-3">Price (30)</th>
                      <th className="p-3">Justif (20)</th>
                      <th className="p-3 font-bold text-white">Total (100)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {scores.map((s) => (
                      <tr key={s.team_id} className="hover:bg-slate-850 transition">
                        <td className="p-3 font-bold text-sky-400">
                          {s.rank ? (
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-black">
                              #{s.rank}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">
                          {s.team_name}
                          <span className="block text-[10px] font-normal text-slate-500">{s.team_id}</span>
                        </td>
                        <td className="p-3 text-slate-300 font-medium">{s.customer_profile_name}</td>
                        <td className="p-3">{s.criterion_1}</td>
                        <td className="p-3">{s.criterion_2}</td>
                        <td className="p-3">{s.criterion_3}</td>
                        <td className="p-3">{s.criterion_4}</td>
                        <td className="p-3 font-black text-white text-sm">{s.total_score}</td>
                        <td className="p-3">
                          {s.is_evaluated ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              Evaluated
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 9: INTEGRITY & AUDIT LOGS */}
        {/* ============================================================== */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            {/* Anti-AI & Proctoring Summary Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Live Proctoring & Anti-AI Intelligence Center</h3>
                    <p className="text-xs text-slate-400">
                      Real-time assessment telemetry tracking clipboard violations, window blurs, rapid typing bursts, and AI-generated text markers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Telemetry Active
                  </span>
                </div>
              </div>

              {/* Event Metrics Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                {[
                  { label: 'AI Suspect Text', count: integrityLogs.filter(l => l.event_type === 'ai_suspect_phrase').length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
                  { label: 'Tab Switches', count: integrityLogs.filter(l => l.event_type === 'tab_switch').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
                  { label: 'Window Blurs', count: integrityLogs.filter(l => l.event_type === 'window_blur').length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
                  { label: 'Paste Blocks', count: integrityLogs.filter(l => l.event_type === 'paste_attempt').length, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
                  { label: 'Copy Blocks', count: integrityLogs.filter(l => l.event_type === 'copy_attempt').length, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
                  { label: 'DevTools Keys', count: integrityLogs.filter(l => l.event_type === 'dev_tools_attempt').length, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
                  { label: 'Rapid Bursts', count: integrityLogs.filter(l => l.event_type === 'rapid_typing_burst').length, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${item.bg}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">{item.label}</span>
                    <div className={`text-xl font-black font-mono mt-1 ${item.color}`}>{item.count}</div>
                  </div>
                ))}
              </div>

              {/* High Risk Teams Callout */}
              {(() => {
                const aiFlags = integrityLogs.filter(l => l.event_type === 'ai_suspect_phrase');
                const highRiskTeams = Array.from(new Set(aiFlags.map(l => l.team_id)));
                if (highRiskTeams.length === 0) return null;

                return (
                  <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Attention: {highRiskTeams.length} Team(s) flagged with AI-Generated Heuristic Matches
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {highRiskTeams.map(tid => {
                        const count = aiFlags.filter(l => l.team_id === tid).length;
                        return (
                          <div key={tid} className="flex items-center gap-2 bg-rose-900/60 border border-rose-700 px-3 py-1.5 rounded-lg">
                            <span className="text-rose-200 text-xs font-mono font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Team {tid} ({count} hit{count > 1 ? 's' : ''} • -25 pts penalty active)
                            </span>
                            <button
                              onClick={async () => {
                                if (confirm(`Reset and forgive AI negative score penalty for Team ${tid}?`)) {
                                  await fetch('/api/admin', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'reset_ai_penalty', targetId: tid }),
                                  });
                                  fetchAdminData();
                                }
                              }}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                            >
                              Reset Penalty
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Integrity Telemetry */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Assessment Integrity Telemetry</h3>
                  </div>
                  <span className="text-xs text-slate-400">{integrityLogs.length} events logged</span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {integrityLogs.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">No integrity flags recorded.</div>
                  ) : (
                    integrityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 uppercase text-[10px]">
                            {log.event_type} • {log.team_id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{formatIST(log.recorded_at)}</span>
                        </div>
                        <p className="text-slate-300 mt-1">{log.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Audit Trail */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">Administrator Audit Trail</h3>
                  </div>
                  <span className="text-xs text-slate-400">{auditLogs.length} actions logged</span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {auditLogs.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">No audit entries yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-400 uppercase text-[10px]">
                            {log.action} by {log.actor_id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{formatIST(log.created_at)}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Target: {log.target_type} ({log.target_id})
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: GOOGLE SHEETS INTEGRATION */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  <span>Google Sheets Integration Control</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Synchronised event record and reporting system powered by official Google Sheets & Drive API.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={sheetsActionLoading}
                  onClick={handleTestSheetsConnection}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sheetsActionLoading ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>

                <button
                  disabled={sheetsActionLoading || !syncStats?.failed}
                  onClick={handleRetryFailedSync}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Failed ({syncStats?.failed || 0})
                </button>
              </div>
            </div>

            {/* Status Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Google Account</span>
                <div className="mt-2 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${sheetsConfig?.is_connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-sm font-bold text-white">
                    {sheetsConfig?.is_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {sheetsConfig?.owner_email || 'No account linked'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Connected Sheet</span>
                <div className="mt-2 text-sm font-bold text-white truncate">
                  {sheetsConfig?.spreadsheet_title || 'Not Created Yet'}
                </div>
                {sheetsConfig?.spreadsheet_url && (
                  <a
                    href={sheetsConfig.spreadsheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline mt-1 block truncate"
                  >
                    Open in Google Sheets ↗
                  </a>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Synced Submissions</span>
                <div className="mt-2 text-2xl font-black text-emerald-400">
                  {syncStats?.total_synced || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Last sync: {sheetsConfig?.last_sync_at ? formatIST(sheetsConfig.last_sync_at) : 'Never'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Queue Health</span>
                <div className="mt-2 flex items-center gap-3">
                  <div>
                    <span className="text-xs text-slate-400">Pending:</span>{' '}
                    <span className="text-sm font-bold text-amber-400">{syncStats?.pending || 0}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Failed:</span>{' '}
                    <span className="text-sm font-bold text-rose-400">{syncStats?.failed || 0}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Automatic 3x backoff retry</p>
              </div>
            </div>

            {/* Actions & Configuration Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Setup & Actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Spreadsheet Provisioning & Connect
                </h3>

                <div className="space-y-3">
                  {!sheetsConfig?.is_connected ? (
                    <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-3">
                      <p className="text-xs text-sky-200">
                        Step 1: Authenticate with the Lead Organiser Google account via OAuth2 to own the spreadsheet.
                      </p>
                      <button
                        onClick={handleConnectGoogle}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        Connect Organiser Google Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!sheetsConfig.spreadsheet_id ? (
                        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                          <p className="text-xs text-emerald-200">
                            Step 2: Create the official event spreadsheet with all 4 formatted tabs.
                          </p>
                          <button
                            onClick={handleCreateSpreadsheet}
                            disabled={sheetsActionLoading}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
                          >
                            Create Event Spreadsheet Now
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="text-xs text-slate-400">Spreadsheet ID:</div>
                          <div className="font-mono text-xs text-emerald-400 break-all">{sheetsConfig.spreadsheet_id}</div>
                          <div className="pt-2 flex gap-2">
                            <a
                              href={sheetsConfig.spreadsheet_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                            >
                              Open Sheet ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipient Sharing */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Add Authorized Share Recipient
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      placeholder="user@tsm.ac.in"
                      className="sm:col-span-1.5 p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                    <select
                      value={newRecipientRole}
                      onChange={(e: any) => setNewRecipientRole(e.target.value)}
                      className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="judge">Judge</option>
                      <option value="faculty">Faculty Coordinator</option>
                      <option value="organiser">Co-Organiser</option>
                    </select>
                    <select
                      value={newRecipientPermission}
                      onChange={(e: any) => setNewRecipientPermission(e.target.value)}
                      className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddRecipient}
                    disabled={sheetsActionLoading || !sheetsConfig?.spreadsheet_id}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                  >
                    Share Spreadsheet
                  </button>
                </div>
              </div>

              {/* Right: Sync Queue Telemetry */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Synchronisation Events</h3>
                  <span className="text-xs text-slate-400">{syncQueue.length} items</span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {syncQueue.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">No sync events queued yet.</div>
                  ) : (
                    syncQueue.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase text-[10px]">
                            {item.event_type} • {item.entity_id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'success'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'failed'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between font-mono">
                          <span>Created: {formatIST(item.created_at)}</span>
                          <span>Retries: {item.retry_count}</span>
                        </div>
                        {item.error_details && (
                          <p className="text-rose-400 text-[11px] mt-1 bg-rose-950/20 p-1.5 rounded">
                            {item.error_details}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              <span>Reset Password for {resetModalUser}</span>
            </h4>
            <div>
              <label className="block text-xs text-slate-400 mb-1">New Password</label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResetModalUser(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPasswordInput}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-bold"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-open Edit Modal */}
      {editModalTeam && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Grant Revision Permission: {editModalTeam}</span>
            </h4>
            <p className="text-xs text-slate-400">
              The team&apos;s current response will be archived in the revision history before opening.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Authorisation Reason (Mandatory):</label>
              <textarea
                rows={3}
                value={editReasonInput}
                onChange={(e) => setEditReasonInput(e.target.value)}
                placeholder="e.g. Technical network glitch reported during round submission..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModalTeam(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantEdit}
                disabled={!editReasonInput.trim()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-bold"
              >
                Approve & Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Judge Modal */}
      {showAddJudgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddJudge}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Add Judge to Evaluation Panel</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Judge ID (Username)</label>
                <input
                  type="text"
                  required
                  value={newJudgeId}
                  onChange={(e) => setNewJudgeId(e.target.value)}
                  placeholder="e.g. judge_02"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  value={newJudgeName}
                  onChange={(e) => setNewJudgeName(e.target.value)}
                  placeholder="e.g. Prof. S. Karthik"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newJudgeEmail}
                  onChange={(e) => setNewJudgeEmail(e.target.value)}
                  placeholder="karthik@tsm.ac.in"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newJudgePass}
                  onChange={(e) => setNewJudgePass(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddJudgeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold"
              >
                Add Judge
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
