import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LiveControls, AutoRefresh } from "./LiveControls";
import { UserCard } from "./UserCard";
import { CaptainActiveRound } from "./CaptainActiveRound";
import { DownloadMyReferralsButton } from "./DownloadMyReferralsButton";
import { SelfSpeakerTimer } from "./SelfSpeakerTimer";

export const dynamic = 'force-dynamic';

export default async function UserDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fresh DB lookup — don't rely on stale JWT fields
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { isApproved: true, onboardingCompleted: true, role: true },
  });

  if (!dbUser || !dbUser.isApproved) redirect("/login?error=AccessDenied");

  const isProfileComplete = dbUser.onboardingCompleted;
  const userRole = dbUser.role;
  const isAdmin = userRole === "ADMIN";
  const isCaptain = userRole === "CAPTAIN";
  if (isAdmin) redirect("/admin");
  if (!isProfileComplete) redirect("/onboarding");

  const [gameState, totalRounds, completedRounds] = await Promise.all([
    prisma.gameState.findFirst(),
    prisma.round.count(),
    prisma.round.count({ where: { status: "COMPLETED" } })
  ]);

  // Check if all rounds are completed (Ending Page condition)
  const allRoundsCompleted = totalRounds > 0 && completedRounds === totalRounds;

  if (allRoundsCompleted) {
    // ── ENDING PAGE STATE ──
    const receivedReferrals = await prisma.referral.findMany({
      where: { toUserId: session.user.id },
      include: {
        fromUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const userName = session.user.name || session.user.email?.split("@")[0] || "User";

    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col items-center justify-center">
        {/* Blueprint Dot Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

        <AutoRefresh initialRoundId={gameState?.currentRoundId || null} userId={session.user.id as string} initialReferralCount={receivedReferrals.length} />

        <div className="max-w-3xl w-full relative z-10 space-y-8">
          
          {/* Ending Banner */}
          <div className="bg-gradient-to-r from-[#0D2421] to-[#1A3F3A] border-3 border-[#0D2421] p-8 rounded-[2rem] text-white text-center shadow-[8px_8px_0px_#BEF03C] space-y-4">
            <span className="text-[10px] font-black tracking-widest bg-[#BEF03C] text-[#0D2421] px-4 py-1.5 rounded-full border-2 border-[#0D2421] uppercase inline-block animate-bounce">
              🏁 CONCLAVE COMPLETED
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Session Concluded!</h1>
            <p className="text-sm font-medium text-white/70 max-w-lg mx-auto leading-relaxed">
              Great job networking! All slots and rounds are now fully completed. You can export your received referrals below for future connections.
            </p>
          </div>

          {/* Action Row */}
          <div className="bg-white border-3 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] flex flex-col items-center justify-between gap-6 sm:flex-row text-center sm:text-left">
            <div className="space-y-1">
              <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">01 / CONNECTION DATA</span>
              <h3 className="font-black text-xl uppercase text-[#0D2421]">Received Referrals</h3>
              <p className="text-xs font-bold text-[#0D2421]/60 uppercase tracking-wide">
                You collected {receivedReferrals.length} referral{receivedReferrals.length !== 1 ? 's' : ''} during the session.
              </p>
            </div>
            
            <DownloadMyReferralsButton 
              userName={userName}
              referrals={receivedReferrals}
            />
          </div>

          {/* Preview of referrals */}
          {receivedReferrals.length > 0 && (
            <div className="bg-white border-3 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] space-y-6">
              <div className="border-b-2 border-dashed border-[#0D2421]/15 pb-4">
                <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">02 / REFERRALS LIST PREVIEW</span>
                <h3 className="font-black text-lg uppercase text-[#0D2421]">Who Connected With You</h3>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {receivedReferrals.map((ref) => (
                  <div key={ref.id} className="bg-[#FAF8F4] border-2 border-[#0D2421] p-5 rounded-2xl shadow-[3px_3px_0px_#0D2421] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#BEF03C] border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-xs text-[#0D2421] flex-shrink-0">
                          {ref.fromUser.name?.charAt(0) || ref.fromUser.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase leading-tight">
                            {ref.fromUser.name || ref.fromUser.email?.split("@")[0]}
                          </p>
                          <p className="text-[9px] font-bold text-[#0D2421]/45 uppercase tracking-wide leading-none pt-0.5">
                            {ref.fromUser.businessCategory || "Participant"} • {ref.fromUser.businessName || "No Company"}
                          </p>
                        </div>
                      </div>
                      {ref.note ? (
                        <p className="text-xs font-bold text-[#0D2421]/75 bg-white border border-[#0D2421]/10 px-3 py-2 rounded-xl italic leading-relaxed">
                          &ldquo;{ref.note}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-[#0D2421]/30 italic px-1">
                          No notes left.
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-left md:text-right font-bold text-[10px] text-[#0D2421]/60 space-y-0.5 uppercase tracking-wide border-t md:border-t-0 border-[#0D2421]/10 pt-2 md:pt-0">
                      <p><span className="text-[#0D2421]/35">Email:</span> {ref.fromUser.email}</p>
                      {ref.fromUser.contactNumber && (
                        <p><span className="text-[#0D2421]/35">Phone:</span> {ref.fromUser.contactNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!gameState?.currentRoundId) {
    // ── WAITING ROOM STATE ──

    // Find the next PENDING round for all users, and the last completed round
    const [nextRound, lastCompletedRound] = await Promise.all([
      prisma.round.findFirst({
        where: { status: "PENDING" },
        orderBy: [{ slot: { slotNumber: 'asc' } }, { roundNumber: 'asc' }],
        include: { slot: true },
      }),
      prisma.round.findFirst({
        where: { status: "COMPLETED" },
        orderBy: [{ slot: { slotNumber: 'desc' } }, { roundNumber: 'desc' }]
      })
    ]);



    let upcomingAssignment = null;
    let upcomingMembers: any[] = [];
    let tableNumber: number | null = null;

    if (nextRound) {
      upcomingAssignment = await prisma.tableAssignment.findFirst({
        where: { userId: session.user.id, table: { roundId: nextRound.id } },
        include: { table: true },
      });

      if (upcomingAssignment) {
        tableNumber = upcomingAssignment.table.tableNumber;
        if (isCaptain) {
          // Captain perk: preview who is coming to their table
          upcomingMembers = await prisma.tableAssignment.findMany({
            where: { tableId: upcomingAssignment.tableId, userId: { not: session.user.id } },
            include: { user: true },
            orderBy: { isCaptain: 'desc' },
          });
        }
      }
    }

    // Captain pre-round view: show upcoming table members
    if (isCaptain) {

      return (
        <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
          
          <AutoRefresh initialRoundId={gameState?.currentRoundId || null} />
          
          <div className="max-w-lg w-full relative z-10 space-y-6">
            {/* Captain Badge */}
            <div className="bg-amber-500 border-2 border-amber-700 p-4 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <h2 className="font-black text-sm uppercase text-white tracking-wider">Table Captain Mode</h2>
                <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">
                  {tableNumber ? `Assigned to Table ${tableNumber}` : 'No assignment yet'}
                </p>
              </div>
            </div>

            {/* Waiting + Pre-round Info */}
            <div className="bg-white border-2 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-[#0D2421] border border-[#0D2421] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0px_#BEF03C]">
                  <svg className="w-7 h-7 text-[#BEF03C] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-[10px] font-black tracking-widest bg-[#0D2421] text-[#BEF03C] px-3 py-1 rounded-full border border-[#0D2421] uppercase inline-block">
                  STATUS / STANDBY
                </span>
                <h1 className="text-2xl font-black uppercase tracking-tight pt-2">Waiting for Round</h1>
                <p className="text-xs font-bold text-[#0D2421]/60 leading-relaxed uppercase tracking-wider">
                  {nextRound 
                    ? `Next: Slot ${nextRound.slot.slotNumber} / Round ${nextRound.roundNumber}`
                    : 'Waiting for admin to configure rounds'
                  }
                </p>
              </div>

              {/* Upcoming Table Members (Captain Perk) */}
              {upcomingMembers.length > 0 && (
                <div className="border-t-2 border-dashed border-[#0D2421]/20 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded-lg border border-amber-700 uppercase">
                        CAPTAIN PREVIEW
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-[#0D2421]/40 uppercase">
                      {upcomingMembers.length} member{upcomingMembers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {upcomingMembers.map((tu: any) => (
                      <div 
                        key={tu.user.id} 
                        className="flex items-center gap-3 bg-[#FAF8F4] border border-[#0D2421]/15 rounded-xl p-3"
                      >
                        <div className="w-9 h-9 bg-[#BEF03C] border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-sm text-[#0D2421] flex-shrink-0">
                          {tu.user.name?.charAt(0) || tu.user.email?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-xs uppercase truncate">{tu.user.name || tu.user.email}</p>
                          <p className="text-[10px] font-bold text-[#0D2421]/40 uppercase truncate">
                            {tu.user.businessCategory || tu.user.businessName || 'Participant'}
                          </p>
                        </div>
                        {tu.user.onboardingCompleted ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 flex-shrink-0" title="Profile completed"></span>
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600 flex-shrink-0" title="Profile pending"></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Regular user waiting room
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

        <AutoRefresh initialRoundId={gameState?.currentRoundId || null} />

        <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] text-center max-w-md w-full relative z-10 space-y-6">
          <div className="w-16 h-16 bg-[#0D2421] border border-[#0D2421] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0px_#BEF03C]">
            <svg className="w-8 h-8 text-[#BEF03C] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-[#0D2421] text-[#BEF03C] px-3 py-1 rounded-full border border-[#0D2421] uppercase">
              STATUS / STANDBY
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight pt-2">Waiting Area</h1>
            <p className="text-xs font-bold text-[#0D2421]/60 leading-relaxed uppercase tracking-wider">
              {nextRound 
                ? `Next: Slot ${nextRound.slot.slotNumber} / Round ${nextRound.roundNumber}`
                : 'Please wait for the administrator to launch the next conclave round.'
              }
            </p>
          </div>

          {/* Regular User Upcoming Table Preview */}
          {nextRound && upcomingAssignment && (
            <div className="border-t-2 border-dashed border-[#0D2421]/20 pt-6 mt-6">
              <div className="bg-[#BEF03C]/20 border-2 border-[#BEF03C] p-4 rounded-xl shadow-[4px_4px_0px_#0D2421] flex items-center gap-4 text-left">
                <div className="w-12 h-12 bg-[#BEF03C] rounded-xl flex items-center justify-center text-xl border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421] flex-shrink-0">
                  🏃
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60">Your Destination</p>
                  <p className="font-black text-lg uppercase text-[#0D2421]">For Round {nextRound.roundNumber}, TRAVEL to Table {upcomingAssignment.table.tableNumber}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE ROUND STATE ──

  const [round, myAssignment, nextRound] = await Promise.all([
    prisma.round.findUnique({
      where: { id: gameState.currentRoundId },
      include: { slot: true }
    }),
    prisma.tableAssignment.findFirst({
      where: { userId: session.user.id, table: { roundId: gameState.currentRoundId } },
      include: { table: true }
    }),
    prisma.round.findFirst({
      where: { status: "PENDING" },
      orderBy: [{ slot: { slotNumber: 'asc' } }, { roundNumber: 'asc' }]
    })
  ]);

  let nextAssignment = null;
  if (nextRound) {
    nextAssignment = await prisma.tableAssignment.findFirst({
      where: { userId: session.user.id, table: { roundId: nextRound.id } },
      include: { table: true }
    });
  }

  if (!myAssignment) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

        <AutoRefresh initialRoundId={gameState?.currentRoundId || null} />

        <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] text-center max-w-lg w-full relative z-10 space-y-6">
          <div className="w-14 h-14 bg-amber-500 border-2 border-[#0D2421] rounded-2xl flex items-center justify-center mx-auto text-white shadow-[3px_3px_0px_#0D2421]">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">No Table Assignment</h1>
            <p className="text-xs font-semibold text-[#0D2421]/60 leading-relaxed uppercase tracking-wider">
              You are not assigned to a table for Round {round?.roundNumber}. Please contact the conclave administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Find other users at this table (captains first)
  const tableUsers = await prisma.tableAssignment.findMany({
    where: { tableId: myAssignment.tableId, userId: { not: session.user.id } },
    include: { user: true },
    orderBy: { isCaptain: 'desc' }
  });

  const sentReferralUserIds = new Set(
    (await prisma.referral.findMany({
      where: { fromUserId: session.user.id as string, toUserId: { in: tableUsers.map(t => t.userId) } },
      select: { toUserId: true },
    })).map(r => r.toUserId)
  );

  if (isCaptain) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col">
        {/* Blueprint Dot Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

        <AutoRefresh initialRoundId={gameState.currentRoundId} />

        <div className="max-w-6xl mx-auto w-full relative z-10 space-y-12">
          {/* Header Block */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-[#0D2421]"></span>
                </span>
                <h1 className="text-3xl font-black uppercase tracking-tight">
                  Round {round?.roundNumber} is Live
                </h1>
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-xl border-2 border-amber-700 text-[10px] font-black uppercase shadow-[2px_2px_0px_#0D2421]">
                  👑 TABLE CAPTAIN
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-black uppercase tracking-wider text-[#0D2421]/60">
                <span className="bg-[#FAF8F4] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421]">
                  Table: {myAssignment.table.tableNumber}
                </span>
                <span className="hidden sm:inline text-[#0D2421]/30 font-bold">•</span>
                <span className="bg-[#FAF8F4] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421]">
                  {tableUsers.length + 1} Table Members
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <LiveControls 
                updatedAtTime={round?.startTime?.getTime() || 0} 
                durationMinutes={round?.durationMinutes}
                status={round?.status}
              />
            </div>
          </header>

          {/* Captain Dashboard Orchestrator */}
          {round && (
            <CaptainActiveRound 
              round={{
                id: round.id,
                roundNumber: round.roundNumber,
                startTime: round.startTime,
                durationMinutes: round.durationMinutes,
                status: round.status
              }}
              tableNumber={myAssignment.table.tableNumber}
              tableUsers={tableUsers}
              sessionUser={{
                id: session.user.id as string,
                email: session.user.email as string,
                name: session.user.name
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col">
      {/* Blueprint Dot Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <AutoRefresh initialRoundId={gameState.currentRoundId} />

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-12">

        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-[#0D2421]"></span>
              </span>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                Round {round?.roundNumber} is Live
              </h1>
              {isCaptain && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-xl border-2 border-amber-700 text-[10px] font-black uppercase shadow-[2px_2px_0px_#0D2421]">
                  👑 TABLE CAPTAIN
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-black uppercase tracking-wider text-[#0D2421]/60">
              <span className="bg-[#FAF8F4] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421]">
                Table: {myAssignment.table.tableNumber}
              </span>
              <span className="hidden sm:inline text-[#0D2421]/30 font-bold">•</span>
              <span className="bg-[#FAF8F4] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421]">
                {tableUsers.length + 1} Table Members
              </span>
              {myAssignment.isCaptain && (
                <>
                  <span className="hidden sm:inline text-[#0D2421]/30 font-bold">•</span>
                  <span className="inline-flex items-center gap-1.5 bg-[#BEF03C] text-[#0D2421] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] text-[10px] font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D2421] transition-all">
                    👑 Captain
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <LiveControls 
              updatedAtTime={round?.startTime?.getTime() || 0} 
              durationMinutes={round?.durationMinutes}
              status={round?.status}
            />
          </div>
        </header>

        {/* Up Next Banner */}
        {nextRound && nextAssignment && (
          <div className={`border-2 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_#0D2421] ${
            myAssignment.table.tableNumber === nextAssignment.table.tableNumber 
              ? 'bg-emerald-50 border-emerald-600' 
              : 'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421] ${
                myAssignment.table.tableNumber === nextAssignment.table.tableNumber 
                  ? 'bg-emerald-400' 
                  : 'bg-amber-400'
              }`}>
                {myAssignment.table.tableNumber === nextAssignment.table.tableNumber ? '⚓' : '🏃'}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/50">
                  ROUND {nextRound.roundNumber} PREVIEW
                </span>
                <h3 className="font-black text-lg uppercase text-[#0D2421]">
                  {myAssignment.table.tableNumber === nextAssignment.table.tableNumber 
                    ? `Stay at Table ${nextAssignment.table.tableNumber} for Round ${nextRound.roundNumber}` 
                    : `For Round ${nextRound.roundNumber}, TRAVEL to Table ${nextAssignment.table.tableNumber}`
                  }
                </h3>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold text-[#0D2421]/60 uppercase tracking-wide">
                {myAssignment.table.tableNumber === nextAssignment.table.tableNumber 
                  ? "You don't need to move when this round ends." 
                  : "Be ready to travel to your next table when the timer hits zero."}
              </p>
            </div>
          </div>
        )}

        {/* My Own Speaking Timer (Visible only when I am speaking) */}
        {!myAssignment.isCaptain && (
          <SelfSpeakerTimer 
            roundId={round?.id as string} 
            tableNumber={myAssignment.table.tableNumber} 
            userId={session.user.id as string} 
          />
        )}

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tableUsers.map((tu: any) => (
            <UserCard key={tu.user.id} tu={{ ...tu, table: myAssignment.table }} alreadyReferred={sentReferralUserIds.has(tu.userId)} />
          ))}
          {tableUsers.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#0D2421]/30 rounded-[2rem] bg-white space-y-4">
              <div className="w-16 h-16 bg-[#FAF8F4] border border-[#0D2421]/35 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-[#0D2421]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="font-black text-sm uppercase text-[#0D2421]/70">No other members assigned to this table yet</p>
                <p className="text-xs font-semibold text-[#0D2421]/50 uppercase tracking-wider">Please wait for partners to log in or ask the admin to allocate table coordinates.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
