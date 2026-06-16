"use client";

import { useEffect, useState, useRef } from "react";

export function AdminLiveReferralsClient({ initialTotal }: { initialTotal: number }) {
  const [prevInitial, setPrevInitial] = useState(initialTotal);
  const [total, setTotal] = useState(initialTotal);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setLastUpdated(new Date());
  }, []);
  const [isFlashing, setIsFlashing] = useState(false);
  const totalRef = useRef(initialTotal);

  if (initialTotal !== prevInitial) {
    setPrevInitial(initialTotal);
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }

  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const poll = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/Referral?select=id`,
          {
            headers: {
              apikey: ANON_KEY,
              Authorization: `Bearer ${ANON_KEY}`,
              Prefer: "count=exact",
              Range: "0-0",
            },
            cache: "no-store",
          }
        );
        const range = res.headers.get("content-range");
        if (range) {
          const count = parseInt(range.split("/")[1], 10);
          if (!isNaN(count)) {
            setLastUpdated(new Date());
            if (count !== totalRef.current) {
              totalRef.current = count;
              setTotal(count);
              // Flash the counter to draw attention when count changes
              setIsFlashing(true);
              setTimeout(() => setIsFlashing(false), 1500);
            }
          }
        }
      } catch (_) {}
    };

    // Poll every 5 seconds (down from 2s to reduce noise, still near real-time)
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-2">
      <div
        className={`text-6xl font-black tracking-tight text-[#0D2421] py-4 border-2 border-dashed text-center rounded-2xl transition-all duration-500 ${
          isFlashing
            ? "bg-[#BEF03C]/40 border-[#0D2421] scale-105"
            : "bg-[#BEF03C]/10 border-[#0D2421]/20"
        }`}
      >
        {total}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        <span className="text-[9px] font-bold text-[#0D2421]/40 uppercase tracking-widest">
          Live • Updated {isMounted && lastUpdated ? formatTime(lastUpdated) : "--:--:--"}
        </span>
      </div>
    </div>
  );
}
