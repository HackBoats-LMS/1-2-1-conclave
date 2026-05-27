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
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
         <AutoRefresh initialRoundId={gameState?.currentRoundId || null} />
         <div className="bg-white border border-slate-200/60 p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center max-w-lg w-full">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Waiting Area</h1>
            <p className="text-slate-500">Please wait for the administrator to launch the round.</p>
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
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
         <AutoRefresh initialRoundId={gameState?.currentRoundId || null} />
         <div className="bg-white border border-slate-200/60 p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center max-w-lg w-full">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">No Assignment</h1>
            <p className="text-slate-500">You are not assigned to a table for Round {round?.roundNumber}. Please contact the admin.</p>
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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 p-4 md:p-8 font-sans selection:bg-blue-500/20">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-12 bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Round {round?.roundNumber} is Live
              </h1>
            </div>
            <p className="text-slate-500 font-medium">Table {myAssignment.table.tableNumber} • {tableUsers.length + 1} Members</p>
          </div>
          <LiveControls updatedAtTime={round?.startTime?.getTime() || Date.now()} />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tableUsers.map((tu: any) => {
            const user = tu.user;
            return (
              <div key={user.id} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                <div className="p-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner border border-blue-100">
                      {user.name?.charAt(0) || user.businessName?.charAt(0) || user.email?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-slate-800 truncate">{user.name || user.businessName || "Unnamed User"}</h3>
                      <p className="text-sm font-medium text-blue-600 truncate">{user.businessCategory || "Participant"}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 h-24 overflow-y-auto custom-scrollbar">
                    <p className="text-slate-600 text-sm leading-relaxed">{user.description || "No description provided by this user."}</p>
                  </div>
                  
                  <form action={sendReferral} className="space-y-3">
                    <input type="hidden" name="toUserId" value={user.id} />
                    <input type="text" name="note" placeholder="Add an optional note..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-inner" />
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]">
                      Send Referral
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          
          {tableUsers.length === 0 && (
             <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
               </div>
               <p className="font-medium text-slate-500">No other members assigned to this table yet.</p>
               <p className="text-sm mt-1">Wait for others to join or ask the admin to assign them.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
