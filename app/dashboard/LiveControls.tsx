"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveControls({ 
  updatedAtTime, 
  durationMinutes = 15,
  status
}: { 
  updatedAtTime: number; 
  durationMinutes?: number; 
  status?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(`${durationMinutes.toString().padStart(2, '0')}:00`);
  const [isEnded, setIsEnded] = useState(false);

  // Removed all polling from live round to guarantee zero lag or infinite render loops.

  // Real-time custom countdown synchronized to when the Admin clicked Launch
  useEffect(() => {
    let remaining = 0;
    const totalDuration = durationMinutes * 60 * 1000; // custom mins in ms

    const updateTimer = () => {
      if (status?.startsWith("PAUSED_")) {
        const elapsedSec = parseInt(status.split("_")[1]);
        const elapsedMs = (isNaN(elapsedSec) ? 0 : elapsedSec) * 1000;
        remaining = totalDuration - elapsedMs;
      } else {
        const now = new Date().getTime();
        const elapsed = now - updatedAtTime;
        remaining = totalDuration - elapsed;
      }

      if (remaining <= 0) {
        setTimeLeft("00:00");
        setIsEnded(true);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateTimer(); 
    
    // Only tick if not paused
    let timerInterval: NodeJS.Timeout | null = null;
    if (!status?.startsWith("PAUSED_")) {
      timerInterval = setInterval(updateTimer, 1000);
    }
    
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [updatedAtTime, durationMinutes, status]);

  return (
    <div className={`px-4 md:px-6 py-3 rounded-2xl font-black text-lg md:text-xl border-2 text-center transition-all ${isEnded ? 'bg-[#FAF8F4] text-[#0D2421]/40 border-[#0D2421]/30' : 'bg-[#0D2421] text-[#BEF03C] border-[#0D2421] shadow-[3px_3px_0px_#0D2421]'}`}>
      {timeLeft} 
      <span className={`text-xs font-black uppercase tracking-wider block md:inline md:ml-3 ${isEnded ? 'text-[#0D2421]/40' : 'text-[#BEF03C]'}`}>
        {isEnded ? "Round Ended" : "Remaining"}
      </span>
    </div>
  );
}


