'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomerProfile, Team, TeamSubmission, MissionId } from '@/types';
import { useRealtimeTimer } from '@/hooks/use-realtime-timer';
import { SharedTimerDisplay } from '@/components/shared-timer-display';
import { CustomerProfileCard } from '@/components/customer-profile-card';
import { SurveyChartsSection } from '@/components/survey-charts-section';
import { SURVEY_DROPDOWN_OPTIONS } from '@/lib/data';
import {
  Compass,
  CheckCircle2,
  Lock,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  DollarSign,
  FileText,
  AlertTriangle,
  LogOut,
  Send,
  HelpCircle,
  Eye,
  BarChart3,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function TeamMissionPage() {
  const { timer, displaySeconds, status: timerStatus, isExpired } = useRealtimeTimer();

  const [team, setTeam] = useState<Team | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [submission, setSubmission] = useState<TeamSubmission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Fields
  const [q1, setQ1] = useState<string>('');
  const [q2f1, setQ2f1] = useState<string>('');
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [lastCharCount, setLastCharCount] = useState<number>(0);
  const [q2f2, setQ2f2] = useState<string>('');
  const [q2f3, setQ2f3] = useState<string>('');
  const [q3, setQ3] = useState<string>('');
  const [q4, setQ4] = useState<string>('');
  const [q5, setQ5] = useState<string>('');

  // Active mission tab navigation (can move freely)
  const [activeMission, setActiveMission] = useState<MissionId>('mission_01');
  const [honorDeclared, setHonorDeclared] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessModal, setSubmitSuccessModal] = useState<boolean>(false);
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Team Data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions');
      if (res.status === 401) {
        window.location.href = '/login?role=team';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
        setProfile(data.profile);
        if (data.submission) {
          setSubmission(data.submission);
          setQ1(data.submission.q1_target_customer || '');
          setQ2f1(data.submission.q2_factor_1 || '');
          setQ2f2(data.submission.q2_factor_2 || '');
          setQ2f3(data.submission.q2_factor_3 || '');
          setQ3(data.submission.q3_survey_top_price_range || '');
          setQ4(data.submission.q4_recommended_price?.toString() || '');
          setQ5(data.submission.q5_price_justification || '');
        }
      }
    } catch (e) {
      console.error('Failed to load team data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Autosave triggers
  const triggerAutoSave = useCallback((updatedAnswers: any) => {
    if (submission && (submission.status === 'submitted' || submission.status === 'auto_submitted_at_expiry') && !submission.edit_permitted) {
      return;
    }

    setAutoSaveStatus('Saving...');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'autosave',
            answers: updatedAnswers,
          }),
        });
        const data = await res.json();
        if (data.success && data.submission) {
          setSubmission(data.submission);
          setAutoSaveStatus('Saved');
        } else {
          setAutoSaveStatus('Save Error');
        }
      } catch (e) {
        setAutoSaveStatus('Save Error');
      }
    }, 1000);
  }, [submission]);

  // Handle Input Changes with Autosave
  const handleAnswerChange = (field: string, val: string) => {
    const updated = {
      q1_target_customer: field === 'q1' ? val : q1,
      q2_factor_1: field === 'q2f1' ? val : q2f1,
      q2_factor_2: field === 'q2f2' ? val : q2f2,
      q2_factor_3: field === 'q2f3' ? val : q2f3,
      q3_survey_top_price_range: field === 'q3' ? val : q3,
      q4_recommended_price: field === 'q4' ? (val === '' ? null : Number(val)) : (q4 === '' ? null : Number(q4)),
      q5_price_justification: field === 'q5' ? val : q5,
    };

    if (field === 'q1') setQ1(val);
    if (field === 'q2f1') setQ2f1(val);
    if (field === 'q2f2') setQ2f2(val);
    if (field === 'q2f3') setQ2f3(val);
    if (field === 'q3') setQ3(val);
    if (field === 'q4') setQ4(val);
    if (field === 'q5') setQ5(val);

    triggerAutoSave(updated);

    // Typing velocity monitor for Q1 and Q5 (rapid burst = likely paste bypass)
    if (field === 'q1' || field === 'q5') {
      const now = Date.now();
      if (!typingStartTime) {
        setTypingStartTime(now);
        setLastCharCount(val.length);
      } else {
        const elapsed = (now - typingStartTime) / 1000; // seconds
        const deltaChars = val.length - lastCharCount;
        setLastCharCount(val.length);
        // If > 150 chars appear in < 2 seconds (paste velocity), flag it
        if (elapsed < 2 && deltaChars > 150) {
          fetch('/api/integrity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'rapid_typing_burst',
              details: `Rapid text burst detected in ${field.toUpperCase()}: +${deltaChars} chars in ${elapsed.toFixed(1)}s — possible paste bypass`,
            }),
          }).catch(() => {});
          setTypingStartTime(null);
          setLastCharCount(0);
        }
      }
    }
  };

  // Anti-Cheat & Anti-AI Telemetry Guards
  useEffect(() => {
    // 1. Tab Switching & Window Blur Monitor
    const handleVisibilityChange = () => {
      if (document.hidden) {
        fetch('/api/integrity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'tab_switch',
            details: 'Tab switch detected: Participant navigated away from competition screen',
          }),
        }).catch(() => {});
      }
    };

    const handleWindowBlur = () => {
      fetch('/api/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'window_blur',
          details: 'Focus lost: Window/application blurred (potential external browser/AI prompt tool)',
        }),
      }).catch(() => {});
    };

    // 2. Prevent Copy & Context Menu
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      fetch('/api/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'copy_attempt',
          details: 'Copy blocked: Attempted to extract text or question data',
        }),
      }).catch(() => {});
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      fetch('/api/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'context_menu',
          details: 'Right-click context menu blocked',
        }),
      }).catch(() => {});
    };

    // 3. Block devtools shortcut (F12, Ctrl+Shift+I, Ctrl+Shift+J)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
      ) {
        e.preventDefault();
        fetch('/api/integrity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'dev_tools_attempt',
            details: `Developer tools shortcut intercepted: ${e.key}`,
          }),
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Final Submit Handler
  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!honorDeclared || confirmationInput.trim().toUpperCase() !== 'I CONFIRM') {
      setErrorMessage('You must check the honour declaration and type "I CONFIRM" before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const data = await res.json();
      if (data.success && data.submission) {
        setSubmission(data.submission);
        setConfirmationCode(`QX-R1-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
        setSubmitSuccessModal(true);
      } else {
        setErrorMessage(data.message || 'Submission failed. Please check all questions.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    window.location.href = '/login?role=team';
  };

  // Word count helpers
  const getWordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const q1Words = getWordCount(q1);
  const q5Words = getWordCount(q5);

  // Mission Completion Logic
  const m1Complete = !!(q1Words >= 15 && q2f1.trim() && q2f2.trim() && q2f3.trim());
  const m2Complete = !!q3.trim();
  const m3Complete = !!(q4.trim() && Number(q4) > 0);
  const m4Complete = !!(q5Words >= 25);

  const completedCount = [m1Complete, m2Complete, m3Complete, m4Complete].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const isLocked = (submission?.status === 'submitted' || submission?.status === 'auto_submitted_at_expiry') && !submission?.edit_permitted;
  const isTrial = team?.team_id === 'trial' || (team?.team_id?.startsWith('demo_') ?? false);
  const isWaitingForTimer = timerStatus === 'not_started' && !isTrial;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Entering Market Intelligence Mission...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {team?.team_name || 'Team'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  Profile #{profile?.id}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Market Intelligence Mission
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className={`w-2 h-2 rounded-full ${autoSaveStatus === 'Saved' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              {autoSaveStatus}
            </div>

            <SharedTimerDisplay seconds={displaySeconds} status={timerStatus} size="compact" showStatusBadge={false} />

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mission Progress HUD - Only show when round has officially begun */}
      {!isWaitingForTimer && (
        <section className="bg-slate-900 border-b border-slate-800 px-4 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Mission Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              <button
                onClick={() => setActiveMission('mission_01')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeMission === 'mission_01'
                    ? 'bg-teal-500/10 border-teal-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="truncate">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mission 01</div>
                  <div className="text-xs font-bold text-slate-200 truncate">Decode Customer</div>
                </div>
                {m1Complete ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 ml-2" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0 ml-2" />
                )}
              </button>

              <button
                onClick={() => setActiveMission('mission_02')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeMission === 'mission_02'
                    ? 'bg-sky-500/10 border-sky-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="truncate">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mission 02</div>
                  <div className="text-xs font-bold text-slate-200 truncate">Read Market</div>
                </div>
                {m2Complete ? (
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 ml-2" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0 ml-2" />
                )}
              </button>

              <button
                onClick={() => setActiveMission('mission_03')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeMission === 'mission_03'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="truncate">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mission 03</div>
                  <div className="text-xs font-bold text-slate-200 truncate">Set Your Price</div>
                </div>
                {m3Complete ? (
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0 ml-2" />
                )}
              </button>

              <button
                onClick={() => setActiveMission('mission_04')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  activeMission === 'mission_04'
                    ? 'bg-purple-500/10 border-purple-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="truncate">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mission 04</div>
                  <div className="text-xs font-bold text-slate-200 truncate">Defend Decision</div>
                </div>
                {m4Complete ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 ml-2" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0 ml-2" />
                )}
              </button>
            </div>

            {/* Badges Earned Ribbon */}
            <div className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">Badges:</span>
              <div className="flex items-center gap-1.5">
                <span
                  title="Customer Detective (Mission 1 Complete)"
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    m1Complete
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-900 text-slate-600 border-slate-800 opacity-40'
                  }`}
                >
                  Detective
                </span>
                <span
                  title="Data Decoder (Mission 2 Complete)"
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    m2Complete
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                      : 'bg-slate-900 text-slate-600 border-slate-800 opacity-40'
                  }`}
                >
                  Decoder
                </span>
                <span
                  title="Pricing Strategist (Mission 3 Complete)"
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    m3Complete
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-900 text-slate-600 border-slate-800 opacity-40'
                  }`}
                >
                  Strategist
                </span>
                <span
                  title="Business Thinker (Mission 4 Complete)"
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    m4Complete
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                      : 'bg-slate-900 text-slate-600 border-slate-800 opacity-40'
                  }`}
                >
                  Thinker
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Mission Workspace */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 w-full flex-1 space-y-8 select-none">
        {/* Anti-Cheat Active Security HUD Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white">Active Proctoring Protocol:</span>
            <span className="text-slate-400">External tabs, clipboard copy/paste, and AI assistants are strictly prohibited & telemetred.</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            SECURE EXAM CONTEXT ACTIVE
          </span>
        </div>

        {/* When Round Has Not Started: Completely Hide All Data, Profiles, Charts & Questions */}
        {isWaitingForTimer ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-16 text-center space-y-6 shadow-2xl">
            <div className="inline-flex p-6 rounded-3xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Lock className="w-16 h-16 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                Synchronised Event Lockdown
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
                ROUND 1 HAS NOT STARTED YET
              </h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed pt-2">
                All competition datasets, customer profiles, market survey charts, and question missions are strictly sealed until the administrator officially begins the synchronised clock.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 inline-block text-left shadow-inner">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Live System Status
                  </div>
                  <div className="text-sm font-mono font-bold text-amber-400">
                    STANDBY • WAITING FOR HOST TO START TIMER
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 max-w-md mx-auto">
              ⏱️ Please keep this tab open and await instructions from the event coordinators. Your entire case dossier will unlock in real time.
            </div>
          </div>
        ) : (
          <>
            {/* Top Section: Assigned Customer Profile & Mission Action Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Customer Profile Dossier */}
              <div className="lg:col-span-5 space-y-4">
                {profile && <CustomerProfileCard profile={profile} showBenchmark={false} />}
              </div>

              {/* Mission Action Card */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  {/* Status locked banner if submitted */}
                  {isLocked && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-start gap-3">
                      <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-sm">Mission Locked & Submitted</h4>
                        <p className="text-xs text-amber-400/80 mt-1">
                          Your answers are officially locked in Supabase and queued for evaluation. If you require modifications due to a technical error, request edit approval from the Admin Control Centre.
                        </p>
                      </div>
                    </div>
                  )}

            {/* MISSION 01: Decode the Customer */}
            {activeMission === 'mission_01' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Mission 01</span>
                  <h3 className="text-xl font-black text-white mt-1">Decode the Customer</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Identify your assigned customer profile and isolate the 3 key purchasing factors.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Q1: Identify the Target Customer
                      </label>
                      <span className={`text-[11px] font-mono ${q1Words >= 15 ? 'text-teal-400' : 'text-amber-400'}`}>
                        {q1Words} / 15 words min
                      </span>
                    </div>
                    <textarea
                      disabled={isLocked}
                      value={q1}
                      onPaste={(e) => {
                        e.preventDefault();
                        fetch('/api/integrity', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            event_type: 'paste_attempt',
                            details: 'Paste blocked in Q1 (External text insertion prevented)',
                          }),
                        }).catch(() => {});
                      }}
                      onChange={(e) => handleAnswerChange('q1', e.target.value)}
                      placeholder="Describe who your customer is, their context, daily needs, and budget tier..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Q2: Three Key Influencing Purchase Factors
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        disabled={isLocked}
                        value={q2f1}
                        onChange={(e) => handleAnswerChange('q2f1', e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          fetch('/api/integrity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              event_type: 'paste_attempt',
                              details: 'Paste blocked in Q2 Factor 1 input',
                            }),
                          }).catch(() => {});
                        }}
                        placeholder="Factor 1 (e.g. Price)"
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
                      />
                      <input
                        disabled={isLocked}
                        value={q2f2}
                        onChange={(e) => handleAnswerChange('q2f2', e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          fetch('/api/integrity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              event_type: 'paste_attempt',
                              details: 'Paste blocked in Q2 Factor 2 input',
                            }),
                          }).catch(() => {});
                        }}
                        placeholder="Factor 2 (e.g. Quality)"
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
                      />
                      <input
                        disabled={isLocked}
                        value={q2f3}
                        onChange={(e) => handleAnswerChange('q2f3', e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          fetch('/api/integrity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              event_type: 'paste_attempt',
                              details: 'Paste blocked in Q2 Factor 3 input',
                            }),
                          }).catch(() => {});
                        }}
                        placeholder="Factor 3 (e.g. Design)"
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setActiveMission('mission_02')}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Proceed to Mission 02 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* MISSION 02: Read the Market */}
            {activeMission === 'mission_02' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Mission 02</span>
                  <h3 className="text-xl font-black text-white mt-1">Read the Market</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Analyse the market willingness-to-pay survey and identify the largest customer concentration range.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Q3: In the survey, which price range had the largest number of customers?
                    </label>
                    <select
                      disabled={isLocked}
                      value={q3}
                      onChange={(e) => handleAnswerChange('q3', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition disabled:opacity-50"
                    >
                      <option value="">-- Select Price Range from Survey --</option>
                      {SURVEY_DROPDOWN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Cross-reference with the survey chart on the left panel before locking your answer.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setActiveMission('mission_01')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Back to Mission 01
                  </button>
                  <button
                    onClick={() => setActiveMission('mission_03')}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Proceed to Mission 03 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* MISSION 03: Set Your Price */}
            {activeMission === 'mission_03' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Mission 03</span>
                  <h3 className="text-xl font-black text-white mt-1">Set Your Price</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Determine an exact, single recommended selling price in INR tailored specifically for your customer.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Q4: Recommended Price for this Customer Profile (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-lg font-bold text-amber-400">₹</span>
                      <input
                        type="number"
                        disabled={isLocked}
                        value={q4}
                        onChange={(e) => handleAnswerChange('q4', e.target.value)}
                        placeholder="e.g. 275"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-lg font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Enter a single numeric rupee value (e.g., 249 or 299). Ranges will not be accepted.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setActiveMission('mission_02')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Back to Mission 02
                  </button>
                  <button
                    onClick={() => setActiveMission('mission_04')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Proceed to Mission 04 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* MISSION 04: Defend Your Decision */}
            {activeMission === 'mission_04' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Mission 04</span>
                  <h3 className="text-xl font-black text-white mt-1">Defend Your Decision</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Justify your pricing recommendation using customer profile context and survey data.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Q5: Business Justification & Analytical Reasoning
                      </label>
                      <span className={`text-[11px] font-mono ${q5Words >= 25 ? 'text-teal-400' : 'text-amber-400'}`}>
                        {q5Words} / 25 words min
                      </span>
                    </div>
                    <textarea
                      disabled={isLocked}
                      value={q5}
                      onPaste={(e) => {
                        e.preventDefault();
                        fetch('/api/integrity', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            event_type: 'paste_attempt',
                            details: 'Paste blocked in Q5 Justification (External AI text insertion prevented)',
                          }),
                        }).catch(() => {});
                      }}
                      onChange={(e) => handleAnswerChange('q5', e.target.value)}
                      placeholder="Defend why this price matches your customer's income context, willingness to pay, and product features..."
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setActiveMission('mission_03')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold tracking-wider transition"
                  >
                    Back to Mission 03
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submission Finalize Block */}
          {!isLocked && !isWaitingForTimer && (
            <div className="mt-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                Mission Finalization & Lock-In
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Verify all four missions before locking your submission. Once submitted, answers cannot be edited without administrator intervention.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="honor"
                  checked={honorDeclared}
                  onChange={(e) => setHonorDeclared(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="honor" className="text-xs text-slate-300 font-medium cursor-pointer">
                  I declare on my honour that all answers are generated independently without prohibited external aid or AI assistants.
                </label>
              </div>

              <div className="mb-5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Type <span className="text-teal-400 font-mono font-bold">I CONFIRM</span> below to enable submission lock:
                </label>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="I CONFIRM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              <button
                disabled={isSubmitting || !honorDeclared || confirmationInput.trim().toUpperCase() !== 'I CONFIRM' || completedCount < 4}
                onClick={handleSubmit}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Submitting Mission Dossier...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Lock & Submit Final Mission Answers ({completedCount}/4 Ready)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        </div>

            {/* Dedicated Full-Width Market Analytics Space for Uncompromised Readability */}
            <div className="pt-2">
              <SurveyChartsSection />
            </div>
          </>
        )}
      </main>

      {/* Confirmation Modal */}
      {submitSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Mission Complete!</h3>
            <p className="text-xs text-slate-400 mt-2">
              Your mission submission has been permanently recorded in the primary database and queued for the judging panel.
            </p>

            <div className="my-6 p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Official Confirmation Code</span>
              <div className="font-mono text-lg font-bold text-teal-400 mt-1">{confirmationCode}</div>
            </div>

            <button
              onClick={() => setSubmitSuccessModal(false)}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              Return to Mission Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
