import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";
import { cookies } from "next/headers";
import { startRound, stopRound, pauseRound, resetAllRounds, clearReferrals, addManualUser, removeAllUsers, deleteUserAccount, clearAssignments, updateAllRoundsDuration, updateShiftDuration, toggleAutoMode, toggleOpenLogins, endConclave } from "./actions";
import { EndConclaveButton } from "./EndConclaveButton";
import { SuccessAlert } from "./SuccessAlert";
import { SubmitButton } from "../components/SubmitButton";
import { DeleteUserButton } from "./DeleteUserButton";
import { SecureAdminButton } from "./SecureAdminButton";
import { MemberUploadForm } from "./MemberUploadForm";
import { CaptainUploadForm } from "./CaptainUploadForm";
import { AssignmentPreview } from "./AssignmentPreview";
import { ReferralsExportButtons } from "./ReferralsExportButtons";
import { RefreshButton } from "./RefreshButton";
import { ClientTimer } from "./ClientTimer";
import { AutoGenerateClient } from "./AutoGenerateClient";
import { UserSearchFilter } from "./UserSearchFilter";
import { OnboardingExportButton } from "./OnboardingExportButton";
import { ClearMembersWarningButton } from "./ClearMembersWarningButton";

import { EditUserRoleButton } from "./EditUserRoleButton";


