"use client";

import React, { useEffect, useState } from "react";

interface ClientTimerProps {
  startedAt: Date | string | null;
  durationMinutes: number;
  status: string;
}

export function ClientTimer({ startedAt, durationMinutes, status }: ClientTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !startedAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const startTime = new Date(startedAt).getTime();
      const endTime = startTime + (durationMinutes * 60 * 1000);
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now);
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, status]);

  if (status !== 'IN_PROGRESS' || timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="w-full py-6 flex flex-col items-center justify-center">
      <div className="text-4xl sm:text-5xl font-black text-[#0D2421] tracking-tighter tabular-nums drop-shadow-sm">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/50 mt-1">
        Time Remaining
      </div>
    </div>
  );
}
