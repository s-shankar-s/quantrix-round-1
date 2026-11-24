import React from 'react';
import { formatSecondsToTimer } from '@/lib/utils';
import { RoundTimerStatus } from '@/types';
import { Clock, Pause, Play, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SharedTimerDisplayProps {
  seconds: number;
  status: RoundTimerStatus;
  size?: 'compact' | 'standard' | 'large';
  showStatusBadge?: boolean;
}

export const SharedTimerDisplay: React.FC<SharedTimerDisplayProps> = ({
  seconds,
  status,
  size = 'standard',
  showStatusBadge = true,
}) => {
  const isUrgent = status === 'running' && seconds <= 120 && seconds > 0;
  const isZero = seconds <= 0 && status !== 'not_started';

  const sizeClasses = {
    compact: 'text-xl font-bold tracking-tight',
    standard: 'text-3xl sm:text-4xl font-extrabold tracking-tight',
    large: 'text-5xl sm:text-6xl font-black tracking-tight',
  }[size];

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/50 animate-pulse">
            <Play className="w-3 h-3 fill-emerald-300 text-emerald-300" />
            LIVE ROUND
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/50">
            <Pause className="w-3 h-3 fill-amber-300 text-amber-300" />
            TIMER PAUSED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/50">
            <CheckCircle2 className="w-3 h-3 text-rose-300" />
            ROUND CONCLUDED
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-200 border border-slate-500/50">
            <Clock className="w-3 h-3 text-slate-300" />
            AWAITING START
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-slate-300" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Official Round Clock
        </span>
      </div>

      <div
        className={`font-mono transition-colors ${sizeClasses} ${
          isZero
            ? 'text-rose-400'
            : isUrgent
            ? 'text-amber-300 animate-pulse'
            : status === 'running'
            ? 'text-emerald-300'
            : 'text-slate-100'
        }`}
      >
        {formatSecondsToTimer(seconds)}
      </div>

      {showStatusBadge && <div className="mt-2">{getStatusBadge()}</div>}
    </div>
  );
};
