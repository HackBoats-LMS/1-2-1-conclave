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
    // Listen for realtime leaderboard updates which now include totalReferrals
    const channel = supabase
      .channel("global_events")
      .on("broadcast", { event: "leaderboard_update" }, ({ payload }: any) => {
        if (payload?.totalReferrals !== undefined) {
          totalRef.current = payload.totalReferrals;
          setTotal(payload.totalReferrals);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
