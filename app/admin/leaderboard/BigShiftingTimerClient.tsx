"use client";

import React, { useEffect, useState, useRef } from "react";

export function BigShiftingTimerClient({ lastRoundEndedAt, durationMinutes = 3, isRoundActive, allRoundsCompleted }: { lastRoundEndedAt: Date | string | null, durationMinutes?: number, isRoundActive: boolean, allRoundsCompleted?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Convert server-serialized date string to timestamp for reliable comparison
  const endedAtMs = lastRoundEndedAt ? new Date(lastRoundEndedAt).getTime() : null;
  const prevEndedAtMsRef = useRef(endedAtMs);
  const prevIsRoundActiveRef = useRef(isRoundActive);

  // Detect prop changes (replaces the old broken getTime() comparison)
  if (endedAtMs !== prevEndedAtMsRef.current || isRoundActive !== prevIsRoundActiveRef.current) {
    prevEndedAtMsRef.current = endedAtMs;
    prevIsRoundActiveRef.current = isRoundActive;
    // If round just became active or all rounds done, clear the timer immediately
    if (!endedAtMs || isRoundActive || allRoundsCompleted) {
      setTimeLeft(null);
    }
  }

  useEffect(() => {
    if (!endedAtMs || isRoundActive || allRoundsCompleted) {
      setTimeLeft(null);
      return;
    }

    // Target time is when the last round ended + shift duration
    const targetTime = endedAtMs + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = targetTime - now;
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endedAtMs, durationMinutes, isRoundActive, allRoundsCompleted]);

  // Hide the popup if time is up, or if round is active
  if (timeLeft === null || timeLeft === 0 || isRoundActive) return null;

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
