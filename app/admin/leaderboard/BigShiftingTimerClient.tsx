"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { startRound } from "../actions";
import { supabase } from "@/lib/supabaseClient";

interface ShiftTimerData {
  isRoundActive: boolean;
  lastRoundEndedAt: string | null;
  shiftDuration: number;
  isAutoMode: boolean;
  nextRoundId: string | null;
}

export function BigShiftingTimerClient({
  lastRoundEndedAt: initialLastRoundEndedAt,
  durationMinutes: initialDurationMinutes = 3,
  isRoundActive: initialRoundActive,
  allRoundsCompleted,
  isAutoMode: initialAutoMode = false,
  nextRoundId: initialNextRoundId = null,
}: {
  lastRoundEndedAt: Date | string | null;
  durationMinutes?: number;
  isRoundActive: boolean;
  allRoundsCompleted?: boolean;
  isAutoMode?: boolean;
  nextRoundId?: string | null;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [liveRoundActive, setLiveRoundActive] = useState(initialRoundActive);
  const [liveEndedAtMs, setLiveEndedAtMs] = useState<number | null>(
    initialLastRoundEndedAt ? new Date(initialLastRoundEndedAt).getTime() : null
  );
  const [liveDuration, setLiveDuration] = useState(initialDurationMinutes);
  const [liveAutoMode, setLiveAutoMode] = useState(initialAutoMode);
  const [liveNextRoundId, setLiveNextRoundId] = useState(initialNextRoundId);
  const [liveAllRoundsCompleted, setLiveAllRoundsCompleted] = useState(!!allRoundsCompleted);

  const hasTriggeredRef = useRef(false);
  const prevRoundActiveRef = useRef(initialRoundActive);
  const isFetchingRef = useRef(false);

  /**
   * Fetch from the dedicated 2-query shift-timer endpoint.
   * Called reactively on Supabase events — NOT on a 2s loop.
   */
  const fetchShiftTimer = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/shift-timer", { cache: "no-store" });
      if (!res.ok) return;
      const data: ShiftTimerData = await res.json();

      const wasActive = prevRoundActiveRef.current;
      const isNowActive = data.isRoundActive;
      prevRoundActiveRef.current = isNowActive;

      setLiveRoundActive(isNowActive);
      setLiveDuration(data.shiftDuration);
      setLiveAutoMode(data.isAutoMode);
      setLiveNextRoundId(data.nextRoundId);

      // Round just became inactive — start the shifting timer
      if (wasActive && !isNowActive && !liveAllRoundsCompleted) {
        hasTriggeredRef.current = false;
        setLiveEndedAtMs(Date.now());
      }

      // Round became active — clear the shifting timer
      if (!wasActive && isNowActive) {
        setLiveEndedAtMs(null);
        setTimeLeft(null);
      }
    } catch (_) {
    } finally {
      isFetchingRef.current = false;
    }
  }, [liveAllRoundsCompleted]);

  useEffect(() => {
    /**
     * PRIMARY: Supabase Realtime (WebSocket).
     * Admin start/stop/pause/reset broadcasts to "global_events".
     * We react to the event instantly — no polling loop needed.
     */
    const channel = supabase
      .channel("big_shift_timer")
      .on("broadcast", { event: "round_state_change" }, ({ payload }) => {
        const action = (payload as { action?: string })?.action;

        if (action === "stop") {
          // Round ended — kick off the shifting timer immediately
          const wasActive = prevRoundActiveRef.current;
          prevRoundActiveRef.current = false;
          setLiveRoundActive(false);
          if (wasActive && !liveAllRoundsCompleted) {
            hasTriggeredRef.current = false;
            setLiveEndedAtMs(Date.now());
          }
        } else if (action === "start") {
          // New round started — hide the shifting timer
          prevRoundActiveRef.current = true;
          setLiveRoundActive(true);
          setLiveEndedAtMs(null);
          setTimeLeft(null);
        }

        // Fetch fresh data to sync shiftDuration, nextRoundId, etc.
        setTimeout(fetchShiftTimer, 400);
      })
      .subscribe();

    /**
     * FALLBACK: Poll every 30s for drift correction (WebSocket disconnect safety).
     * This is 15× less frequent than the old 2s interval.
     */
    const fallbackInterval = setInterval(fetchShiftTimer, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [fetchShiftTimer, liveAllRoundsCompleted]);

  // Shifting countdown — pure local JS, zero DB queries
  useEffect(() => {
    if (!liveEndedAtMs || liveRoundActive || liveAllRoundsCompleted) {
      setTimeLeft(null);
      return;
    }

    const targetTime = liveEndedAtMs + liveDuration * 60 * 1000;

    const tick = () => {
      const remaining = targetTime - Date.now();
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
        if (liveAutoMode && liveNextRoundId && !hasTriggeredRef.current && remaining >= -5000) {
          hasTriggeredRef.current = true;
          const fd = new FormData();
          fd.append("roundId", liveNextRoundId);
          startRound(fd);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveEndedAtMs, liveDuration, liveRoundActive, liveAllRoundsCompleted, liveAutoMode, liveNextRoundId]);

  if (timeLeft === null || liveRoundActive) return null;
  if (timeLeft === 0) return null;

  const m = Math.floor(timeLeft / 1000 / 60);
  const s = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-3xl bg-[#0D2421]/60 p-6 animate-in fade-in duration-500">
      <div className="bg-[#BEF03C] border-4 border-[#0D2421] p-12 md:p-24 rounded-[3rem] shadow-[12px_12px_0px_#0D2421] text-center space-y-6 max-w-5xl w-full">
        <div className="text-xl md:text-3xl font-black uppercase tracking-widest text-[#0D2421]/70 bg-white/50 px-6 py-2 rounded-full inline-block mb-4 border-2 border-[#0D2421]/20">
          Time to Change Tables
        </div>
        <div className="text-[6rem] md:text-[12rem] font-black text-[#0D2421] tracking-tighter leading-none py-8 animate-pulse shadow-sm">
          {m}:{s.toString().padStart(2, "0")}
        </div>
        <div className="text-2xl md:text-5xl font-black text-[#0D2421]/90 uppercase tracking-tight">
          Please move to your next assignment
        </div>
      </div>
    </div>
  );
}
