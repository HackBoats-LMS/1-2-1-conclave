import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { startRound, stopRound, pauseRound, resetAllRounds, clearReferrals, addManualUser, removeAllUsers, deleteUserAccount, clearAssignments, updateAllRoundsDuration, updateShiftDuration, toggleAutoMode, toggleOpenLogin, endConclave } from "./actions";
import { AdminAutoShiftingManager } from "./AdminAutoShiftingManager";
import { EndConclaveButton } from "./EndConclaveButton";
import { SuccessAlert } from "./SuccessAlert";
import { SubmitButton } from "../components/SubmitButton";
import { SecureAdminButton } from "./SecureAdminButton";
import { MemberUploadForm } from "./MemberUploadForm";
import { AssignmentsUploadForm } from "./AssignmentsUploadForm";
import { CaptainUploadForm } from "./CaptainUploadForm";
import { AssignmentPreview } from "./AssignmentPreview";
import { ReferralsExportButtons } from "./ReferralsExportButtons";
import { RefreshButton } from "./RefreshButton";
import { ClientTimer } from "./ClientTimer";
import { AutoGenerateClient } from "./AutoGenerateClient";
import { UserTable } from "./UserTable";
import { OnboardingExportButton } from "./OnboardingExportButton";
import { InjectLateAttendeeForm } from "./InjectLateAttendeeForm";
import { ClearMembersWarningButton } from "./ClearMembersWarningButton";
import { AdminLiveReferralsClient } from "./AdminLiveReferralsClient";
import { LogoutButton } from "../components/LogoutButton";
import { AddParticipantForms } from "./AddParticipantForms";
import { ArrowTrendingUpIcon, ArrowDownTrayIcon, ArchiveBoxIcon, ExclamationTriangleIcon, RectangleStackIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
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
  } else if (successAction === "uploaded_assignments" && addedCount) {
    successMessage = `Successfully imported ${addedCount} assignments!`;
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
  } else if (successAction === "toggled_open_login") {
    successMessage = "Open Login setting updated!";
  }

  let errorMessage = "";
  if (errorAction) {
    errorMessage = String(errorAction);
  }

  // ── Data Fetching (batched queries) ──
  const [slots, gameState, allReferrals, allUsers] = await Promise.all([
    prisma.slot.findMany({
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      orderBy: { slotNumber: 'asc' }
    }),
    prisma.gameState.findFirst(),
    prisma.referral.findMany({ select: { createdAt: true } }),
    prisma.user.findMany({ orderBy: { email: 'asc' } })
  ]);

  const users = allUsers;
  const totalReferrals = allReferrals.length;

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
  const captainCount = allUsers.filter(u => u.role === "CAPTAIN").length;
  const memberCount = allUsers.filter(u => u.role === "USER" && u.isApproved).length;
  const totalUsers = memberCount + captainCount;
  const nonAdminApproved = allUsers.filter(u => u.isApproved && u.role !== "ADMIN").length;
  const pendingOnboarding = allUsers.filter(u => u.isApproved && !u.onboardingCompleted && u.role !== "ADMIN").length;
  const completedOnboarding = nonAdminApproved - pendingOnboarding;
  const hasAssignments = slots.length > 0;
  // Count of PENDING rounds — used by the Late Attendee injection form
  const pendingRoundCount = allOrderedRounds.filter(r => r.status === "PENDING").length;

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
    const memberUsers = allUsers.filter(u => u.role === "USER" && u.isApproved);
    const memberIdSet = new Set<string>(memberUsers.map(u => u.id));
    const memberEmailMap = new Map<string, string>(memberUsers.map(u => [u.id, u.email as string] as [string, string]));

    // Build meeting matrix from assignments
    const met = new Map<string, Set<string>>();
    for (const id of memberIdSet) met.set(id, new Set());

    // Track which members appear in at least one assignment
    const assignedMembers = new Set<string>();

    for (const assignment of allAssignments) {
      if (!assignment.isCaptain && memberIdSet.has(assignment.userId)) {
        assignedMembers.add(assignment.userId);
      }
    }

    // Group assignments by round+table to find who met whom
    const tableGroups = new Map<string, string[]>();
    for (const assignment of allAssignments) {
      if (assignment.isCaptain || !memberIdSet.has(assignment.userId)) continue;
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

    const totalPairs = memberUsers.length * (memberUsers.length - 1) / 2;
    const metPairsSet = new Set<string>();
    for (const [id, partners] of met) {
      for (const partner of partners) {
        const key = id < partner ? `${id}|${partner}` : `${partner}|${id}`;
        metPairsSet.add(key);
      }
    }
    const metPairs = metPairsSet.size;

    // Find unmet pairs (limit to 200 for display)
    const unmetPairs: { member1Email: string; member2Email: string }[] = [];
    const memberArr: string[] = Array.from(memberIdSet);
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
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 md:p-10 relative overflow-x-hidden font-sans selection:bg-[#BEF03C]/40 flex flex-col">
      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <div className="max-w-7xl mx-auto w-full relative z-10 space-y-10">

        {/* Header Block */}
        <header className="bg-white border-2 border-[#0D2421] p-5 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-5">
          {/* Top row: title + hackboats + logout */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[10px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421] whitespace-nowrap">
                <span className="hidden sm:inline">ADMIN MODULE / ORCHESTRATION LOBBY</span>
                <span className="sm:hidden">ADMIN MODULE</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
                Admin Control Console
              </h1>
              <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wider hidden sm:block">
                Upload members & captains, auto-generate assignments, and control live rounds.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <img
                  src="/hb-logo.png"
                  alt="HackBoats Logo"
                  className="h-6 md:h-9 object-contain hover:scale-105 transition-transform duration-300"
                  draggable={false}
                />
                <LogoutButton />
              </div>
            </div>
          </div>

          {/* Bottom row: nav buttons */}
          <div className="pt-3 border-t border-[#0D2421]/10">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <SecureAdminButton
                action={toggleOpenLogin}
                label={gameState?.isOpenLogins ? '🔓 Open Login: ON' : '🔒 Open Login: OFF'}
                loadingText="Switching..."
                promptText="Enter Admin PIN to toggle Open Login:"
                extraFields={{ isOpenLogins: gameState?.isOpenLogins ? "false" : "true" }}
                className={`h-9 px-3 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${gameState?.isOpenLogins ? 'bg-emerald-400 text-[#0D2421]' : 'bg-slate-200 text-slate-500'
                  }`}
              />
              <a href="/admin/leaderboard" target="_blank" className="h-9 px-3 bg-[#BEF03C] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all flex items-center justify-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 flex-shrink-0" />
                <span>Leaderboard</span>
              </a>
              <a href="/admin/referrals-download" target="_blank" className="h-9 px-3 bg-white text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all flex items-center justify-center gap-2">
                <ArrowDownTrayIcon className="w-4 h-4 flex-shrink-0" />
                <span>Referrals</span>
              </a>
              <a href="/admin/archive" className="h-9 px-3 bg-white text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all flex items-center justify-center gap-2">
                <ArchiveBoxIcon className="w-4 h-4 flex-shrink-0" />
                <span>Archive</span>
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
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MemberUploadForm />
            <CaptainUploadForm />
            <AssignmentsUploadForm />
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
              
              {/* Per-Round Referral Breakdown */}
              {allOrderedRounds.some(r => r.status === 'COMPLETED') && (
                <div className="pt-4 border-t-2 border-dashed border-[#0D2421]/10">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0D2421]/40 mb-3">Referrals Per Round</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allOrderedRounds
                      .filter(r => r.status === 'COMPLETED' && r.startTime && r.endedAt)
                      .map(r => {
                        const count = allReferrals.filter(ref => ref.createdAt >= r.startTime! && ref.createdAt <= r.endedAt!).length;
                        return (
                          <div key={r.id} className="bg-[#FAF8F4] border border-[#0D2421]/20 rounded-xl p-2.5 text-center flex items-center justify-between px-3">
                            <span className="text-[9px] font-black uppercase text-[#0D2421]/60">R{r.roundNumber}</span>
                            <span className="text-xs font-black text-[#0D2421]">{count}</span>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}

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
                <p className="text-[10px] font-semibold text-[#0D2421]/60 uppercase tracking-wide">Members and captains</p>
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

              <div className="pb-6 border-b-2 border-[#0D2421]">
                <h2 className="text-2xl font-black uppercase text-[#0D2421]">Session Rotations</h2>
                <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wide">Launch rounds and control active countdowns</p>
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
                      <form action={toggleAutoMode}>
                        <input type="hidden" name="isAutoMode" value={gameState?.isAutoMode ? "false" : "true"} />
                        <SubmitButton loadingText="Switching" className={`w-full h-10 px-3 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${gameState?.isAutoMode ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-slate-200 text-slate-500'
                          }`}>
                          <span>{gameState?.isAutoMode ? '🤖 Auto Mode: ON' : '✋ Manual Mode'}</span>
                        </SubmitButton>
                      </form>

                      <form action={resetAllRounds}>
                        <SubmitButton loadingText="Resetting" className="w-full h-10 px-3 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center">
                          Reset Progress
                        </SubmitButton>
                      </form>

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
                            className={`border-2 border-[#0D2421] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-[3px_3px_0px_#0D2421] transition-all ${isActive ? 'bg-[#BEF03C]/10 border-[#0D2421]' : 'bg-[#FAF8F4]/30'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border-2 border-[#0D2421] shadow-[1.5px_1.5px_0px_#0D2421] ${isActive ? 'bg-[#BEF03C] text-[#0D2421]' : 'bg-white text-slate-500'
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

                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#0D2421] font-black text-[9px] uppercase shadow-[1px_1px_0px_#0D2421] ${isActive ? 'bg-red-500 text-white animate-pulse' : round.status === 'COMPLETED' ? 'bg-[#0D2421] text-[#BEF03C]' : 'bg-white text-slate-500'
                                }`}>
                                {round.status}
                              </span>
                            </div>

                            {isActive && round.startTime && (
                              <ClientTimer
                                startedAt={round.startTime}
                                durationMinutes={round.durationMinutes || 15}
                                status={round.status}
                                onTimeUp={gameState?.isAutoMode ? stopRound.bind(null, round.id) : undefined}
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
                                    className={`w-full py-2.5 text-xs rounded-xl font-black uppercase border-2 border-[#0D2421] transition-all ${round.status === 'COMPLETED'
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
                      <RectangleStackIcon className="w-8 h-8 text-[#0D2421]/40" />
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


          {/* ── LATE ATTENDEE INJECTION AND MANUAL USER ADD ── */}
          <AddParticipantForms 
            hasAssignments={hasAssignments} 
            pendingRoundCount={pendingRoundCount} 
            addManualUserAction={addManualUser} 
          />

          <UserTable users={users} />
        </div>
      </div>

      {/* Invisible auto-shifting manager (only ticks if auto mode is ON and no round is active) */}
      <AdminAutoShiftingManager
        isAutoMode={!!gameState?.isAutoMode}
        lastCompletedRoundEndedAt={lastCompletedRoundEndedAt}
        shiftDurationMinutes={gameState?.shiftDuration || 3}
        nextRoundId={nextRoundId}
        onStartRound={async (roundId) => {
          "use server";
          const fd = new FormData();
          fd.append("roundId", roundId);
          await startRound(fd);
        }}
      />
    </div>
  );
}
