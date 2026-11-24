'use client';

import React, { useState, useEffect } from 'react';
import { DisplayStats } from '@/types';
import { formatSecondsToTimer } from '@/lib/utils';
import { Clock, Users, CheckCircle2, TrendingUp, ShieldAlert, Award } from 'lucide-react';

export default function DisplayPage() {
  const [stats, setStats] = useState<DisplayStats | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number>(720);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/display');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        const t = data.stats.timer;
        if (t.status === 'not_started') {
          setDisplaySeconds(t.duration_seconds);
        } else if (t.status === 'paused') {
          setDisplaySeconds(t.remaining_seconds_on_pause);
        } else if (t.status === 'completed') {
          setDisplaySeconds(0);
        } else if (t.status === 'running' && t.deadline_at) {
          const now = Date.now();
          const dl = new Date(t.deadline_at).getTime();
          setDisplaySeconds(Math.max(0, Math.round((dl - now) / 1000)));
        }
      }
    } catch (e) {
      console.error('Failed to fetch display stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      if (stats?.timer.status === 'running' && stats?.timer.deadline_at) {
        const now = Date.now();
        const dl = new Date(stats.timer.deadline_at).getTime();
        setDisplaySeconds(Math.max(0, Math.round((dl - now) / 1000)));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [stats]);

  const timerStatus = stats?.timer.status || 'not_started';
  const isUrgent = timerStatus === 'running' && displaySeconds <= 120 && displaySeconds > 0;
  const isZero = displaySeconds <= 0 && timerStatus !== 'not_started';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-8 sm:p-12 selection:bg-teal-500 selection:text-white">
      {/* Top Banner */}
      <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full text-xs font-bold tracking-widest uppercase">
              Live Event Hall Display
            </span>
            <span className="text-sm font-semibold tracking-wider text-slate-400">
              Thiagarajar School of Management, Madurai
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mt-2">
            QUANTRIX <span className="text-teal-400">— THE PRICE IS RIGHT?</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-1 font-medium">
            Round 1: Know Your Customer • Market Intelligence Mission
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                timerStatus === 'running' ? 'bg-emerald-400' : timerStatus === 'paused' ? 'bg-amber-400' : 'bg-slate-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                timerStatus === 'running' ? 'bg-emerald-500' : timerStatus === 'paused' ? 'bg-amber-500' : 'bg-slate-600'
              }`}></span>
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-300">
              {timerStatus === 'running' ? 'Round In Progress' : timerStatus === 'paused' ? 'Round Paused' : timerStatus === 'completed' ? 'Round Concluded' : 'Awaiting Kickoff'}
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1 font-mono">Real-time Projector Feed</span>
          <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 mt-1.5">
            Notice: Results under multi-day evaluation • Ledger confidential
          </span>
        </div>
      </header>

      {/* Main Grid: Prominent Timer & Live Pulse Metrics */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8 items-center">
        {/* Giant Countdown Clock */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl bg-slate-900/80 border-2 border-slate-800 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-sm uppercase tracking-widest font-bold mb-4">
            <Clock className="w-5 h-5 text-teal-400" />
            Official Round Clock
          </div>

          <div
            className={`font-mono fluid-display font-black tracking-tighter ${
              isZero
                ? 'text-rose-500'
                : isUrgent
                ? 'text-amber-400 animate-pulse'
                : timerStatus === 'running'
                ? 'text-teal-400'
                : 'text-slate-100'
            }`}
          >
            {formatSecondsToTimer(displaySeconds)}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${
                timerStatus === 'running'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : timerStatus === 'paused'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                  : timerStatus === 'completed'
                  ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {timerStatus === 'running' && 'Simulation Active'}
              {timerStatus === 'paused' && 'Timer Paused by Administrator'}
              {timerStatus === 'completed' && 'Submissions Locked'}
              {timerStatus === 'not_started' && 'Ready for Launch'}
            </span>
          </div>
        </div>

        {/* Pulse Telemetry Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Teams Online</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-4xl sm:text-5xl font-black text-sky-400 mt-4">
              {stats?.teams_online || 0}
              <span className="text-xl text-slate-600 font-normal"> / {stats?.teams_total || 15}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Logged in and active</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 mt-4">
              {stats?.submissions_completed || 0}
              <span className="text-xl text-slate-600 font-normal"> / {stats?.teams_total || 15}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Final answers locked</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Working</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-4xl sm:text-5xl font-black text-amber-400 mt-4">
              {stats?.submissions_working || 0}
              <span className="text-xl text-slate-600 font-normal"> / {stats?.teams_total || 15}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Drafting missions</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Overall Progress</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-4xl sm:text-5xl font-black text-purple-400 mt-4">
              {stats?.overall_progress_pct || 0}%
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Event mission velocity</p>
          </div>
        </div>
      </main>

      {/* Bottom Progress Bar: Mission Completion Across Event */}
      <footer className="border-t border-slate-800 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Aggregate Mission Velocity Across 15 Teams
          </span>
          <span className="text-xs font-mono text-slate-500">Confidential Display Mode • No team data exposed</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Mission 01: Decode Customer</span>
              <span className="text-teal-400 font-mono">{stats?.mission_completion.mission_01 || 0}/15</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((stats?.mission_completion.mission_01 || 0) / 15) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Mission 02: Read Market</span>
              <span className="text-sky-400 font-mono">{stats?.mission_completion.mission_02 || 0}/15</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-sky-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((stats?.mission_completion.mission_02 || 0) / 15) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Mission 03: Set Price</span>
              <span className="text-amber-400 font-mono">{stats?.mission_completion.mission_03 || 0}/15</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((stats?.mission_completion.mission_03 || 0) / 15) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Mission 04: Defend Decision</span>
              <span className="text-purple-400 font-mono">{stats?.mission_completion.mission_04 || 0}/15</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-purple-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((stats?.mission_completion.mission_04 || 0) / 15) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
