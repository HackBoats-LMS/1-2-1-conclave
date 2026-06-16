"use client";

import { useEffect, useState, useRef } from "react";

export function AdminLiveReferralsClient({ initialTotal }: { initialTotal: number }) {
  const [prevInitial, setPrevInitial] = useState(initialTotal);
  const [total, setTotal] = useState(initialTotal);
  const totalRef = useRef(initialTotal);

  if (initialTotal !== prevInitial) {
    setPrevInitial(initialTotal);
    setTotal(initialTotal);
    totalRef.current = initialTotal;
  }

  useEffect(() => {
    import("@/lib/supabaseClient").then(({ supabase }) => {
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
    });
  }, []);

  return (
    <div className="text-6xl font-black tracking-tight text-[#0D2421] py-4 bg-[#BEF03C]/10 border-2 border-dashed border-[#0D2421]/20 text-center rounded-2xl transition-all duration-300">
      {total}
    </div>
  );
}
