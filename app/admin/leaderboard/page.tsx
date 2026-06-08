import React from "react";
import { prisma } from "@/lib/prisma";
import { LiveLeaderboardClient } from "./LiveLeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const totalReferrals = await prisma.referral.count();

  const topSenders = await prisma.user.findMany({
    where: { role: "USER" },
    include: {
      _count: { select: { sentReferrals: true } },
    },
    orderBy: { sentReferrals: { _count: "desc" } },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col h-screen max-h-screen">
      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
      
      <LiveLeaderboardClient />
      
      <div className="max-w-[1500px] mx-auto w-full relative z-10 flex flex-col h-full overflow-hidden">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-4 md:p-5 rounded-3xl shadow-[4px_4px_0px_#0D2421] gap-4 mb-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[9px] font-black tracking-widest uppercase shadow-[1px_1px_0px_#0D2421]">
              LIVE CONNECTION EVENT
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight pt-1">
              Referrals Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-[#FAF8F4] border-2 border-[#0D2421] px-4 py-2 rounded-2xl shadow-[2px_2px_0px_#0D2421]">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-[#0D2421]"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]">Live Sync Active</span>
          </div>
        </header>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1 overflow-hidden min-h-0">
          
          {/* LEFT: TOTAL CONNECTIONS (Takes up 5 columns) */}
          <div className="md:col-span-5 bg-[#BEF03C] border-2 border-[#0D2421] rounded-3xl p-4 lg:p-6 shadow-[6px_6px_0px_#0D2421] flex flex-col items-center justify-center text-center relative overflow-hidden h-full">
            {/* Decorative background grid inside the box */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(13,36,33,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(13,36,33,0.05)_2px,transparent_2px)] bg-[size:24px_24px]"></div>
            
            <div className="relative z-10 space-y-4">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#0D2421]/70 bg-white/50 px-5 py-2 rounded-2xl border-2 border-[#0D2421] shadow-[3px_3px_0px_#0D2421] inline-block mb-4">
                Total Connections Made
              </h2>
              <div className="text-8xl md:text-[10rem] lg:text-[12rem] font-black tracking-tighter leading-none tabular-nums text-[#0D2421] drop-shadow-[4px_4px_0px_rgba(255,255,255,0.7)] pt-2">
                {totalReferrals}
              </div>
            </div>
          </div>

          {/* RIGHT: LEADERBOARD GRID (Takes up 7 columns) */}
          <div className="md:col-span-7 bg-white border-2 border-[#0D2421] rounded-3xl p-4 md:p-5 shadow-[6px_6px_0px_#0D2421] flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b-2 border-[#0D2421] shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#0D2421] rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#BEF03C]">
                <span className="text-xl">🏆</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black uppercase text-[#0D2421] tracking-wide">
                Top Connectors
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-hidden p-2 content-start -m-2">
              {topSenders.map((user: any, index: number) => {
                const count = user._count.sentReferrals;
                if (count === 0 && index > 2) return null; // Hide 0s if they aren't top 3
                
                const isTop1 = index === 0;
                const isTop3 = index < 3;
                
                // Colors for 1st, 2nd, 3rd
                let rankStyle = "bg-[#FAF8F4] text-[#0D2421] border-[#0D2421] shadow-[1px_1px_0px_#0D2421]";
                if (index === 0) rankStyle = "bg-amber-400 text-[#0D2421] border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";
                if (index === 1) rankStyle = "bg-slate-200 text-[#0D2421] border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";
                if (index === 2) rankStyle = "bg-orange-500 text-white border-[#0D2421] shadow-[2px_2px_0px_#0D2421]";

                let cardStyle = "bg-white border-[#0D2421]/10 shadow-sm";
                if (isTop1) cardStyle = "bg-[#BEF03C]/20 border-[#0D2421] shadow-[3px_3px_0px_#0D2421]";
                else if (isTop3) cardStyle = "bg-[#FAF8F4] border-[#0D2421] shadow-[3px_3px_0px_#0D2421]";

                return (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-2.5 lg:p-3.5 rounded-xl border-2 transition-all shrink-0 ${cardStyle}`}
                  >
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
                      <div className="text-xl lg:text-2xl font-black tabular-nums text-[#0D2421] leading-none mb-1">
                        {count}
                      </div>
                      <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 bg-[#0D2421]/5 px-1.5 py-0.5 rounded-md">
                        Referrals
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {topSenders.length === 0 && (
                <div className="py-12 text-center text-[#0D2421]/30 font-bold uppercase tracking-widest border-2 border-dashed border-[#0D2421]/20 rounded-2xl bg-[#FAF8F4]">
                  No referrals generated yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
