import { prisma } from "@/lib/prisma";
import { initializeData, startRound, stopRound, pauseRound, resetAllRounds, clearReferrals, revokeAllAccess, uploadAssignmentsExcel, addManualUser, removeAllUsers, deleteUserAccount } from "./actions";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const addedCount = resolvedParams?.added;
  const successAction = resolvedParams?.success;

  let successMessage = "";
  if (successAction === "uploaded_assignments" && addedCount) {
    successMessage = `Successfully processed and granted access to ${addedCount} unique user accounts!`;
  } else if (successAction === "cleared_referrals") {
    successMessage = "Live referrals data has been successfully cleared!";
  } else if (successAction === "cleared_members") {
    successMessage = "All non-admin members have been successfully removed!";
  } else if (successAction === "initialized") {
    successMessage = "Database has been successfully initialized with empty tables and rounds!";
  } else if (successAction === "deleted_user") {
    successMessage = "User account has been permanently deleted!";
  } else if (successAction === "added_user") {
    successMessage = "User has been manually added and granted access!";
  } else if (addedCount) {
    successMessage = `Successfully processed and granted access to ${addedCount} unique user accounts from the uploaded file!`;
  }

  const slots = await prisma.slot.findMany({
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    orderBy: { slotNumber: 'asc' }
  });
  
  const gameState = await prisma.gameState.findFirst();
  const totalReferrals = await prisma.referral.count();
  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' }
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 p-4 md:p-8 font-sans selection:bg-blue-500/20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Admin Console
          </h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">Manage conclave sessions, rounds, and participants.</p>
        </header>
        
        {successMessage && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

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

        {/* User Management Section */}
        <div className="mt-8">
          <div className="bg-white border border-slate-200/60 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-slate-800">Access & Member Management</h2>
              <form action={removeAllUsers}>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all shadow-sm border border-red-200 whitespace-nowrap"
                >
                  Clear All Members
                </button>
              </form>
            </div>
            
            <form action={addManualUser} className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Grant Access Manually</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1.5">User Email</label>
                  <input suppressHydrationWarning type="email" id="email" name="email" required placeholder="name@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div className="w-full sm:w-48">
                  <label htmlFor="role" className="block text-xs font-semibold text-slate-500 mb-1.5">Access Level</label>
                  <select id="role" name="role" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                    <option value="USER">Member Login</option>
                    <option value="ADMIN">Admin Access</option>
                  </select>
                </div>
                <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm whitespace-nowrap shadow-sm">
                  Grant Access
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="pb-3 px-4 font-semibold">Name / Email</th>
                    <th className="pb-3 px-4 font-semibold">Business</th>
                    <th className="pb-3 px-4 font-semibold text-center">Status</th>
                    <th className="pb-3 px-4 font-semibold text-center">Role</th>
                    <th className="pb-3 px-4 font-semibold text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{user.name || 'N/A'}</div>
                        <div className="text-slate-500 text-xs">{user.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-700">{user.businessName || '-'}</div>
                        <div className="text-slate-400 text-xs">{user.businessCategory || '-'}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {user.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <form action={deleteUserAccount}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button type="submit" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
