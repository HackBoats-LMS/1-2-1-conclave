import { SubmitButton } from "@/app/components/SubmitButton";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendReferral } from "./actions";
import { redirect } from "next/navigation";
import { LiveControls, AutoRefresh } from "./LiveControls";

export const dynamic = 'force-dynamic';

export default async function UserDashboard() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const gameState = await prisma.gameState.findFirst();
  
  if (!gameState?.currentRoundId) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Blueprint Dot Grid */}
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
              Please wait for the administrator to launch the next conclave round.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Find round info
  const round = await prisma.round.findUnique({
    where: { id: gameState.currentRoundId },
    include: { slot: true }
  });

  // Find user's table assignment for this round
  const myAssignment = await prisma.tableAssignment.findFirst({
    where: { userId: session.user.id, table: { roundId: gameState.currentRoundId } },
    include: { table: true }
  });

  if (!myAssignment) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Blueprint Dot Grid */}
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

  // Find other users at this table
  const tableUsers = await prisma.tableAssignment.findMany({
    where: { tableId: myAssignment.tableId, userId: { not: session.user.id } },
    include: { user: true }
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-6 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col">
      {/* Blueprint Dot Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <AutoRefresh initialRoundId={gameState.currentRoundId} />

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-12">
        
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-[#0D2421]"></span>
              </span>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                Round {round?.roundNumber} is Live
              </h1>
            </div>
            <p className="text-xs font-black uppercase text-[#0D2421]/60 tracking-wider">
              Table Assignment: {myAssignment.table.tableNumber} &bull; {tableUsers.length + 1} Table Members
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <LiveControls updatedAtTime={round?.startTime?.getTime() || Date.now()} />
          </div>
        </header>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tableUsers.map((tu: any) => {
            const user = tu.user;
            return (
              <div 
                key={user.id} 
                className="bg-white border-2 border-[#0D2421] rounded-[2rem] shadow-[6px_6px_0px_#0D2421] overflow-hidden hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#0D2421] transition-all flex flex-col justify-between"
              >
                <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-[#BEF03C] border-2 border-[#0D2421] text-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421] flex-shrink-0">
                        {user.name?.charAt(0) || user.businessName?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-lg uppercase truncate">{user.name || user.businessName || "Unnamed User"}</h3>
                        <p className="text-xs font-bold text-[#BEF03C] bg-[#0D2421] border border-[#0D2421] px-2 py-0.5 rounded inline-block uppercase truncate tracking-wide max-w-full">
                          {user.businessCategory || "Participant"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-[#FAF8F4] p-4 rounded-xl border border-[#0D2421]/15 h-28 overflow-y-auto">
                      <p className="text-[#0D2421]/80 text-xs font-semibold leading-relaxed">
                        {user.description || "No description provided by this user."}
                      </p>
                    </div>
                  </div>
                  
                  <form action={sendReferral} className="space-y-3 pt-4 border-t border-[#0D2421]/10 mt-4">
                    <input type="hidden" name="toUserId" value={user.id} />
                    <input 
                      type="text" 
                      name="note" 
                      placeholder="Add a connection note..." 
                      className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all placeholder:text-[#0D2421]/30 shadow-inner" 
                    />
                    <SubmitButton 
                      loadingText="Sending..."
                      className="w-full py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer"
                    >
                      Send Referral
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}
          
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
