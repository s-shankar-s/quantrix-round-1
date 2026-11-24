'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamScoreSummary } from '@/types';
import { Award, Trophy, CheckCircle, Lock, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ResultsLeaderboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const [results, setResults] = useState<TeamScoreSummary[]>([]);

  useEffect(() => {
    fetch('/api/results')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPublished(Boolean(data.published));
          setResults(data.results || []);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span className="font-semibold text-sm">Loading Results Ledger...</span>
        </div>
      </div>
    );
  }

  if (!published) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Results Under Evaluation</h1>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
          The judging panel evaluation for Round 1: Know Your Customer is currently in progress. Final official scores will be published by the organisers upon completion of verification.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">QUANTRIX RESULTS</h1>
              <p className="text-xs text-sky-400 font-bold">
                ROUND 1: KNOW YOUR CUSTOMER • OFFICIAL SCORES & RANKINGS
              </p>
              <p className="text-[11px] text-slate-400">Thiagarajar School of Management, Madurai</p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700"
          >
            Print Summary Sheet
          </button>
        </div>

        {/* Results Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5">Customer Segment</th>
                  <th className="p-3.5 text-center">Cust Id (20)</th>
                  <th className="p-3.5 text-center">Survey (30)</th>
                  <th className="p-3.5 text-center">Price (30)</th>
                  <th className="p-3.5 text-center">Justif (20)</th>
                  <th className="p-3.5 text-right font-black text-white">Total (100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((res) => {
                  const isTop3 = res.rank && res.rank <= 3;
                  return (
                    <tr
                      key={res.team_id}
                      className={`hover:bg-slate-850 transition ${
                        res.rank === 1 ? 'bg-amber-500/10' : res.rank === 2 ? 'bg-slate-500/10' : res.rank === 3 ? 'bg-amber-700/10' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        {res.rank ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              res.rank === 1
                                ? 'bg-amber-400 text-slate-950 shadow-md'
                                : res.rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : res.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {res.rank}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-white text-sm">
                        {res.team_name}
                        <span className="block text-[10px] font-normal text-slate-400">{res.team_id}</span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">{res.customer_profile_name}</td>
                      <td className="p-3.5 text-center">{res.criterion_1}</td>
                      <td className="p-3.5 text-center">{res.criterion_2}</td>
                      <td className="p-3.5 text-center">{res.criterion_3}</td>
                      <td className="p-3.5 text-center">{res.criterion_4}</td>
                      <td className="p-3.5 text-right font-black text-white text-base font-mono">
                        {res.total_score.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
