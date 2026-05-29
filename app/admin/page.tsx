import { prisma } from "@/lib/prisma";
import { initializeData, startRound, stopRound, pauseRound, resetAllRounds, clearReferrals, revokeAllAccess, uploadAssignmentsExcel, addManualUser, removeAllUsers, deleteUserAccount } from "./actions";
import { SuccessAlert } from "./SuccessAlert";
import { SubmitButton } from "../components/SubmitButton";
import { UploadForm } from "./UploadForm";

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

  // Calculate high-fidelity stats for dashboard counters
  const totalUsers = users.length;
  const approvedUsers = users.filter((u: any) => u.isApproved).length;
  const pendingOnboarding = users.filter((u: any) => u.isApproved && !u.onboardingCompleted).length;
  const completedOnboarding = approvedUsers - pendingOnboarding;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-6 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col">
      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <div className="max-w-7xl mx-auto w-full relative z-10 space-y-10">
        
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[10px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
              ADMIN MODULE / ORCHESTRATION LOBBY
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight pt-1">
              Admin Control Console
            </h1>
            <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wider">
              Configure conclave sessions, import matrices, and whitelist attendee credentials.
            </p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/dashboard"
              className="px-5 py-2.5 bg-[#BEF03C] hover:bg-[#A6DF2B] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer text-center"
            >
              Enter Dashboard
            </a>
          </div>
        </header>
        
        {/* Success Alert Banner */}
        {successMessage && <SuccessAlert initialMessage={successMessage} />}

        {/* Modular Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: Modular Stats Indicators */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* Stat Module 1: Live Connections */}
            <div className="bg-white border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest text-[#0D2421]/40 uppercase">01 / CONNECTION TELEMETRY</span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BEF03C] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#BEF03C] border border-[#0D2421]"></span>
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase">Live Referrals</h3>
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Digital referrals exchanged during rounds</p>
              </div>
              <div className="text-6xl font-black tracking-tight text-[#0D2421] py-4 bg-[#BEF03C]/10 border-2 border-dashed border-[#0D2421]/20 text-center rounded-2xl">
                {totalReferrals}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a 
                  href="/api/export"
                  className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Data
                </a>
                <form action={clearReferrals} className="flex-1">
                  <SubmitButton 
                    loadingText="Wiping..."
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-600 rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                  >
                    Wipe Data
                  </SubmitButton>
                </form>
              </div>
            </div>

            {/* Stat Module 2: Whitelist Health */}
            <div className="bg-white border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-4">
              <span className="text-[10px] font-black tracking-widest text-[#0D2421]/40 uppercase block">02 / CREDENTIAL HEALTH</span>
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase">Platform Access</h3>
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Approved logins vs registered database users</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-[#FAF8F4] p-4 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black">{approvedUsers}</div>
                  <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Approved</div>
                </div>
                <div className="bg-[#FAF8F4] p-4 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black">{totalUsers}</div>
                  <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Registered</div>
                </div>
              </div>
            </div>

            {/* Stat Module 3: Profile Progress */}
            <div className="bg-white border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-4">
              <span className="text-[10px] font-black tracking-widest text-[#0D2421]/40 uppercase block">03 / ONBOARDING INTEGRITY</span>
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase">Profile Completion</h3>
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Completed onboarding vs pending configuration</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-[#FAF8F4] p-4 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black text-emerald-600">{completedOnboarding}</div>
                  <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Completed</div>
                </div>
                <div className="bg-[#FAF8F4] p-4 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black text-amber-500">{pendingOnboarding}</div>
                  <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Pending</div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Session Orchestration and Rotation List */}
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-8">
              
              {/* Orchestrator Title Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-[#0D2421]">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase text-[#0D2421]">Session Rotations</h2>
                  <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Launch matching algorithms and control active countdowns</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slots.length > 0 && (
                    <>
                      <form action={revokeAllAccess}>
                        <SubmitButton loadingText="Revoking..." className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-600 rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                          Revoke Access
                        </SubmitButton>
                      </form>
                      <form action={resetAllRounds}>
                        <SubmitButton loadingText="Resetting..." className="px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                          Reset Progress
                        </SubmitButton>
                      </form>
                    </>
                  )}
                  {slots.length === 0 && (
                    <form action={initializeData}>
                      <SubmitButton loadingText="Initializing..." className="px-6 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                        Initialize Slots
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>

              {/* Upload Matrix Section */}
              {slots.length > 0 && <UploadForm />}

              {/* Slots and Rounds Grid Layout */}
              <div className="space-y-8">
                {slots.map((slot: any) => (
                  <div key={slot.id} className="border-2 border-[#0D2421] rounded-[2rem] overflow-hidden bg-[#FAF8F4] shadow-[4px_4px_0px_#0D2421]">
                    
                    {/* Slot Header */}
                    <div className="bg-[#0D2421] px-6 py-4 border-b-2 border-[#0D2421] flex justify-between items-center">
                      <span className="font-black text-sm text-[#BEF03C] tracking-widest uppercase">
                        SLOT COORDINATE: {slot.slotNumber}
                      </span>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                        {slot.rounds.length} ROUND MODULES
                      </span>
                    </div>

                    {/* Rounds 2x2 Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white">
                      {slot.rounds.map((round: any) => {
                        const isActive = gameState?.currentRoundId === round.id;
                        return (
                          <div 
                            key={round.id} 
                            className={`border-2 border-[#0D2421] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-[3px_3px_0px_#0D2421] transition-all ${
                              isActive ? 'bg-[#BEF03C]/10 border-[#0D2421]' : 'bg-[#FAF8F4]/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border-2 border-[#0D2421] shadow-[1.5px_1.5px_0px_#0D2421] ${
                                  isActive ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-white text-slate-500'
                                }`}>
                                  {round.roundNumber}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-black text-xs uppercase">Round {round.roundNumber}</h4>
                                  <span className="text-[9px] font-black text-[#0D2421]/40 uppercase tracking-widest">ROTATION PIN</span>
                                </div>
                              </div>

                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#0D2421] font-black text-[9px] uppercase shadow-[1px_1px_0px_#0D2421] ${
                                isActive ? 'bg-red-500 text-white animate-pulse' : round.status === 'COMPLETED' ? 'bg-[#0D2421] text-[#BEF03C]' : 'bg-white text-slate-500'
                              }`}>
                                {round.status}
                              </span>
                            </div>

                            {/* Round Action Buttons */}
                            <div className="pt-2 border-t border-[#0D2421]/10 flex gap-2">
                              {isActive ? (
                                <>
                                  <form action={pauseRound} className="flex-1">
                                    <input type="hidden" name="roundId" value={round.id} />
                                    <SubmitButton loadingText="Pausing..." className="w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-[#0D2421] bg-white hover:bg-slate-50 shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer">
                                      Pause
                                    </SubmitButton>
                                  </form>
                                  <form action={stopRound} className="flex-1">
                                    <input type="hidden" name="roundId" value={round.id} />
                                    <SubmitButton loadingText="Stopping..." className="w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-[#0D2421] bg-[#0D2421] text-[#BEF03C] shadow-[2px_2px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                                      Stop
                                    </SubmitButton>
                                  </form>
                                </>
                              ) : (
                                <form action={startRound} className="w-full">
                                  <input type="hidden" name="roundId" value={round.id} />
                                  <SubmitButton 
                                    loadingText="Launching..."
                                    className={`w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-[#0D2421] transition-all ${
                                      round.status === 'COMPLETED'
                                          ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                                          : 'bg-[#BEF03C] text-[#0D2421] hover:bg-[#A6DF2B] shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer'
                                    }`}
                                  >
                                    {round.status === 'COMPLETED' ? 'Session Finished' : 'Launch Round'}
                                  </SubmitButton>
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
                  <div className="text-center py-16 px-6 border-2 border-dashed border-[#0D2421]/30 rounded-[2rem] bg-[#FAF8F4] space-y-4">
                    <div className="w-16 h-16 bg-white border border-[#0D2421]/20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <svg className="w-8 h-8 text-[#0D2421]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-sm uppercase text-[#0D2421]/70">No slots initialized</p>
                      <p className="text-xs font-semibold text-[#0D2421]/50 uppercase tracking-wider">Initialize database coordinates above to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* User Management Section */}
        <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-[#0D2421]">
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase text-[#0D2421]">Credential Whitelist</h2>
              <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Manage registered accounts and database credentials</p>
            </div>
            <form action={removeAllUsers}>
              <SubmitButton 
                loadingText="Clearing..."
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-600 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] transition-all cursor-pointer"
              >
                Clear Database Members
              </SubmitButton>
            </form>
          </div>
          
          {/* Grant Access Manually */}
          <form action={addManualUser} className="bg-[#FAF8F4] p-6 rounded-2xl border-2 border-[#0D2421] shadow-[3px_3px_0px_#0D2421] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D2421]"></span>
              <span className="text-[10px] font-black tracking-widest text-[#0D2421] uppercase">ADD SINGLE ATTENDEE CREDENTIAL</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-[#0D2421]/60">Google Account Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                  placeholder="name@company.com" 
                  className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all placeholder:text-[#0D2421]/30" 
                />
              </div>
              <div className="w-full md:w-56 space-y-1.5">
                <label htmlFor="role" className="block text-xs font-black uppercase tracking-wider text-[#0D2421]/60">Security Role</label>
                <div className="relative">
                  <select 
                    id="role" 
                    name="role" 
                    className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="USER">Standard User Access</option>
                    <option value="ADMIN">Platform Admin Access</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#0D2421]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <SubmitButton loadingText="Granting..." className="w-full md:w-auto px-6 py-3.5 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                Grant Whitelist
              </SubmitButton>
            </div>
          </form>

          {/* Members Table */}
          <div className="overflow-x-auto border-2 border-[#0D2421] rounded-[2rem] bg-white shadow-[4px_4px_0px_#0D2421] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F4] border-b-2 border-[#0D2421]">
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Name / Email</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Business Details</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Login Whitelist</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Auth Level</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D2421]/15 text-xs">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-[#FAF8F4]/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-black text-sm text-[#0D2421]">{user.name || 'N/A'}</div>
                      <div className="text-[#0D2421]/60 font-semibold">{user.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-black text-sm text-[#0D2421]">{user.businessName || '-'}</div>
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">{user.businessCategory || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                        user.isApproved ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                        user.role === 'ADMIN' ? 'bg-[#0D2421] text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <form action={deleteUserAccount}>
                        <input type="hidden" name="userId" value={user.id} />
                        <SubmitButton title="Delete User" loadingText="..." className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#0D2421]/40 font-bold uppercase tracking-wider">No registered users in database</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
