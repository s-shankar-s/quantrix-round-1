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
  const lastKnownServerUpdatedAtRef = useRef<number>(0);

  const computeDisplay = (currentTimer: RoundTimerState) => {
    if (currentTimer.status === 'not_started') {
      setDisplaySeconds(currentTimer.duration_seconds || 720);
    } else if (currentTimer.status === 'paused') {
      setDisplaySeconds(currentTimer.remaining_seconds_on_pause);
    } else if (currentTimer.status === 'completed') {
      setDisplaySeconds(0);
    } else if (currentTimer.status === 'running' && currentTimer.deadline_at) {
      // Server-authoritative remaining time calculation:
      // Compare deadline with the authoritative server reference time
      const deadline = new Date(currentTimer.deadline_at).getTime();
      const serverRef = currentTimer.server_time_reference
        ? new Date(currentTimer.server_time_reference).getTime()
        : Date.now();
      
      const left = Math.max(0, Math.round((deadline - serverRef) / 1000));
      setDisplaySeconds(left);
    }
  };

  const syncFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/timer', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.timer) {
        const newTimer: RoundTimerState = data.timer;
        const newUpdatedAt = newTimer.updated_at ? new Date(newTimer.updated_at).getTime() : 0;

        // CRITICAL VERCEL SERVERLESS PROTECTION:
        // On serverless hosting (Vercel), requests hit different isolated lambda containers.
        // If an admin starts the timer, some containers may still hold the initial 'not_started' state.
        // If the client has already observed a 'running' round, never revert to 'not_started'
        // unless an explicit reset occurred (indicated by a newer updated_at timestamp).
        if (
          timerRef.current &&
          timerRef.current.status === 'running' &&
          newTimer.status === 'not_started' &&
          newUpdatedAt <= lastKnownServerUpdatedAtRef.current
        ) {
          // Stale cold-start container response; keep running timer intact
          return;
        }

        // If local client has a running timer and server reports 'completed',
        // verify whether it genuinely completed based on updated_at or if it's an un-started container
        if (
          timerRef.current &&
          timerRef.current.status === 'running' &&
          newTimer.status === 'completed' &&
          newUpdatedAt < lastKnownServerUpdatedAtRef.current
        ) {
          return;
        }

        if (newUpdatedAt >= lastKnownServerUpdatedAtRef.current || !timerRef.current) {
          lastKnownServerUpdatedAtRef.current = newUpdatedAt;
          setTimer(newTimer);
          timerRef.current = newTimer;
          computeDisplay(newTimer);
        }
      }
    } catch (e) {
      console.error('Failed to sync timer from server', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and periodic resynchronisation (every 5 seconds with random jitter to distribute 80 concurrent visitors)
  useEffect(() => {
    syncFromServer();
    const jitter = Math.floor(Math.random() * 1000);
    const pollInterval = setInterval(() => {
      syncFromServer();
    }, 5000 + jitter);

    return () => clearInterval(pollInterval);
  }, [syncFromServer]);

  // Client-side high-resolution tick (every 1 second)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (timerRef.current && timerRef.current.status === 'running') {
        setDisplaySeconds((prev) => Math.max(0, prev - 1));
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

  // Only mark as expired when server explicitly reports 'completed'.
  // Do NOT derive expiry from displaySeconds alone — the initial value is 720
  // which counts down immediately in the tick, causing premature "Round Concluded".
  const isExpired = timer?.status === 'completed';

  return {
    timer,
    displaySeconds,
    status: timer?.status || 'not_started',
    isExpired,
    isLoading,
    refresh: syncFromServer,
  };
}
