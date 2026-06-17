"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminLiveReferralsClient({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const totalRef = useRef(initialTotal);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }, [initialTotal]);

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

    const channel = supabase
      .channel("admin_live_referrals")
      .on("broadcast", { event: "referral_sent" }, () => {
        poll();
      })
      .on("broadcast", { event: "round_state_change" }, () => {
        poll();
      })
      .subscribe();

    const fallbackInterval = setInterval(poll, 60_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
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
      
    </div>
  );
}
