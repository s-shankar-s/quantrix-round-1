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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
            LIVE ROUND
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Pause className="w-3 h-3 fill-amber-600 text-amber-600" />
            TIMER PAUSED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <CheckCircle2 className="w-3 h-3 text-rose-600" />
            ROUND CONCLUDED
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            AWAITING START
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white/90 backdrop-blur border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Official Round Clock
        </span>
      </div>

      <div
        className={`font-mono transition-colors ${sizeClasses} ${
          isZero
            ? 'text-rose-600'
            : isUrgent
            ? 'text-amber-600 animate-pulse'
            : status === 'running'
            ? 'text-blue-900'
            : 'text-slate-700'
        }`}
      >
        {formatSecondsToTimer(seconds)}
      </div>

      {showStatusBadge && <div className="mt-2">{getStatusBadge()}</div>}
    </div>
  );
};
