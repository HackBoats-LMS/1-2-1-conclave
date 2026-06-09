"use client";

import React, { useEffect, useState } from "react";

export function ChangingTablesTimer({ lastRoundEndedAt, durationMinutes = 3 }: { lastRoundEndedAt: Date | null, durationMinutes?: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!lastRoundEndedAt) return;

    const targetTime = new Date(lastRoundEndedAt).getTime() + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const now = new Date().getTime();
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
  }, [lastRoundEndedAt, durationMinutes]);

  if (timeLeft === null || timeLeft === 0) return null;

  const m = Math.floor(timeLeft / 1000 / 60);
  const s = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="bg-[#BEF03C] border-2 border-[#0D2421] p-4 rounded-2xl shadow-[4px_4px_0px_#0D2421] text-center space-y-2 mt-4 animate-pulse">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60">
        TIME TO CHANGE TABLES
      </div>
      <div className="text-3xl font-black text-[#0D2421] tracking-tighter">
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div className="text-xs font-bold text-[#0D2421]/80 uppercase tracking-wide">
        Please move to your next table assignment
      </div>
    </div>
  );
}
