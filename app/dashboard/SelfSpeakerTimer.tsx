"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function SelfSpeakerTimer({
  roundId,
  tableNumber,
  userId,
}: {
  roundId: string;
  tableNumber: number;
  userId: string;
}) {
  const [activeTimer, setActiveTimer] = useState<{ type: string; timeLeft: number } | null>(null);

  useEffect(() => {
    if (!roundId || !tableNumber) return;

    let localInterval: NodeJS.Timeout | null = null;
    let targetEndTime: number | null = null;

    // Shared function to initialize or adopt a timer
    const activateTimer = (payloadUserId: string, payloadType: string, payloadTargetEndTime: number) => {
      if (payloadUserId === userId) {
        if (targetEndTime === payloadTargetEndTime) return;
        
        targetEndTime = payloadTargetEndTime;
        const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
        
        if (remaining > 0) {
          console.log(`[SelfSpeakerTimer] Activating timer for me! Type: ${payloadType}, remaining: ${remaining}`);
          setActiveTimer({ type: payloadType, timeLeft: remaining });
          if (localInterval) clearInterval(localInterval);
          
          localInterval = setInterval(() => {
            if (!targetEndTime) return;
            const currentRemaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
            if (currentRemaining <= 0) {
              console.log(`[SelfSpeakerTimer] Timer finished!`);
              setActiveTimer(null);
              if (localInterval) clearInterval(localInterval);
              targetEndTime = null;
            } else {
              setActiveTimer(prev => prev ? { ...prev, timeLeft: currentRemaining } : null);
            }
          }, 250);
        } else {
          console.log(`[SelfSpeakerTimer] Remaining <= 0, clearing timer.`);
          setActiveTimer(null);
          if (localInterval) clearInterval(localInterval);
          targetEndTime = null;
        }
      } else {
        console.log(`[SelfSpeakerTimer] Not for me. payloadUserId=${payloadUserId}, my userId=${userId}`);
        setActiveTimer(null);
        if (localInterval) clearInterval(localInterval);
        targetEndTime = null;
      }
    };

    const handleTimerStart = (e: any) => {
      const payload = e.detail;
      const initialTarget = Date.now() + payload.durationSec * 1000;
      activateTimer(payload.userId, payload.type, initialTarget);
    };

    const handleTimerSync = (e: any) => {
      const payload = e.detail;
      activateTimer(payload.userId, payload.type, payload.targetEndTime);
    };

    const handleTimerStop = (e: any) => {
      const payload = e.detail;
      if (!payload.userId || payload.userId === userId) {
        setActiveTimer(null);
        if (localInterval) clearInterval(localInterval);
        targetEndTime = null;
      }
    };

    window.addEventListener("conclave_timer_start", handleTimerStart);
    window.addEventListener("conclave_timer_sync", handleTimerSync);
    window.addEventListener("conclave_timer_stop", handleTimerStop);

    return () => {
      if (localInterval) clearInterval(localInterval);
      window.removeEventListener("conclave_timer_start", handleTimerStart);
      window.removeEventListener("conclave_timer_sync", handleTimerSync);
      window.removeEventListener("conclave_timer_stop", handleTimerStop);
    };
  }, [roundId, tableNumber, userId]);

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
