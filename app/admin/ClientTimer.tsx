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
    if (!startedAt || (status !== 'IN_PROGRESS' && !status.startsWith('PAUSED_'))) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const startTime = new Date(startedAt).getTime();
      const endTime = startTime + (durationMinutes * 60 * 1000);
      
      if (status.startsWith('PAUSED_')) {
        const elapsedSec = parseInt(status.split('_')[1]);
        if (!isNaN(elapsedSec)) {
          return Math.max(0, (durationMinutes * 60 * 1000) - (elapsedSec * 1000));
        }
      }
      
      const now = new Date().getTime();
      return Math.max(0, endTime - now);
    };

    setTimeLeft(calculateTimeLeft());

    if (status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startedAt, durationMinutes, status]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="w-full py-6 flex flex-col items-center justify-center">
      <div className={`text-4xl sm:text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm transition-colors ${status.startsWith('PAUSED_') ? 'text-amber-500 animate-pulse' : 'text-[#0D2421]'}`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/50 mt-1">
        Time Remaining
      </div>
    </div>
  );
}
