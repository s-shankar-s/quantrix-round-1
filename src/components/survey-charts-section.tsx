'use client';

import React from 'react';
import { SURVEY_PURCHASE_FACTORS, SURVEY_PRICE_RANGES } from '@/lib/data';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Info, Users, BarChart3, TrendingUp, Layers } from 'lucide-react';

export const SurveyChartsSection: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-8 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Common Market Survey Benchmark (N = 100 Customers)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Representative market intelligence dataset provided equally to all 15 competing teams.
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 text-sky-300 rounded-xl text-xs font-semibold border border-slate-700 self-start sm:self-auto">
          <Users className="w-4 h-4 text-sky-400" />
          <span>Total Sample: 100 Respondents</span>
        </div>
      </div>

      {/* Chart Section 1: Purchase Factors (Horizontal Bar with Generous Left Margin & Ample Height) */}
      <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block">
              Dataset 01
            </span>
            <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Key Purchase Factors Ranking
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked importance across 100 surveyed consumers when selecting a drinking water bottle.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30 self-start sm:self-auto">
            #1 Factor: Affordable Price (35%)
          </span>
        </div>

        {/* Dedicated spacious container: 280px height + 160px left margin to prevent any text clipping */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={SURVEY_PURCHASE_FACTORS}
              layout="vertical"
              margin={{ top: 10, right: 35, left: 140, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 40]}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                unit="%"
              />
              <YAxis
                dataKey="factor"
                type="category"
                tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 600 }}
                width={135}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                formatter={(value: any) => [`${value} customers (${value}%)`, 'Respondents']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Bar dataKey="customer_count" radius={[0, 6, 6, 0]} barSize={22}>
                {SURVEY_PURCHASE_FACTORS.map((entry, index) => (
                  <Cell
                    key={`factor-cell-${index}`}
                    fill={entry.factor === 'Affordable price' ? '#0ea5e9' : '#38bdf8'}
                    opacity={entry.factor === 'Affordable price' ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Cards for unambiguous reference */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {SURVEY_PURCHASE_FACTORS.map((f) => (
            <div
              key={f.id}
              className={`p-3 rounded-xl border transition ${
                f.factor === 'Affordable price'
                  ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400 truncate">{f.factor}</div>
              <div className="text-base font-extrabold text-white mt-1">
                {f.customer_count}{' '}
                <span className="text-xs font-normal text-slate-400">({f.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Section 2: Willingness to Pay (Vertical Bar with Rotated Spaced Labels & High Clearance) */}
      <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
              Dataset 02
            </span>
            <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Willingness-to-Pay (WTP) Distribution
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer price range preferences reported across 100 surveyed participants.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30 self-start sm:self-auto">
            Peak Range: ₹250–₹299 (35%)
          </span>
        </div>

        {/* Dedicated spacious container: 300px height with 45px bottom clearance for clean horizontal labels */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={SURVEY_PRICE_RANGES}
              margin={{ top: 15, right: 25, left: 10, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="price_range"
                tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 600 }}
                interval={0}
                dy={12}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 40]}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                unit="%"
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                formatter={(value: any) => [`${value} customers (${value}%)`, 'Willingness to Pay']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Bar dataKey="customer_count" radius={[6, 6, 0, 0]} barSize={36}>
                {SURVEY_PRICE_RANGES.map((entry, index) => (
                  <Cell
                    key={`wtp-cell-${index}`}
                    fill={entry.price_range === '₹250–₹299' ? '#14b8a6' : '#2dd4bf'}
                    opacity={entry.price_range === '₹250–₹299' ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Cards for price brackets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {SURVEY_PRICE_RANGES.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-xl border transition ${
                p.price_range === '₹250–₹299'
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400">{p.price_range}</div>
              <div className="text-base font-extrabold text-white mt-1">
                {p.customer_count}{' '}
                <span className="text-xs font-normal text-slate-400">({p.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Analytical Guidance */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-300 block">Strategic Pricing Note:</span>
          <p className="leading-relaxed text-slate-300">
            While the aggregate survey highlights <span className="text-sky-300 font-semibold">Affordable Price (35%)</span> and <span className="text-teal-300 font-semibold">₹250–₹299 (35%)</span> as the mass market centroid, your team must align strictly with your assigned customer persona&apos;s personal budget, income tier, and feature sensitivities.
          </p>
        </div>
      </div>
    </div>
  );
};
