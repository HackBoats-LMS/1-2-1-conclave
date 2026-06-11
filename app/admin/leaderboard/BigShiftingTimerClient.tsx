"use client";

import React, { useEffect, useState, useRef } from "react";
import { startRound } from "../actions";

interface GameState {
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

  const hasTriggeredRef = useRef(false);
  const prevRoundActiveRef = useRef(initialRoundActive);

  // Poll /api/game-state every 2s — source of truth
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/game-state", { cache: "no-store" });
        if (!res.ok) return;
        const data: GameState = await res.json();

        const wasActive = prevRoundActiveRef.current;
        const isNowActive = data.isRoundActive;
        prevRoundActiveRef.current = isNowActive;

        setLiveRoundActive(isNowActive);
        setLiveDuration(data.shiftDuration);
        setLiveAutoMode(data.isAutoMode);
        setLiveNextRoundId(data.nextRoundId);

        // Round just became inactive — start the shifting timer from now
        if (wasActive && !isNowActive) {
          hasTriggeredRef.current = false;
          setLiveEndedAtMs(Date.now());
        }

        // Round became active again — reset everything
        if (!wasActive && isNowActive) {
          setLiveEndedAtMs(null);
          setTimeLeft(null);
        }
      } catch (_) {}
    };

    poll(); // immediate first call
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Shifting countdown
  useEffect(() => {
    if (!liveEndedAtMs || liveRoundActive || allRoundsCompleted) {
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
  }, [liveEndedAtMs, liveDuration, liveRoundActive, allRoundsCompleted, liveAutoMode, liveNextRoundId]);

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
