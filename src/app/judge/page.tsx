'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CustomerProfile,
  EvaluationConfig,
  Judge,
  JudgeEvaluation,
  Team,
  TeamSubmission,
} from '@/types';
import { CustomerProfileCard } from '@/components/customer-profile-card';
import { SurveyChartsSection } from '@/components/survey-charts-section';
import { formatIST } from '@/lib/utils';
import {
  Award,
  CheckCircle,
  Clock,
  Lock,
  LogOut,
  Save,
  Scale,
  Send,
  UserCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  Tag,
  RefreshCw,
} from 'lucide-react';

export default function JudgeDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentJudge, setCurrentJudge] = useState<Judge | null>(null);
  const [config, setConfig] = useState<EvaluationConfig | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [evaluations, setEvaluations] = useState<JudgeEvaluation[]>([]);

  // Selected Team for Evaluation View
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team_01');

  // Rubric Scores (0-20, 0-30, 0-30, 0-20) Total 100
  const [c1, setC1] = useState<number>(0);
  const [c2, setC2] = useState<number>(0);
  const [c3, setC3] = useState<number>(0);
  const [c4, setC4] = useState<number>(0);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [generalComments, setGeneralComments] = useState('');

  const [evalSaveStatus, setEvalSaveStatus] = useState<string>('');
  const [evalError, setEvalError] = useState<string>('');
  const [isLockedByFinal, setIsLockedByFinal] = useState<boolean>(false);

  const fetchJudgePortalData = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      if (!authData.authenticated || authData.session?.role !== 'judge') {
        router.push('/login?role=judge');
        return;
      }

      const res = await fetch('/api/evaluations');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        const thisJudge = data.judges?.find((j: Judge) => j.judge_id === authData.session.userId) || {
          judge_id: authData.session.userId,
          name: authData.session.displayName,
          is_lead: authData.session.userId === data.config?.lead_judge_id,
          is_active: true,
        };
        setCurrentJudge(thisJudge);
        setEvaluations(data.evaluations || []);
        if (data.teams) setTeams(data.teams);
        if (data.profiles) setProfiles(data.profiles);
        if (data.submissions) setSubmissions(data.submissions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchJudgePortalData();
  }, [fetchJudgePortalData]);

  // Load selected team's evaluation into form
  useEffect(() => {
    if (!selectedTeamId || !currentJudge) return;

    const existingEval = evaluations.find(
      (e) => e.team_id === selectedTeamId && e.judge_id === currentJudge.judge_id
    );

    if (existingEval) {
      setC1(existingEval.criterion_1_identification);
      setC2(existingEval.criterion_2_survey);
      setC3(existingEval.criterion_3_price);
      setC4(existingEval.criterion_4_justification);
      setStrengths(existingEval.strengths || '');
      setImprovements(existingEval.areas_for_improvement || '');
      setGeneralComments(existingEval.general_comments || '');
      setIsLockedByFinal(existingEval.is_final);
    } else {
      setC1(0);
      setC2(0);
      setC3(0);
      setC4(0);
      setStrengths('');
      setImprovements('');
      setGeneralComments('');
      setIsLockedByFinal(false);
    }
    setEvalSaveStatus('');
    setEvalError('');
  }, [selectedTeamId, currentJudge, evaluations]);

  const totalCalculated = Number((Number(c1) + Number(c2) + Number(c3) + Number(c4)).toFixed(2));

  const handleSaveEvaluation = async (isFinal: boolean) => {
    setEvalSaveStatus('');
    setEvalError('');

    if (isFinal) {
      const confirmFinal = window.confirm(
        'Are you sure you want to lock and finalise this evaluation? Once finalised, only an administrator can reopen it.'
      );
      if (!confirmFinal) return;
    }

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_evaluation',
          teamId: selectedTeamId,
          evaluationData: {
            criterion_1_identification: c1,
            criterion_2_survey: c2,
            criterion_3_price: c3,
            criterion_4_justification: c4,
            strengths,
            areas_for_improvement: improvements,
            general_comments: generalComments,
            is_final: isFinal,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setEvalError(data.message || 'Error saving score');
        return;
      }
      setEvalSaveStatus(isFinal ? 'Evaluation finalised and locked!' : 'Draft score saved.');
      setIsLockedByFinal(isFinal);
      fetchJudgePortalData();
    } catch (e) {
      setEvalError('Connection error while saving evaluation');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login?role=judge');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
          <span className="font-semibold text-sm">Opening Judges Evaluation Portal...</span>
        </div>
      </div>
    );
  }

  // Active check if evaluation is locked by admin
  const isEvaluationOpen = config?.is_open;

  // Selected team, profile, submission
  const selectedTeam = teams.find((t) => t.team_id === selectedTeamId);
  const selectedProfile = profiles.find((p) => p.id === selectedTeam?.assigned_profile_id);
  const selectedSubmission = submissions.find((s) => s.team_id === selectedTeamId);

  const evaluatedTeamsCount = evaluations.filter((e) => e.judge_id === currentJudge?.judge_id && e.is_final).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Judge Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-700 flex items-center justify-center text-white shadow font-bold">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wide text-white">QUANTRIX JUDGING</span>
                <span className="text-xs text-teal-400 font-bold">• 100-MARK RUBRIC EVALUATION</span>
              </div>
              <div className="text-xs text-slate-400">
                The Price Is Right? • Round 1: Know Your Customer • TSM Madurai
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="font-bold text-teal-300">{currentJudge?.name}</span>
              {currentJudge?.is_lead && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  Lead Judge
                </span>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Evaluation Window Locked Banner */}
        {!isEvaluationOpen && (
          <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm">EVALUATION LOCKED – AWAITING ADMIN ACTIVATION</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  The organiser has not yet opened the evaluation window. Scoring will be activated 3–5 days after the event. All team submissions are safely recorded in read-only mode.
                </p>
              </div>
            </div>
            <div className="text-xs font-bold px-3 py-1 bg-white text-rose-800 rounded border border-rose-200">
              Read-Only Preview
            </div>
          </div>
        )}

        {/* Judging KPI Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Total Teams</span>
            <span className="text-2xl font-black text-slate-900">{teams.length}</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Submissions Received</span>
            <span className="text-2xl font-black text-sky-700">
              {submissions.filter((s) => s.status !== 'not_started').length}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Your Completed Evals</span>
            <span className="text-2xl font-black text-teal-700">{evaluatedTeamsCount} / {teams.length}</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Evaluation Mode</span>
            <span className="text-xs font-bold text-indigo-800 mt-1 block truncate">
              {config?.scoring_mode === 'panel_common' ? 'Panel Consensus (Mode A)' : 'Individual Average (Mode B)'}
            </span>
          </div>
        </div>

        {/* 2-Column Evaluation Interface: Left Selector & Submission, Right Rubric */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Teams List & Submission Review) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Team Selector Carousel/Tabs */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Select Team to Evaluate:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {teams.map((t) => {
                  const evalRecord = evaluations.find(
                    (e) => e.team_id === t.team_id && e.judge_id === currentJudge?.judge_id
                  );
                  const isSelected = selectedTeamId === t.team_id;
                  return (
                    <button
                      key={t.team_id}
                      onClick={() => setSelectedTeamId(t.team_id)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-800 shadow'
                          : evalRecord?.is_final
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{t.team_name}</span>
                      {evalRecord?.is_final && <span className="ml-1 text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Team Profile & Confidential Benchmark */}
            {selectedProfile && (
              <div>
                <CustomerProfileCard profile={selectedProfile} showBenchmark={true} />
              </div>
            )}

            {/* Submitted Answers View */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Submitted Responses ({selectedTeam?.team_name})
                  </h3>
                </div>
                <div className="text-xs text-slate-500">
                  {selectedSubmission?.submitted_at
                    ? `Submitted: ${formatIST(selectedSubmission.submitted_at)}`
                    : 'Draft or not submitted'}
                  {selectedSubmission?.is_auto_submitted && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                      Auto-Submitted at Expiry
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                    Question 1: Target Customer Identification
                  </span>
                  <p className="text-slate-900 font-medium">
                    {selectedSubmission?.q1_target_customer || <span className="text-rose-500 italic">No answer provided</span>}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                    Question 2: Top 3 Influencing Factors
                  </span>
                  <p className="text-slate-900 font-medium">
                    1. {selectedSubmission?.q2_factor_1 || '—'} | 2. {selectedSubmission?.q2_factor_2 || '—'} | 3. {selectedSubmission?.q2_factor_3 || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                      Question 3: Largest Survey Price Category
                    </span>
                    <p className="text-slate-900 font-bold">
                      {selectedSubmission?.q3_survey_top_price_range || <span className="text-rose-500 italic">None</span>}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      (Survey ground truth: ₹250–₹299 with 35 customers)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                      Question 4: Recommended Selling Price
                    </span>
                    <p className="text-teal-700 font-black text-base">
                      {selectedSubmission?.q4_recommended_price ? `₹${selectedSubmission.q4_recommended_price}` : '—'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                    Question 5: Pricing Strategy Justification
                  </span>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    {selectedSubmission?.q5_price_justification || <span className="text-rose-500 italic">No answer provided</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 100-Mark Rubric Score Entry */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Rubric Scoring</h3>
                  <p className="text-xs text-slate-500">100 Marks Total • Four Standard Criteria</p>
                </div>

                {isLockedByFinal && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Finalised
                  </span>
                )}
              </div>

              {evalSaveStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{evalSaveStatus}</span>
                </div>
              )}

              {evalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{evalError}</span>
                </div>
              )}

              {/* Criterion 1: Customer Identification (0-20) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    1. Customer Identification (Max: 20)
                  </label>
                  <span className="text-sm font-black text-teal-700">{c1} / 20</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Target clarity, persona depth, demographic alignment.
                </p>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  disabled={!isEvaluationOpen || isLockedByFinal}
                  value={c1}
                  onChange={(e) => setC1(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              {/* Criterion 2: Survey Data Interpretation (0-30) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    2. Survey Interpretation (Max: 30)
                  </label>
                  <span className="text-sm font-black text-teal-700">{c2} / 30</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Correct reading of survey (Affordable Price 35%, ₹250–₹299 35%), factor linkage.
                </p>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  disabled={!isEvaluationOpen || isLockedByFinal}
                  value={c2}
                  onChange={(e) => setC2(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              {/* Criterion 3: Realistic Price Recommendation (0-30) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    3. Price Recommendation (Max: 30)
                  </label>
                  <span className="text-sm font-black text-teal-700">{c3} / 30</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Strategic suitability, budget fit, reference benchmark context.
                </p>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  disabled={!isEvaluationOpen || isLockedByFinal}
                  value={c3}
                  onChange={(e) => setC3(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              {/* Criterion 4: Quality of Justification (0-20) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    4. Quality of Justification (Max: 20)
                  </label>
                  <span className="text-sm font-black text-teal-700">{c4} / 20</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Economic rationale, internal logic consistency, business acumen.
                </p>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  disabled={!isEvaluationOpen || isLockedByFinal}
                  value={c4}
                  onChange={(e) => setC4(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              {/* Total Computed Score Display */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block">
                    Calculated Total Score
                  </span>
                  <span className="text-[11px] text-teal-700">Out of 100 Marks</span>
                </div>
                <div className="text-3xl font-black text-teal-900 font-mono">
                  {totalCalculated.toFixed(2)}
                </div>
              </div>

              {/* Qualitative Observations */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Response Strengths</label>
                  <textarea
                    rows={2}
                    disabled={!isEvaluationOpen || isLockedByFinal}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="Key merits observed in the team's analysis..."
                    className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Areas for Improvement</label>
                  <textarea
                    rows={2}
                    disabled={!isEvaluationOpen || isLockedByFinal}
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    placeholder="Gaps in pricing logic or survey interpretation..."
                    className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Overall Judge Comments</label>
                  <textarea
                    rows={2}
                    disabled={!isEvaluationOpen || isLockedByFinal}
                    value={generalComments}
                    onChange={(e) => setGeneralComments(e.target.value)}
                    placeholder="General observations for the panel record..."
                    className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Save & Finalise Action Buttons */}
              {isEvaluationOpen && !isLockedByFinal && (
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveEvaluation(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveEvaluation(true)}
                    className="px-5 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Finalise & Lock Evaluation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
