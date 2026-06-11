"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function LiveTotalCount({ initialTotal }: { initialTotal: number }) {
  const router = useRouter();
  const [total, setTotal] = useState(initialTotal);
  const totalRef = useRef(initialTotal);

  useEffect(() => {
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }, [initialTotal]);

  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Poll Supabase REST every 2s — just fetches a count, no DB stress
    const interval = setInterval(async () => {
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
        // Supabase returns total count in Content-Range header: "0-0/TOTAL"
        const range = res.headers.get("content-range");
        if (range) {
          const count = parseInt(range.split("/")[1], 10);
          if (!isNaN(count) && count !== totalRef.current) {
            totalRef.current = count;
            setTotal(count);
          }
        }
      } catch (_) {}
    }, 2000);

    // Also keep round_state_change for timer refresh
    const channel = supabase
      .channel("global_events")
      .on("broadcast", { event: "round_state_change" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const len = total.toString().length;
  const sizeClass =
    len >= 4 ? "text-6xl md:text-7xl lg:text-[7rem]" :
    len === 3 ? "text-7xl md:text-8xl lg:text-[9rem]" :
    "text-8xl md:text-[10rem] lg:text-[12rem]";

  return (
    <div className={`${sizeClass} font-black tracking-tighter leading-none tabular-nums text-[#0D2421] drop-shadow-[4px_4px_0px_rgba(255,255,255,0.7)] transition-all text-center`}>
      {total}
    </div>
  );
}
