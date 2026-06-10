"use client";

import { useEffect, useState, useRef } from "react";

interface SelfSpeakerTimerProps {
  activeSpeakerTimer: { userId: string; type: string; targetEndTime: number } | null;
  userId: string;
}

export function SelfSpeakerTimer({
  activeSpeakerTimer,
  userId,
}: SelfSpeakerTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeSpeakerTimer && activeSpeakerTimer.userId === userId) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((activeSpeakerTimer.targetEndTime - Date.now()) / 1000));
        if (remaining <= 0) {
          setTimeLeft(null);
          if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        } else {
          setTimeLeft(remaining);
        }
      };

      updateTimer();
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
      localIntervalRef.current = setInterval(updateTimer, 250);
    } else {
      setTimeLeft(null);
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
    }

    return () => {
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
    };
  }, [activeSpeakerTimer, userId]);

  const activeTimer = timeLeft !== null && activeSpeakerTimer ? { type: activeSpeakerTimer.type, timeLeft } : null;

  if (!activeTimer) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-[#BEF03C] text-[#0D2421] rounded-2xl border-4 border-[#0D2421] shadow-[8px_8px_0px_#0D2421] flex flex-col items-center gap-2 animate-bounce">
      <span className="font-black text-sm uppercase tracking-widest bg-[#0D2421] text-[#BEF03C] px-3 py-1 rounded-full">
        {activeTimer.type === "PITCH" ? "Your Turn to Pitch!" : "Your Referral Turn!"}
      </span>
      <div className="text-5xl font-black">{activeTimer.timeLeft}s</div>
    </div>
  );
}
