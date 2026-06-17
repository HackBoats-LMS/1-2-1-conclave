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

export function AutoRefresh({ initialRoundId, currentStatus, userId, initialReferralCount }: { initialRoundId: string | null; currentStatus?: string; userId?: string; initialReferralCount?: number }) {
  const router = useRouter();
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return;

    // Listen to global_events for zero-lag syncing when the admin clicks pause/resume
    let cleanup: (() => void) | null = null;
    import('@/lib/supabaseClient').then(({ supabase }) => {
      const channel = supabase
        .channel("global_events")
        .on("broadcast", { event: "round_state_change" }, () => {
          // Stagger refreshes with a randomized client jitter of 0-1200ms
          // to protect the database connection pool from spikes during round state changes
          setTimeout(() => {
            router.refresh();
          }, Math.floor(Math.random() * 1200));
        })
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    });

    // Fallback polling — safety net for clients whose WebSocket dropped.
    // Supabase Realtime handles real-time updates; this only runs every 30s.
    let knownReferralCount = initialReferralCount ?? -1;
    const interval = setInterval(async () => {
      try {
        // Poll for new referrals on the ending page
        if (userId !== undefined) {
          const refRes = await fetch(`${supabaseUrl}/rest/v1/Referral?select=id&toUserId=eq.${userId}`, {
            headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
            cache: 'no-store'
          });
          const refData = await refRes.json();
          if (Array.isArray(refData) && refData.length !== knownReferralCount) {
            knownReferralCount = refData.length;
            router.refresh();
            return;
          }
        }

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
            router.refresh();
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
              router.refresh();
            }
          }
        }
      } catch (_e) { }
    }, 30000);
    return () => {
      cleanup?.();
      clearInterval(interval);
    };
  }, [router, initialRoundId, currentStatus, userId, initialReferralCount]);
  return null;
}
