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

    const channelName = `room_${roundId}_table_${tableNumber}`;
    const channel = supabase.channel(channelName);

    let localInterval: NodeJS.Timeout | null = null;

    channel.on("broadcast", { event: "timer_start" }, ({ payload }) => {
      if (payload.userId === userId) {
        const elapsed = Math.floor((Date.now() - payload.timestamp) / 1000);
        let remaining = payload.durationSec - elapsed;

        setActiveTimer({ type: payload.type, timeLeft: remaining });

        if (localInterval) clearInterval(localInterval);
        localInterval = setInterval(() => {
          setActiveTimer((prev) => {
            if (!prev) return null;
            if (prev.timeLeft <= 1) {
              if (localInterval) clearInterval(localInterval);
              return null;
            }
            return { ...prev, timeLeft: prev.timeLeft - 1 };
          });
        }, 1000);
      } else {
        setActiveTimer(null);
        if (localInterval) clearInterval(localInterval);
      }
    });

    channel.on("broadcast", { event: "timer_stop" }, ({ payload }) => {
      if (!payload.userId || payload.userId === userId) {
        setActiveTimer(null);
        if (localInterval) clearInterval(localInterval);
      }
    });

    channel.subscribe();

    return () => {
      if (localInterval) clearInterval(localInterval);
      supabase.removeChannel(channel);
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
