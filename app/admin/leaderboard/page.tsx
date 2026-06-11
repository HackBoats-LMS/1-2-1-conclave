import React from "react";
import { prisma } from "@/lib/prisma";
import { LeaderboardTimerClient } from "./LeaderboardTimerClient";
import { BigShiftingTimerClient } from "./BigShiftingTimerClient";
import { LiveTotalCount } from "./LiveTotalCount";
import { LiveLeaderboardClient } from "./LiveLeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const totalReferrals = await prisma.referral.count();

  const topSenders = await prisma.user.findMany({
    where: { role: { in: ["USER", "CAPTAIN"] } },
    include: {
      _count: { select: { sentReferrals: true } },
    },
    orderBy: { sentReferrals: { _count: "desc" } },
    take: 10,
  });

  const gameState = await prisma.gameState.findFirst();
  let activeRound = null;
  if (gameState?.currentRoundId) {
    activeRound = await prisma.round.findUnique({
      where: { id: gameState.currentRoundId }
    });
  }

  const lastCompletedRound = await prisma.round.findFirst({
    where: { status: "COMPLETED" },
    orderBy: [{ slot: { slotNumber: 'desc' } }, { roundNumber: 'desc' }]
  });

  let computedLastRoundEndedAt: Date | null = null;
  if (lastCompletedRound?.endedAt) {
    computedLastRoundEndedAt = lastCompletedRound.endedAt;
  } else if (lastCompletedRound?.startTime) {
    // Fallback for older rounds before endedAt was added
    computedLastRoundEndedAt = new Date(lastCompletedRound.startTime.getTime() + lastCompletedRound.durationMinutes * 60000);
  }

  // Efficiently calculate per-round referral counts without hurting DB
  const rounds = await prisma.round.findMany({
    select: { roundNumber: true, startTime: true, status: true },
    orderBy: { roundNumber: "asc" }
  });

  const allReferralsTime = await prisma.referral.findMany({
    select: { createdAt: true }
  });

  const roundCounts: Record<number, number> = {};
  rounds.forEach(r => { roundCounts[r.roundNumber] = 0; });

  allReferralsTime.forEach((ref) => {
    let matchedRound = -1;
    for (let i = 0; i < rounds.length; i++) {
      const current = rounds[i];
      const next = rounds[i + 1];
      if (!current.startTime) continue;
      
      const refTime = ref.createdAt.getTime();
      const currTime = current.startTime.getTime();
      
      if (refTime >= currTime) {
        if (!next || !next.startTime || refTime < next.startTime.getTime()) {
          matchedRound = current.roundNumber;
          break;
        }
      }
    }
    if (matchedRound !== -1) {
      roundCounts[matchedRound]++;
    } else if (rounds.length > 0 && rounds[0].startTime && ref.createdAt.getTime() < rounds[0].startTime.getTime()) {
      roundCounts[rounds[0].roundNumber]++; // Catch pre-game referrals
    }
  });

  const roundStats = rounds
    .filter(r => r.startTime) // Only show rounds that have actually started
    .map(r => ({
      roundNumber: r.roundNumber,
      count: roundCounts[r.roundNumber] || 0
    }));

  const allRoundsCompleted = rounds.length > 0 && rounds.every(r => r.status === "COMPLETED") && !gameState?.currentRoundId;

  // Fetch next pending round for auto-start
  const nextPendingRound = gameState?.isAutoMode
    ? await prisma.round.findFirst({
        where: { status: "PENDING" },
        orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
        select: { id: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col h-screen max-h-screen">
      <BigShiftingTimerClient 
        lastRoundEndedAt={computedLastRoundEndedAt} 
        isRoundActive={!!activeRound}
        durationMinutes={gameState?.shiftDuration || 3}
        allRoundsCompleted={allRoundsCompleted}
        isAutoMode={!!gameState?.isAutoMode}
        nextRoundId={nextPendingRound?.id || null}
      />
      <LiveLeaderboardClient />

      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
      
      <style dangerouslySetInnerHTML={{ __html: `footer { display: none !important; }` }} />

      <div className="max-w-[1500px] mx-auto w-full relative z-10 flex flex-col h-full overflow-hidden">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-4 md:p-5 rounded-3xl shadow-[4px_4px_0px_#0D2421] gap-4 mb-4 shrink-0">
          <div className="space-y-1 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[9px] font-black tracking-widest uppercase shadow-[1px_1px_0px_#0D2421]">
              LIVE CONNECTION EVENT
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight pt-1">
              Referrals Dashboard
            </h1>
          </div>
          
          <div className="flex-1 flex justify-center items-center">
            <div className="flex items-center gap-2.5">
              <img 
                src="/hb-logo.png" 
                alt="HackBoats" 
                className="h-10 md:h-12 object-contain" 
                draggable={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF8F4] border-2 border-[#0D2421] px-4 py-2 rounded-2xl shadow-[2px_2px_0px_#0D2421] shrink-0">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-[#0D2421]"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]">Live Sync Active</span>
          </div>
        </header>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1 overflow-hidden min-h-0">
          
          {/* LEFT: TOTAL CONNECTIONS (Takes up 5 columns) */}
          <div className="md:col-span-5 bg-[#BEF03C] border-2 border-[#0D2421] rounded-3xl p-4 lg:p-6 shadow-[6px_6px_0px_#0D2421] flex flex-col relative overflow-hidden h-full">
            {/* Decorative background grid inside the box */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(13,36,33,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(13,36,33,0.05)_2px,transparent_2px)] bg-[size:24px_24px]"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              {/* TOP: LIVE TIMER */}
              <div className="flex justify-center mb-6">
                {activeRound ? (
                  <LeaderboardTimerClient
                    roundNumber={activeRound.roundNumber}
                    startedAt={activeRound.startTime}
                    durationMinutes={activeRound.durationMinutes}
                    status={activeRound.status}
                  />
                ) : (
                  <div className="flex items-center gap-3 bg-[#FAF8F4] border-2 border-[#0D2421] px-4 py-2 rounded-2xl shadow-[3px_3px_0px_#0D2421] shrink-0">
                    <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-[#0D2421]"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]">Standby Mode</span>
                  </div>
                )}
              </div>

              {/* MIDDLE: TOTAL COUNT */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#0D2421]/70 bg-white/50 px-5 py-2 rounded-2xl border-2 border-[#0D2421] shadow-[3px_3px_0px_#0D2421] inline-block mb-4 text-center">
                  Total Connections Made
                </h2>
                <LiveTotalCount initialTotal={totalReferrals} />
              </div>

              {/* BOTTOM: SCROLLABLE ROUND BREAKDOWN */}
              <div className="mt-6 bg-white/60 border-2 border-[#0D2421] rounded-2xl overflow-hidden shadow-[4px_4px_0px_#0D2421] flex flex-col max-h-[160px] lg:max-h-[220px] shrink-0">
                <div className="bg-[#0D2421] text-[#BEF03C] px-4 py-2 text-[10px] font-black tracking-widest uppercase text-center border-b-2 border-[#0D2421] shrink-0">
                  Connections per round
                </div>
                <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                  {roundStats.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {roundStats.map(stat => (
                        <div key={stat.roundNumber} className="bg-white border-2 border-[#0D2421] rounded-xl p-2.5 flex flex-col items-center justify-center shadow-[2px_2px_0px_#0D2421] hover:bg-[#BEF03C]/10 transition-colors">
                          <span className="text-[9px] font-black text-[#0D2421]/60 uppercase tracking-widest mb-1">
                            R{stat.roundNumber}
                          </span>
                          <span className="text-2xl font-black tabular-nums text-[#0D2421] leading-none">
                            {stat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs font-bold uppercase text-[#0D2421]/40 h-full flex items-center justify-center">
                      No rounds started yet
                    </div>
                  )}
                </div>
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
