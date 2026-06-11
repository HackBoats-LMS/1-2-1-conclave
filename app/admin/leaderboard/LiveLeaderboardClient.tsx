"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Sender {
  id: string;
  name: string | null;
  businessCategory: string | null;
  _count: { sentReferrals: number };
}

export function LiveLeaderboardClient({ initialSenders }: { initialSenders: Sender[] }) {
  const router = useRouter();
  const [senders, setSenders] = useState<Sender[]>(initialSenders);

  // Poll every 2s for live leaderboard updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/game-state", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.topSenders) setSenders(data.topSenders);
      } catch (_) {}
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Refresh page on round start so timer/server data updates
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard_page_refresh")
      .on("broadcast", { event: "round_state_change" }, ({ payload }: { payload: Record<string, string> }) => {
        if (payload?.action === "start") router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  if (senders.length === 0) {
    return (
      <div className="py-12 text-center text-[#0D2421]/30 font-bold uppercase tracking-widest border-2 border-dashed border-[#0D2421]/20 rounded-2xl bg-[#FAF8F4]">
        No referrals generated yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-hidden p-2 content-start -m-2">
      {senders.map((user, index) => {
        const count = user._count.sentReferrals;

        let rankStyle = "bg-[#FAF8F4] text-[#0D2421] border-[#0D2421] shadow-[1px_1px_0px_#0D2421]";
        if (index === 0) rankStyle = "bg-amber-400 text-[#0D2421] border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";
        if (index === 1) rankStyle = "bg-slate-200 text-[#0D2421] border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";
        if (index === 2) rankStyle = "bg-orange-500 text-white border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";

        let cardStyle = "bg-white border-[#0D2421]/10 shadow-sm";
        if (index === 0) cardStyle = "bg-[#BEF03C]/20 border-[#0D2421] shadow-[3px_3px_0px_#0D2421]";
        else if (index < 3) cardStyle = "bg-[#FAF8F4] border-[#0D2421] shadow-[3px_3px_0px_#0D2421]";

        return (
          <div key={user.id} className={`flex items-center justify-between p-2.5 lg:p-3.5 rounded-xl border-2 transition-all shrink-0 ${cardStyle}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center font-black text-sm lg:text-base border-2 ${rankStyle}`}>
                {index + 1}
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-sm lg:text-base font-black text-[#0D2421] leading-tight truncate">{user.name || "Anonymous"}</h4>
                <span className="text-[8.5px] lg:text-[9.5px] font-bold text-[#0D2421]/50 uppercase tracking-wider mt-0.5 truncate">
                  {user.businessCategory || "Participant"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 border-l-2 border-[#0D2421]/10 pl-3 lg:pl-4 ml-2">
              <div className="text-xl lg:text-2xl font-black tabular-nums text-[#0D2421] leading-none mb-1">{count}</div>
              <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 bg-[#0D2421]/5 px-1.5 py-0.5 rounded-md">
                Referrals
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
