"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { autoStopExpiredRound } from "./actions";

export function LiveControls({ 
  updatedAtTime, 
  durationMinutes = 15,
  status,
  serverNow,
  roundId
}: { 
  updatedAtTime: number; 
  durationMinutes?: number; 
  status?: string;
  serverNow?: number;
  roundId?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(`${durationMinutes.toString().padStart(2, '0')}:00`);
  const [isEnded, setIsEnded] = useState(false);
  const hasTriggeredStopRef = useRef(false);
  const [clientServerOffset] = useState(() => serverNow ? serverNow - Date.now() : 0);

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
        const now = Date.now() + clientServerOffset;
        const elapsed = now - updatedAtTime;
        remaining = totalDuration - elapsed;
      }

      if (remaining <= 0) {
        setTimeLeft("00:00");
        setIsEnded(true);
        if (roundId && !hasTriggeredStopRef.current && status === "IN_PROGRESS") {
          hasTriggeredStopRef.current = true;
          autoStopExpiredRound(roundId).catch(console.error);
        }
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
    <div className={`px-6 py-3.5 rounded-2xl font-black text-xl border-2 text-center transition-all ${isEnded ? 'bg-[#FAF8F4] text-[#0D2421]/40 border-[#0D2421]/30' : 'bg-[#0D2421] text-[#BEF03C] border-[#0D2421] shadow-[3px_3px_0px_#0D2421]'}`}>
      {timeLeft} 
      <span className={`text-xs font-black uppercase tracking-wider block md:inline md:ml-3 ${isEnded ? 'text-[#0D2421]/40' : 'text-[#BEF03C]'}`}>
        {isEnded ? "Round Ended" : "Remaining"}
      </span>
    </div>
  );
}

export function AutoRefresh({ initialRoundId, currentStatus }: { initialRoundId: string | null; currentStatus?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return;

    let activeChannel: any = null;
    let isCleanup = false;

    // Listen to global_events for zero-lag syncing when the admin clicks pause/resume
    import('@/lib/supabaseClient').then(({ supabase }) => {
      if (isCleanup) return;
      const channel = supabase.channel("global_events");
      channel.on("broadcast", { event: "round_state_change" }, () => {
        // Add jitter (0-3000ms) to prevent Thundering Herd DDoS on Vercel
        const jitter = Math.floor(Math.random() * 3000);
        setTimeout(() => {
          router.refresh();
        }, jitter);
      });
      channel.subscribe();
      activeChannel = channel;
    });

    // Fallback polling just in case WebSockets fail
    const interval = setInterval(async () => {
      try {
        // Ping Supabase PostgREST API directly, bypassing Vercel entirely!
        const res = await fetch(`${supabaseUrl}/rest/v1/GameState?select=currentRoundId&limit=1`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          cache: 'no-store'
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
          if (data[0].currentRoundId !== initialRoundId) {
            setTimeout(() => router.refresh(), Math.floor(Math.random() * 2000));
            return;
          }
        }
        
        if (initialRoundId) {
          const res2 = await fetch(`${supabaseUrl}/rest/v1/Round?select=status&id=eq.${initialRoundId}`, {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            },
            cache: 'no-store'
          });
          const data2 = await res2.json();
          if (data2 && data2.length > 0) {
            if (data2[0].status !== currentStatus) {
              setTimeout(() => router.refresh(), Math.floor(Math.random() * 2000));
            }
          }
        }
      } catch (_e) {}
    }, 3000);

    return () => {
      clearInterval(interval);
      isCleanup = true;
      if (activeChannel) {
        import('@/lib/supabaseClient').then(({ supabase }) => {
          supabase.removeChannel(activeChannel);
        });
      }
    };
  }, [router, initialRoundId, currentStatus]);
  return null;
}
