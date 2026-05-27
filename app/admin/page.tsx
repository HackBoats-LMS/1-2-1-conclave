import { prisma } from "@/lib/prisma";
import { initializeData, startRound, stopRound, pauseRound, resetAllRounds, clearReferrals, revokeAllAccess, uploadAssignmentsExcel } from "./actions";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const slots = await prisma.slot.findMany({
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    orderBy: { slotNumber: 'asc' }
  });
  
  const gameState = await prisma.gameState.findFirst();
  const totalReferrals = await prisma.referral.count();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 p-4 md:p-8 font-sans selection:bg-blue-500/20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Admin Console
          </h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">Manage conclave sessions, rounds, and participants.</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Live Stats */}
            <div className="bg-white border border-slate-200/60 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
              <h2 className="text-xl font-semibold mb-2 text-slate-800 relative z-10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                Live Referrals
              </h2>
              <div className="text-7xl font-black bg-gradient-to-br from-blue-600 to-emerald-500 bg-clip-text text-transparent my-6 relative z-10 drop-shadow-sm">
                {totalReferrals}
              </div>
              <div className="flex justify-between items-end relative z-10">
                <p className="text-slate-500 text-sm font-medium pb-2 flex-1">Total connections made in real-time</p>
                <div className="flex gap-2">
                  <a 
                    href="/api/export"
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export Data
                  </a>
                  <form action={clearReferrals}>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all shadow-sm flex items-center gap-2"
                    >
                      Clear Data
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200/60 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">Session Orchestration</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage slots, rounds, and table assignments.</p>
                </div>
                <div className="flex gap-3">
                  {slots.length > 0 && (
                    <>
                      <form action={revokeAllAccess}>
                        <button type="submit" className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full transition-all text-xs font-semibold hover:bg-red-100 border border-red-200 shadow-sm whitespace-nowrap">
                          Revoke All Access
                        </button>
                      </form>
                      <form action={resetAllRounds}>
                        <button type="submit" className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full transition-all text-xs font-semibold hover:bg-red-100 border border-red-200 shadow-sm whitespace-nowrap">
                          Reset Progress
                        </button>
                      </form>
                    </>
                  )}
                  <form action={uploadAssignmentsExcel} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-sm">
                    <input 
                      type="file" 
                      name="file"
                      accept=".xlsx,.xls,.csv"
                      required
                      className="w-48 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-full transition-all text-xs font-semibold hover:bg-indigo-700">
                      Upload Assignments
                    </button>
                  </form>

                  {slots.length === 0 && (
                    <form action={initializeData}>
                      <button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all text-sm font-medium shadow-md">
                        Initialize Empty Database
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {slots.map((slot: any) => (
                  <div key={slot.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-bold text-slate-700 tracking-wide">
                      SLOT {slot.slotNumber}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {slot.rounds.map((round: any) => {
                        const isActive = gameState?.currentRoundId === round.id;
                        return (
                          <div key={round.id} className={`flex items-center justify-between p-6 transition-all ${isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                            <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                {round.roundNumber}
                              </div>
                              <div>
                                <p className={`font-semibold text-lg ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>Round {round.roundNumber}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="flex h-2 w-2 relative">
                                    {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-blue-500' : round.status === 'COMPLETED' ? 'bg-slate-300' : 'bg-slate-200'}`}></span>
                                  </span>
                                  <p className={`text-xs uppercase tracking-wider font-semibold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{round.status}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isActive ? (
                                <>
                                  <form action={pauseRound}>
                                    <input type="hidden" name="roundId" value={round.id} />
                                    <button type="submit" className="px-4 py-2 text-sm rounded-xl font-semibold border bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 transition-all shadow-sm">
                                      Pause
                                    </button>
                                  </form>
                                  <form action={stopRound}>
                                    <input type="hidden" name="roundId" value={round.id} />
                                    <button type="submit" className="px-4 py-2 text-sm rounded-xl font-semibold border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-all shadow-sm">
                                      Stop
                                    </button>
                                  </form>
                                </>
                              ) : (
                                <form action={startRound}>
                                  <input type="hidden" name="roundId" value={round.id} />
                                  <button 
                                    type="submit" 
                                    disabled={round.status === 'COMPLETED'}
                                    className={`px-6 py-2.5 text-sm rounded-xl transition-all font-semibold border ${
                                      round.status === 'COMPLETED'
                                          ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                                    }`}
                                  >
                                    {round.status === 'COMPLETED' ? 'Finished' : 'Launch Round'}
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                {slots.length === 0 && (
                  <div className="text-center py-20 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <p className="text-slate-600 font-medium mb-2">No meeting structure exists.</p>
                    <p className="text-slate-500 text-sm">Initialize the database to generate slots and rounds.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