import { AdminLiveReferralsClient } from "./AdminLiveReferralsClient";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const cookieStore = await cookies();
  
  // Read success/error from cookies (set by server actions, auto-expire in 5s)
  let successAction = cookieStore.get('admin_success')?.value || "";
  const errorAction = cookieStore.get('admin_error')?.value || "";
  
  let addedCount: string | undefined;
  
  // Parse compound cookie values like "uploaded_whitelist&added=5"
  if (successAction.includes('&added=')) {
    const parts = successAction.split('&added=');
    successAction = parts[0];
    addedCount = parts[1];
  }

  let successMessage = "";
  const reassignWarning = " IMPORTANT: If you have already generated rounds, you must re-generate assignments to apply these member changes!";

  if (successAction === "uploaded_whitelist" && addedCount) {
    successMessage = `Successfully whitelisted ${addedCount} member email(s)!${reassignWarning}`;
  } else if (successAction === "uploaded_captains" && addedCount) {
    successMessage = `Successfully registered ${addedCount} captain(s)!${reassignWarning}`;
  } else if (successAction === "generated") {
    successMessage = "Round assignments have been auto-generated! Review the matrix below.";
  } else if (successAction === "cleared_assignments") {
    successMessage = "All assignment data (slots, rounds, tables) has been cleared!";
  } else if (successAction === "cleared_referrals") {
    successMessage = "Live referrals data has been successfully cleared!";
  } else if (successAction === "cleared_members") {
    successMessage = `All non-admin members and captains have been removed!${reassignWarning}`;
  } else if (successAction === "deleted_user") {
    successMessage = `User account has been permanently deleted!${reassignWarning}`;
  } else if (successAction === "added_user") {
    successMessage = `User has been manually added and granted access!${reassignWarning}`;
  } else if (successAction === "updated_durations") {
    successMessage = "Successfully updated the duration for all rounds!";
  } else if (successAction === "ended_conclave") {
    successMessage = "Conclave has been concluded! All rounds marked as completed.";
  } else if (successAction === "updated_shift_duration") {
    successMessage = "Successfully updated the shifting duration!";
  } else if (successAction === "toggled_mode") {
    successMessage = "Successfully switched mode!";
  }

  let errorMessage = "";
  if (errorAction) {
    errorMessage = String(errorAction);
  }

  // ── Data Fetching (batched queries) ──
  const [slots, gameState, totalReferrals, allUsers] = await Promise.all([
    prisma.slot.findMany({
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      orderBy: { slotNumber: 'asc' }
    }),
    prisma.gameState.findFirst(),
    prisma.referral.count(),
    prisma.user.findMany({ orderBy: { email: 'asc' } })
  ]);

  const searchQuery = (resolvedParams?.search as string)?.toLowerCase() || "";
  const users = allUsers.filter(u => {
    if (!searchQuery) return true;
    return (
      u.email?.toLowerCase().includes(searchQuery) ||
      u.name?.toLowerCase().includes(searchQuery) ||
      u.businessName?.toLowerCase().includes(searchQuery) ||
      u.businessCategory?.toLowerCase().includes(searchQuery) ||
      u.group?.toLowerCase().includes(searchQuery)
    );
  });

  // ── Calculate Stats ──
  const allOrderedRounds = slots.flatMap(s => s.rounds);
  const activeRound = allOrderedRounds.find(r => r.id === gameState?.currentRoundId);
  
  let lastCompletedRoundEndedAt: Date | null = null;
  let nextRoundId: string | null = null;
  if (!gameState?.currentRoundId && gameState?.isAutoMode) {
    const completedRounds = allOrderedRounds.filter(r => r.status === 'COMPLETED');
    const lastCompletedRound = completedRounds[completedRounds.length - 1];
    if (lastCompletedRound?.startTime) {
      lastCompletedRoundEndedAt = new Date(lastCompletedRound.startTime.getTime() + (lastCompletedRound.durationMinutes * 60000));
    }
    const pendingRound = allOrderedRounds.find(r => r.status === 'PENDING');
    if (pendingRound) {
      nextRoundId = pendingRound.id;
    }
  }
  
  // Find current global duration
  let currentDuration = 15;
  if (slots.length > 0 && slots[0].rounds.length > 0) {
    currentDuration = slots[0].rounds[0].durationMinutes || 15;
  }
  const totalUsers = users.length;
  const approvedUsers = users.filter((u: User) => u.isApproved).length;
  const pendingOnboarding = users.filter((u: User) => u.isApproved && !u.onboardingCompleted).length;
  const completedOnboarding = approvedUsers - pendingOnboarding;
  const captainCount = users.filter((u: User) => u.role === "CAPTAIN").length;
  const memberCount = users.filter((u: User) => u.role === "USER" && u.isApproved).length;
  const hasAssignments = slots.length > 0;

  // ── Build Assignment Preview Data (only if assignments exist) ──
  let previewData = null;
  if (hasAssignments) {
    // 1. Map existing slots/rounds into memory to avoid heavy database JOINs
    const roundInfoMap = new Map<string, { slotNumber: number; roundNumber: number; status: string }>();
    for (const s of slots) {
      for (const r of s.rounds) {
        roundInfoMap.set(r.id, { slotNumber: s.slotNumber, roundNumber: r.roundNumber, status: r.status });
      }
    }

    // 2. Fetch assignments minimally without deeply joining round and slot
    const allAssignments = await prisma.tableAssignment.findMany({
      select: {
        userId: true,
        tableId: true,
        isCaptain: true,
        user: {
          select: { id: true, email: true, name: true, businessName: true, businessCategory: true }
        },
        table: {
          select: { tableNumber: true, roundId: true }
        }
      }
    });

    // Build preview structure
    const slotMap = new Map<number, {
      slotNumber: number;
      rounds: Map<number, {
        roundNumber: number;
        status: string;
        tables: Map<number, {
          tableNumber: number;
          users: { id: string; email: string; name: string | null; businessName: string | null; businessCategory: string | null; isCaptain: boolean }[];
        }>;
      }>;
    }>();

    for (const assignment of allAssignments) {
      const roundInfo = roundInfoMap.get(assignment.table.roundId);
      if (!roundInfo) continue;
      
      const slotNum = roundInfo.slotNumber;
      const roundNum = roundInfo.roundNumber;
      const roundStatus = roundInfo.status;
      const tableNum = assignment.table.tableNumber;

      if (!slotMap.has(slotNum)) {
        slotMap.set(slotNum, { slotNumber: slotNum, rounds: new Map() });
      }
      const slotEntry = slotMap.get(slotNum)!;

      if (!slotEntry.rounds.has(roundNum)) {
        slotEntry.rounds.set(roundNum, { roundNumber: roundNum, status: roundStatus, tables: new Map() });
      }
      const roundEntry = slotEntry.rounds.get(roundNum)!;

      if (!roundEntry.tables.has(tableNum)) {
        roundEntry.tables.set(tableNum, { tableNumber: tableNum, users: [] });
      }
      const tableEntry = roundEntry.tables.get(tableNum)!;

      tableEntry.users.push({
        id: assignment.user.id,
        email: assignment.user.email || '',
        name: assignment.user.name,
        businessName: assignment.user.businessName,
        businessCategory: assignment.user.businessCategory,
        isCaptain: assignment.isCaptain,
      });
    }

    // Convert Maps to sorted arrays
    const previewSlots = Array.from(slotMap.values())
      .sort((a, b) => a.slotNumber - b.slotNumber)
      .map(s => ({
        slotNumber: s.slotNumber,
        rounds: Array.from(s.rounds.values())
          .sort((a, b) => a.roundNumber - b.roundNumber)
          .map(r => ({
            roundNumber: r.roundNumber,
            status: r.status,
            tables: Array.from(r.tables.values())
              .sort((a, b) => a.tableNumber - b.tableNumber)
              .map(t => ({
                tableNumber: t.tableNumber,
                users: t.users.sort((a, b) => (a.isCaptain === b.isCaptain ? 0 : a.isCaptain ? -1 : 1)),
              })),
          })),
      }));

    // ── Coverage Analytics (computed in-memory from DB data) ──
    const memberUsers: User[] = users.filter((u: User) => u.role === "USER" && u.isApproved);
    const memberIdSet = new Set<string>(memberUsers.map((u: User) => u.id));
    const memberEmailMap = new Map<string, string>(memberUsers.map((u: User) => [u.id, u.email as string] as [string, string]));

    const captainUsers = users.filter((u: User) => u.role === "CAPTAIN");
    const captainIdSet = new Set<string>(captainUsers.map((u: User) => u.id));
    const captainEmailMap = new Map<string, string>(captainUsers.map((u: User) => [u.id, u.email as string] as [string, string]));

    // Build meeting matrix from assignments
    const met = new Map<string, Set<string>>();
    for (const id of memberIdSet) met.set(id, new Set());
    for (const id of captainIdSet) met.set(id, new Set());

    // Track which members appear in at least one assignment
    const assignedMembers = new Set<string>();

    for (const assignment of allAssignments) {
      if (!assignment.isCaptain && memberIdSet.has(assignment.userId)) {
        assignedMembers.add(assignment.userId);
      }
    }

    // Group assignments by round+table to find who met whom (both members and captains)
    const tableGroups = new Map<string, string[]>();
    for (const assignment of allAssignments) {
      const key = `${assignment.table.roundId}|${assignment.tableId}`;
      if (!tableGroups.has(key)) tableGroups.set(key, []);
      tableGroups.get(key)!.push(assignment.userId);
    }

    for (const group of tableGroups.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          met.get(group[i])?.add(group[j]);
          met.get(group[j])?.add(group[i]);
        }
      }
    }

    // total possible unique pairs: M*(M-1)/2 (member-member) + M*C (member-captain)
    const totalPairs = (memberUsers.length * (memberUsers.length - 1) / 2) + (memberUsers.length * captainCount);
    const metPairsSet = new Set<string>();

    const memberArr: string[] = Array.from(memberIdSet);
    for (let i = 0; i < memberArr.length; i++) {
      const m1 = memberArr[i];
      // member-member
      for (let j = i + 1; j < memberArr.length; j++) {
        const m2 = memberArr[j];
        if (met.get(m1)?.has(m2)) {
          metPairsSet.add(`${m1}|${m2}`);
        }
      }
      // member-captain
      for (const c of captainIdSet) {
        if (met.get(m1)?.has(c)) {
          metPairsSet.add(`${m1}|${c}`);
        }
      }
    }
    const metPairs = metPairsSet.size;

    // Find unmet pairs (limit to 200 for display)
    const unmetPairs: { member1Email: string; member2Email: string }[] = [];
    
    // Member-member unmet pairs
    for (let i = 0; i < memberArr.length && unmetPairs.length < 200; i++) {
      for (let j = i + 1; j < memberArr.length && unmetPairs.length < 200; j++) {
        if (!met.get(memberArr[i])?.has(memberArr[j])) {
          unmetPairs.push({
            member1Email: memberEmailMap.get(memberArr[i]) || memberArr[i],
            member2Email: memberEmailMap.get(memberArr[j]) || memberArr[j],
          });
        }
      }
    }

    // Member-captain unmet pairs
    for (let i = 0; i < memberArr.length && unmetPairs.length < 200; i++) {
      for (const c of captainIdSet) {
        if (unmetPairs.length >= 200) break;
        if (!met.get(memberArr[i])?.has(c)) {
          unmetPairs.push({
            member1Email: memberEmailMap.get(memberArr[i]) || memberArr[i],
            member2Email: `Captain: ${captainEmailMap.get(c) || c}`,
          });
        }
      }
    }

    // Find left out members
    const leftOutMembers = memberArr
      .filter(id => !assignedMembers.has(id))
      .map(id => memberEmailMap.get(id) || id);

    previewData = {
      slots: previewSlots,
      analytics: {
        totalMembers: memberUsers.length,
        totalCaptains: captainCount,
        totalRounds: slots.reduce((sum, s) => sum + s.rounds.length, 0),
        totalSlots: slots.length,
        totalPairs,
        metPairs,
        coveragePercent: totalPairs > 0 ? Math.round(metPairs / totalPairs * 10000) / 100 : 100,
        unmetPairs,
        leftOutMembers,
        totalReferrals,
      },
    };
  }

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
              Upload members & captains, auto-generate assignments, and control live rounds.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-[#0D2421]/50 uppercase tracking-widest mt-1">Powered by</span>
              <img 
                src="/hb-logo.png" 
                alt="HackBoats Logo" 
                className="h-8 md:h-10 object-contain hover:scale-105 transition-transform duration-300"
                draggable={false}
              />
            </div>

            <div className="flex gap-2 mt-2 flex-wrap justify-end">
              <SecureAdminButton 
                action={toggleOpenLogins}
                label={gameState?.isOpenLogins ? '🔓 Open Logins: ON' : '🔒 Open Logins: OFF'}
                loadingText="Switching..."
                promptText="Enter Admin Pin to toggle open logins:"
                className={`border-2 border-[#0D2421] px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0D2421] transition-all flex items-center gap-2 cursor-pointer ${
                  gameState?.isOpenLogins ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-white text-slate-500'
                }`}
              >
                <input type="hidden" name="isOpenLogins" value={gameState?.isOpenLogins ? "false" : "true"} />
              </SecureAdminButton>
              <a href="/admin/leaderboard" target="_blank" className="bg-[#BEF03C] text-[#0D2421] border-2 border-[#0D2421] px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0D2421] transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Live Leaderboard
              </a>
              <a href="/admin/archive" className="bg-white hover:bg-slate-50 text-[#0D2421] border-2 border-[#0D2421] px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0D2421] transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Archive Center
              </a>
            </div>
          </div>
        </header>
        
        {/* Success Alert Banner */}
        {successMessage && <SuccessAlert initialMessage={successMessage} />}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-red-100 border-2 border-[#0D2421] p-4 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex items-center justify-between gap-3 relative z-20">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-black text-xs uppercase tracking-wide text-left text-red-700">{errorMessage}</span>
            </div>
            <a 
              href="/admin"
              className="text-[#0D2421]/60 hover:text-[#0D2421] font-black text-xs uppercase cursor-pointer flex-shrink-0 border-b border-[#0D2421]/30 hover:border-[#0D2421]"
            >
              Dismiss
            </a>
          </div>
        )}

        {/* ── UPLOAD & GENERATE SECTION ── */}
        <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-[#0D2421]">
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase text-[#0D2421]">Import & Generate</h2>
              <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Upload email lists, then auto-generate round assignments</p>
            </div>
            {/* Pre-flight info */}
            <div className="flex items-center gap-3 text-right">
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase text-[#0D2421]/40 tracking-widest">Ready to Generate</div>
                <div className="text-xs font-black text-[#0D2421]">
                  {captainCount} captain{captainCount !== 1 ? 's' : ''} × {memberCount} member{memberCount !== 1 ? 's' : ''}
                  {captainCount > 0 && memberCount > 0 && (
                    <span className="text-[#0D2421]/40"> → {captainCount} tables</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Zones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MemberUploadForm />
            <CaptainUploadForm />
          </div>

          {/* Generate Button */}
          <div className="border-t-2 border-dashed border-[#0D2421]/20 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <AutoGenerateClient captainCount={captainCount} memberCount={memberCount} currentDuration={currentDuration} />

              {hasAssignments && (
                <SecureAdminButton 
                  action={clearAssignments}
                  label="Clear Assignments"
                  loadingText="Clearing..."
                  promptText="Enter Admin Pin to clear assignments:"
                  className="px-5 py-3.5 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer whitespace-nowrap text-center"
                  formClassName="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                />
              )}
            </div>

           
          </div>
        </div>

        {/* ── ASSIGNMENT PREVIEW (shown after generation) ── */}
        {previewData && <AssignmentPreview slots={previewData.slots} analytics={previewData.analytics} />}

        {/* ── STATS + ROUND CONTROLS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: Stats */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* Stat: Live Connections */}
            <div className="bg-white border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest text-[#0D2421]/40 uppercase">01 / CONNECTION TELEMETRY</span>
                <div className="flex items-center gap-3">
                  <RefreshButton />
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BEF03C] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#BEF03C] border border-[#0D2421]"></span>
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase">Live Referrals</h3>
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Digital referrals exchanged during rounds</p>
              </div>
              <AdminLiveReferralsClient initialTotal={totalReferrals} />
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <ReferralsExportButtons />
                <SecureAdminButton 
                  action={clearReferrals}
                  label="Wipe Data"
                  loadingText="Wiping..."
                  promptText="Enter Admin Pin to wipe live referrals data:"
                  className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-[#0D2421] rounded-xl font-black text-[10px] uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  formClassName="flex-1 w-full"
                />
              </div>
            </div>

            {/* Stat: Platform Access */}
            <div className="bg-white border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-4">
              <span className="text-[10px] font-black tracking-widest text-[#0D2421]/40 uppercase block">02 / CREDENTIAL HEALTH</span>
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase">Platform Access</h3>
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Members, captains, and admin accounts</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#FAF8F4] p-3 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black">{memberCount}</div>
                  <div className="text-[8px] font-black text-[#0D2421]/50 uppercase tracking-wider">Members</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-500 text-center">
                  <div className="text-2xl font-black text-amber-600">{captainCount}</div>
                  <div className="text-[8px] font-black text-amber-600/60 uppercase tracking-wider">Captains</div>
                </div>
                <div className="bg-[#FAF8F4] p-3 rounded-2xl border-2 border-[#0D2421] text-center">
                  <div className="text-2xl font-black">{totalUsers}</div>
                  <div className="text-[8px] font-black text-[#0D2421]/50 uppercase tracking-wider">Total</div>
                </div>
              </div>
            </div>

            {/* Stat: Onboarding */}
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

          {/* RIGHT COLUMN: Round Controls */}
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-8">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-[#0D2421]">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase text-[#0D2421]">Session Rotations</h2>
                  <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Launch rounds and control active countdowns</p>
                </div>
              </div>

              {/* Controls Grid */}
              {slots.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Timing Settings Card (Left) */}
                  <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-5 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-[#0D2421]/15">
                      <span className="text-sm">⏱️</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#0D2421]">Timing Configurations</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Round Duration Form */}
                      <form action={updateAllRoundsDuration} className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#0D2421]/50">Round Duration</label>
                        <div className="flex gap-2">
                          <input 
                            key={`dur-${currentDuration}`}
                            type="number" 
                            name="duration" 
                            min={1} 
                            max={120} 
                            defaultValue={currentDuration}
                            required
                            className="w-12 h-10 border-2 border-[#0D2421] bg-white rounded-xl font-bold text-center text-xs focus:outline-none shadow-[2px_2px_0px_#0D2421]"
                          />
                          <SubmitButton loadingText="Apply" className="flex-1 h-10 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center">
                            Set Mins
                          </SubmitButton>
                        </div>
                      </form>

                      {/* Shift Duration Form */}
                      <form action={updateShiftDuration} className="space-y-1.5">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#0D2421]/50">Shift Intermission</label>
                        <div className="flex gap-2">
                          <input 
                            key={`shift-${gameState?.shiftDuration || 3}`}
                            type="number" 
                            name="shiftDuration" 
                            min={1} 
                            max={60} 
                            defaultValue={gameState?.shiftDuration || 3}
                            required
                            className="w-12 h-10 border-2 border-[#0D2421] bg-white rounded-xl font-bold text-center text-xs focus:outline-none shadow-[2px_2px_0px_#0D2421]"
                          />
                          <SubmitButton loadingText="Apply" className="flex-1 h-10 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center">
                            Set Shift
                          </SubmitButton>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Live Orchestration Card (Right) */}
                  <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-5 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-[#0D2421]/15">
                      <span className="text-sm">⚙️</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#0D2421]">Orchestration Controls</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-full items-end">
                      {/* Left: Auto Mode Toggle */}
                      <form action={toggleAutoMode}>
                        <input type="hidden" name="isAutoMode" value={gameState?.isAutoMode ? "false" : "true"} />
                        <SubmitButton loadingText="Switching" className={`w-full h-10 px-3 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          gameState?.isAutoMode ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <span>{gameState?.isAutoMode ? '🤖 Auto Mode: ON' : '✋ Manual Mode'}</span>
                        </SubmitButton>
                      </form>

                      {/* Right: Reset Progress */}
                      <form action={resetAllRounds}>
                        <SubmitButton loadingText="Resetting" className="w-full h-10 px-3 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center">
                          Reset Progress
                        </SubmitButton>
                      </form>

                      {/* Bottom: End Conclave */}
                      <div className="col-span-2 w-full">
                        <EndConclaveButton action={endConclave} />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Slots and Rounds Grid */}
              <div className="space-y-8">
                {slots.map((slot) => (
                  <div key={slot.id} className="border-2 border-[#0D2421] rounded-[2rem] overflow-hidden bg-[#FAF8F4] shadow-[4px_4px_0px_#0D2421]">
                    
                    <div className="bg-[#0D2421] px-6 py-4 border-b-2 border-[#0D2421] flex justify-between items-center">
                      <span className="font-black text-sm text-[#BEF03C] tracking-widest uppercase">
                        SLOT COORDINATE: {slot.slotNumber}
                      </span>
                      <span className="text-[10px] font-black text-[#BEF03C]/70 uppercase tracking-widest">
                        {slot.rounds.length} ROUND MODULES
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white">
                      {slot.rounds.map((round) => {
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
                                  <span className="text-[9px] font-black text-[#0D2421]/40 uppercase tracking-widest">
                                    {round.durationMinutes} Mins • Rotation Pin
                                  </span>
                                </div>
                              </div>

                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#0D2421] font-black text-[9px] uppercase shadow-[1px_1px_0px_#0D2421] ${
                                isActive ? 'bg-red-500 text-white animate-pulse' : round.status === 'COMPLETED' ? 'bg-[#0D2421] text-[#BEF03C]' : 'bg-white text-slate-500'
                              }`}>
                                {round.status}
                              </span>
                            </div>

                            {isActive && round.startTime && (
                              <ClientTimer 
                                startedAt={round.startTime} 
                                durationMinutes={round.durationMinutes || 15} 
                                status={round.status} 
                                onTimeUp={stopRound.bind(null, round.id)}
                                serverNow={Date.now()}
                              />
                            )}

                            <div className="pt-2 border-t border-[#0D2421]/10 flex gap-2">
                              {isActive ? (
                                <>
                                  {round.status.startsWith('PAUSED_') ? (
                                    <form action={startRound} className="flex-1">
                                      <input type="hidden" name="roundId" value={round.id} />
                                      <SubmitButton loadingText="Resuming..." className="w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-amber-500 bg-amber-500 text-white shadow-[2px_2px_0px_#B45309] hover:bg-amber-400 transition-all cursor-pointer">
                                        Resume
                                      </SubmitButton>
                                    </form>
                                  ) : (
                                    <form action={pauseRound} className="flex-1">
                                      <input type="hidden" name="roundId" value={round.id} />
                                      <SubmitButton loadingText="Pausing..." className="w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-[#0D2421] bg-white hover:bg-slate-50 shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer">
                                        Pause
                                      </SubmitButton>
                                    </form>
                                  )}
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
                      <p className="font-black text-sm uppercase text-[#0D2421]/70">No assignments generated yet</p>
                      <p className="text-xs font-semibold text-[#0D2421]/50 uppercase tracking-wider">Upload member & captain emails above, then click Generate.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* ── USER MANAGEMENT TABLE ── */}
        <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[#0D2421] pb-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase text-[#0D2421]">Credential Whitelist</h2>
              <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Manage registered accounts and database credentials</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OnboardingExportButton users={users} />
              <ClearMembersWarningButton users={users} clearAction={removeAllUsers} />
            </div>
          </div>


          {/* Manual User Add */}
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
                    <option value="USER">Standard Member</option>
                    <option value="CAPTAIN">Table Captain</option>
                    <option value="ADMIN">Platform Admin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#0D2421]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <SubmitButton loadingText="Granting..." className="w-full md:w-auto px-6 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
                Grant Whitelist
              </SubmitButton>
            </div>
          </form>

          {/* User Search Bar */}
          <UserSearchFilter />

          {/* Members Table */}
          <div className="overflow-x-auto border-2 border-[#0D2421] rounded-[2rem] bg-white shadow-[4px_4px_0px_#0D2421] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F4] border-b-2 border-[#0D2421]">
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Name / Email</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Business Details</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Login Whitelist</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Auth Level</th>
                  <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-right">
                    Total: {users.length}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D2421]/15 text-xs">
                {users.map((user: User) => (
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
                        user.isApproved ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-amber-100 text-[#0D2421]'
                      }`}>
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                        user.role === 'ADMIN' 
                          ? 'bg-[#0D2421] text-[#BEF03C]' 
                          : user.role === 'CAPTAIN'
                            ? 'bg-amber-400 text-[#0D2421]'
                            : 'bg-white text-[#0D2421]'
                      }`}>
                        {user.role === 'CAPTAIN' && '👑 '}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditUserRoleButton userId={user.id} currentRole={user.role} />
                        <DeleteUserButton userId={user.id} />
                      </div>
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
