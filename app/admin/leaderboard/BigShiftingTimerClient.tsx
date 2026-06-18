"use client";

import React, { useEffect, useState, useRef } from "react";
import { startRound } from "../actions/round.actions";

interface GameState {
  isRoundActive: boolean;
  lastRoundEndedAt: string | null;
  shiftDuration: number;
  isAutoMode: boolean;
  nextRoundId: string | null;
  allRoundsCompleted: boolean;
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
  const [liveAllRoundsCompleted, setLiveAllRoundsCompleted] = useState(!!allRoundsCompleted);

  // Listen to round_state_change via Websocket instead of polling DB
  useEffect(() => {
    import("@/lib/supabaseClient").then(({ supabase }) => {
      const channel = supabase
        .channel("global_events")
        .on("broadcast", { event: "round_state_change" }, ({ payload }: any) => {
          const { action, round, gameState, nextRoundId, allRoundsCompleted: completed } = payload;
          
          if (gameState) {
            setLiveDuration(gameState.shiftDuration);
            setLiveAutoMode(gameState.isAutoMode);
          }

          if (action === "start") {
            setLiveRoundActive(true);
            setLiveEndedAtMs(null);
            setTimeLeft(null);
          } else if (action === "stop") {
            setLiveRoundActive(false);
            setLiveEndedAtMs(Date.now());
            hasTriggeredRef.current = false;
            
            if (nextRoundId !== undefined) setLiveNextRoundId(nextRoundId);
            if (completed !== undefined) setLiveAllRoundsCompleted(completed);
            
          } else if (action === "reset") {
            setLiveRoundActive(false);
            setLiveEndedAtMs(null);
            setTimeLeft(null);
            
            if (nextRoundId !== undefined) setLiveNextRoundId(nextRoundId);
            if (completed !== undefined) setLiveAllRoundsCompleted(completed);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, []);

  // Shifting countdown
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
