"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminLiveReferralsClient({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    // Sync if initialTotal changes via server revalidation
    setTotal(initialTotal);
  }, [initialTotal]);

  useEffect(() => {
    // Subscribe to the global events channel to listen for referrals
    const channel = supabase.channel("global_events");

    channel.on("broadcast", { event: "new_referral" }, () => {
      // Optimistically increment the counter without hitting the database!
      setTotal((prev) => prev + 1);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="text-6xl font-black tracking-tight text-[#0D2421] py-4 bg-[#BEF03C]/10 border-2 border-dashed border-[#0D2421]/20 text-center rounded-2xl transition-all duration-300">
      {total}
    </div>
  );
}
