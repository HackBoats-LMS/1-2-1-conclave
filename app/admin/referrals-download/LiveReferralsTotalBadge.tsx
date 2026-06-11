"use client";

import { useEffect, useState, useRef } from "react";

export function LiveReferralsTotalBadge({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  const totalRef = useRef(initialTotal);

  useEffect(() => {
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }, [initialTotal]);

  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center bg-[#BEF03C] border-2 border-[#0D2421] px-5 py-3 rounded-2xl shadow-[3px_3px_0px_#0D2421]">
      <span className="text-3xl font-black leading-none">{total}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 mt-0.5">Total Referrals</span>
    </div>
  );
}
