"use client";

import React, { useEffect, useState, useRef } from "react";

interface LeaderboardTimerClientProps {
  roundNumber: number;
  startedAt: Date | string | null;
  durationMinutes: number;
  status: string;
}

export function LeaderboardTimerClient({ roundNumber, startedAt, durationMinutes, status }: LeaderboardTimerClientProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);
  const statusRef = useRef(status);

  useEffect(() => { statusRef.current = status; }, [status]);

  if (status !== prevStatus) {
    setPrevStatus(status);
    if (!startedAt || (status !== 'IN_PROGRESS' && !status.startsWith('PAUSED_'))) {
      setTimeLeft(null);
    }
  }

  useEffect(() => {
    if (!startedAt || (status !== 'IN_PROGRESS' && !status.startsWith('PAUSED_'))) {
      return;
    }

    const calculateTimeLeft = () => {
      const currentStatus = statusRef.current;
      const startTime = new Date(startedAt).getTime();
      const endTime = startTime + (durationMinutes * 60 * 1000);

      if (currentStatus.startsWith('PAUSED_')) {
        const elapsedSec = parseInt(currentStatus.split('_')[1]);
        if (!isNaN(elapsedSec)) {
          return Math.max(0, (durationMinutes * 60 * 1000) - (elapsedSec * 1000));
        }
      }

      const now = new Date().getTime();
      return Math.max(0, endTime - now);
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(calculateTimeLeft());

    if (status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startedAt, durationMinutes, status]);

  if (timeLeft === null) {
    return (
      <div className="flex items-center gap-4 md:gap-5 bg-[#FAF8F4] border-4 border-[#0D2421] px-6 py-4 md:px-10 md:py-6 rounded-3xl shadow-[6px_6px_0px_#0D2421] shrink-0">
        <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-amber-500 border-2 border-[#0D2421] animate-pulse"></span>
        <span className="text-lg md:text-2xl font-black uppercase tracking-widest text-[#0D2421]">Standby Mode</span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isPaused = status.startsWith('PAUSED_');

  return (
    <div className={`flex items-center gap-4 md:gap-6 ${isPaused ? 'bg-amber-100' : 'bg-[#BEF03C]'} border-4 border-[#0D2421] px-6 py-4 md:px-10 md:py-5 rounded-3xl shadow-[6px_6px_0px_#0D2421] shrink-0 transition-colors`}>
      <span className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-[#0D2421] ${isPaused ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
      <div className="flex flex-col">
        <span className="text-xs md:text-sm font-black uppercase tracking-widest text-[#0D2421]/60 leading-tight">
          {isPaused ? `ROUND ${roundNumber} PAUSED` : `ROUND ${roundNumber} ACTIVE`}
        </span>
        <span className="text-3xl md:text-5xl font-black tracking-tighter tabular-nums text-[#0D2421] leading-none pt-1">
          {timeString}
        </span>
      </div>
    </div>
  );
}
