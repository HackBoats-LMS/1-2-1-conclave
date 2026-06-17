"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Polls Supabase REST directly for the referral count every 60s as a fallback,
 * and updates instantly on realtime referral_sent events.
 * This is a Supabase-to-client call — it does NOT hit our Vercel server
 * or our Prisma connection pool at all. Zero cost to our backend.
 */
export function LiveTotalCount({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  const totalRef = useRef(initialTotal);

  useEffect(() => {
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }, [initialTotal]);

  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Poll Supabase PostgREST directly — bypasses Vercel and our DB pool entirely.
    // Only reads the Content-Range header (count), not row data.
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
          if (!isNaN(count) && count !== totalRef.current) {
            totalRef.current = count;
            setTotal(count);
          }
        }
      } catch (_) {}
    };

    const channel = supabase
      .channel("leaderboard_page_refresh_total")
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
