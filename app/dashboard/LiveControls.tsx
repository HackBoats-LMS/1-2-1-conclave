"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveControls({ 
  updatedAtTime, 
  durationMinutes = 15 
}: { 
  updatedAtTime: number; 
  durationMinutes?: number; 
}) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(`${durationMinutes.toString().padStart(2, '0')}:00`);
  const [isEnded, setIsEnded] = useState(false);

  // Removed all polling from live round to guarantee zero lag or infinite render loops.

  // Real-time custom countdown synchronized to when the Admin clicked Launch
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const elapsed = now - updatedAtTime;
      const totalDuration = durationMinutes * 60 * 1000; // custom mins in ms
      
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
  }, [updatedAtTime, durationMinutes]);

  return (
    <div className={`px-6 py-3.5 rounded-2xl font-black text-xl border-2 text-center transition-all ${isEnded ? 'bg-[#FAF8F4] text-[#0D2421]/40 border-[#0D2421]/30' : 'bg-[#0D2421] text-[#BEF03C] border-[#0D2421] shadow-[3px_3px_0px_#0D2421]'}`}>
      {timeLeft} 
      <span className={`text-xs font-black uppercase tracking-wider block md:inline md:ml-3 ${isEnded ? 'text-[#0D2421]/40' : 'text-[#BEF03C]'}`}>
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
