"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveControls({ updatedAtTime }: { updatedAtTime: number }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState("15:00");
  const [isEnded, setIsEnded] = useState(false);

  // Removed all polling from live round to guarantee zero lag or infinite render loops.

  // Real-time 15-minute countdown synchronized to when the Admin clicked Launch
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const elapsed = now - updatedAtTime;
      const totalDuration = 15 * 60 * 1000; // 15 mins in ms
      
      const remaining = totalDuration - elapsed;

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
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [updatedAtTime]);

  return (
    <div className={`px-8 py-4 rounded-2xl font-bold text-xl border shadow-inner text-center transition-all ${isEnded ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
      {timeLeft} 
      <span className={`text-sm font-medium block md:inline md:ml-2 ${isEnded ? 'text-slate-400' : 'text-red-400'}`}>
        {isEnded ? "Round Ended" : "Remaining"}
      </span>
    </div>
  );
}

export function AutoRefresh({ initialRoundId }: { initialRoundId: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return;

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
            router.refresh(); 
          }
        }
      } catch (e) {}
    }, 10000);
    return () => clearInterval(interval);
  }, [router, initialRoundId]);
  return null;
}
