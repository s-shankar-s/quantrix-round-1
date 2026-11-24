'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoundTimerState, RoundTimerStatus } from '@/types';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabase';

interface UseRealtimeTimerReturn {
  timer: RoundTimerState | null;
  displaySeconds: number;
  status: RoundTimerStatus;
  isExpired: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useRealtimeTimer(): UseRealtimeTimerReturn {
  const [timer, setTimer] = useState<RoundTimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number>(720);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const timerRef = useRef<RoundTimerState | null>(null);

  const syncFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/timer', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.timer) {
        setTimer(data.timer);
        timerRef.current = data.timer;
        computeDisplay(data.timer);
      }
    } catch (e) {
      console.error('Failed to sync timer from server', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const computeDisplay = (currentTimer: RoundTimerState) => {
    if (currentTimer.status === 'not_started') {
      setDisplaySeconds(currentTimer.duration_seconds);
    } else if (currentTimer.status === 'paused') {
      setDisplaySeconds(currentTimer.remaining_seconds_on_pause);
    } else if (currentTimer.status === 'completed') {
      setDisplaySeconds(0);
    } else if (currentTimer.status === 'running' && currentTimer.deadline_at) {
      const now = Date.now();
      const deadline = new Date(currentTimer.deadline_at).getTime();
      const left = Math.max(0, Math.round((deadline - now) / 1000));
      setDisplaySeconds(left);
      if (left <= 0 && currentTimer.status === 'running') {
        // Trigger sync to register completion
        syncFromServer();
      }
    }
  };

  // Initial fetch and periodic resynchronisation (every 3 seconds)
  useEffect(() => {
    syncFromServer();
    const pollInterval = setInterval(() => {
      syncFromServer();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [syncFromServer]);

  // Client-side high-resolution tick (every 1 second)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (timerRef.current && timerRef.current.status === 'running' && timerRef.current.deadline_at) {
        const now = Date.now();
        const deadline = new Date(timerRef.current.deadline_at).getTime();
        const left = Math.max(0, Math.round((deadline - now) / 1000));
        setDisplaySeconds(left);
      }
    }, 1000);

    return () => clearInterval(tickInterval);
  }, []);

  // Supabase Realtime channel subscription if configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabaseClient
      .channel('realtime:timer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_timer_state' },
        (payload: any) => {
          if (payload.new) {
            setTimer(payload.new);
            timerRef.current = payload.new;
            computeDisplay(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const isExpired = (timer?.status === 'completed' || displaySeconds <= 0) && timer?.status !== 'not_started';

  return {
    timer,
    displaySeconds,
    status: timer?.status || 'not_started',
    isExpired,
    isLoading,
    refresh: syncFromServer,
  };
}
