"use server";
import { prisma, invalidateGameStateCache } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import * as xlsx from 'xlsx';
import { auth } from "@/lib/auth";
import crypto from 'crypto';

// Server-side broadcast via Supabase REST API
async function broadcast(event: string, payload: object = {}) {
  const channels = ["big_shift_timer", "global_events", "leaderboard_page_refresh"];
  try {
    await Promise.all(
      channels.map((channel) =>
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
              "x-api-key": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              messages: [{ topic: `realtime:${channel}`, event, payload }],
            }),
          }
        )
      )
    );
  } catch (_) { }
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function verifyDeletePassword(password: string | null) {
  if (!password) {
    throw new Error("Admin Pin is required for deletion");
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const expectedHash = process.env.ADMIN_DELETE_PASSWORD_HASH;
  const expectedPlain = process.env.ADMIN_DELETE_PASSWORD;

  // Hashed password default: HACKBOATS
  const defaultHash = "728fce39b4446fc2aaa0f4a42971737f137b3ad20c36099fba20891eacca64f8";

  const match = expectedHash
    ? hash === expectedHash
    : expectedPlain
      ? password === expectedPlain
      : hash === defaultHash;

  if (!match) {
    throw new Error("Incorrect Admin Pin. Action denied.");
  }
}

// Helper: set a success cookie (read by page.tsx, auto-expires in 5s)
async function setSuccess(key: string) {
  (await cookies()).set("admin_success", key, { maxAge: 5 });
}
async function setError(msg: string) {
  (await cookies()).set("admin_error", msg, { maxAge: 5 });
}

// ──────────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────────

export async function addManualUser(formData: FormData) {
  await requireAdmin();
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  const role = formData.get("role") as string || "USER";
  if (!email) {
    console.error("Email is required");
    return;
  }

  try {
    await prisma.user.upsert({
      where: { email },
      update: { isApproved: true, role },
      create: { email, isApproved: true, role }
    });
  } catch (error) {
    console.error(error);
    return;
  }
  await setSuccess("added_user");
  revalidatePath("/admin");
}

export async function removeUser(formData: FormData) {
  await requireAdmin();
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  try {
    await prisma.user.update({
      where: { email },
      data: { isApproved: false }
    });
    revalidatePath("/admin");
  } catch (error) {
    console.error(error);
  }
}

export async function deleteUserAccount(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);
    await prisma.user.delete({
      where: { id: userId }
    });
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to delete user");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("deleted_user");
  revalidatePath("/admin");
}

export async function deleteArchivedEvent(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  const eventId = formData.get("eventId") as string;

  if (!eventId) {
    await setError("Event ID is required");
    revalidatePath("/admin/archive");
    return;
  }

  try {
    verifyDeletePassword(password);
    await prisma.archivedEvent.delete({
      where: { id: eventId }
    });
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to delete archived event");
    revalidatePath("/admin/archive");
    return;
  }

  await setSuccess("deleted_archive");
  revalidatePath("/admin/archive");
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!userId || !role || !["USER", "CAPTAIN", "ADMIN"].includes(role)) {
    await setError("Invalid Role Update");
    revalidatePath("/admin");
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: role }
    });
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to update role");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_role");
  revalidatePath("/admin");
}

export async function removeAllUsers(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  const eventName = formData.get("eventName") as string;

  if (!eventName || eventName.trim() === "") {
    await setError("Event name is required to archive data before clearing.");
    revalidatePath("/admin");
    return;
  }

  try {
    verifyDeletePassword(password);

    // Wrap entire archive + delete in a transaction — fully atomic, rolls back on any failure
    await prisma.$transaction(async (tx) => {
      // BUG-07 FIX: Use select to fetch only the columns needed for archiving.
      // Previously fetched every column (including large blobs) on every user/referral.
      const usersToArchive = await tx.user.findMany({
        where: { role: { not: "ADMIN" } },
        select: {
          id: true,
          name: true,
          email: true,
          businessName: true,
          businessCategory: true,
          contactNumber: true,
          role: true,
        },
      });

      const referralsToArchive = await tx.referral.findMany({
        select: {
          note: true,
          createdAt: true,
          fromUser: { select: { name: true, email: true } },
          toUser: { select: { name: true, email: true } },
        },
      });

      if (usersToArchive.length > 0 || referralsToArchive.length > 0) {
        const archivedEvent = await tx.archivedEvent.create({
          data: { name: eventName.trim() }
        });

        if (usersToArchive.length > 0) {
          await tx.archivedUser.createMany({
            data: usersToArchive.map(u => ({
              eventId: archivedEvent.id,
              originalUserId: u.id,
              name: u.name,
              email: u.email,
              businessName: u.businessName,
              businessCategory: u.businessCategory,
              contactNumber: u.contactNumber,
              role: u.role,
            }))
          });
        }

        if (referralsToArchive.length > 0) {
          await tx.archivedReferral.createMany({
            data: referralsToArchive.map(r => ({
              eventId: archivedEvent.id,
              fromName: r.fromUser?.name || "Unknown",
              fromEmail: r.fromUser?.email || "unknown@email.com",
              toName: r.toUser?.name || "Unknown",
              toEmail: r.toUser?.email || "unknown@email.com",
              note: r.note,
              createdAt: r.createdAt
            }))
          });
        }
      }

      // Delete inside the same transaction — if anything above failed, this won't run
      await tx.user.deleteMany({
        where: { role: { not: "ADMIN" } }
      });
    }, { timeout: 30000 }); // 30s timeout for large event datasets

  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to clear members");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("cleared_members");
  revalidatePath("/admin");
}

// ──────────────────────────────────────────────
// ROUND LIFECYCLE CONTROLS
// ──────────────────────────────────────────────



export async function startRound(formData: FormData) {
  await requireAdmin();
  const roundId = formData.get("roundId") as string;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Enforce that no other round is active (currently IN_PROGRESS)
      const activeState = await tx.gameState.findFirst();
      if (activeState?.currentRoundId && activeState.currentRoundId !== roundId) {
        const activeRound = await tx.round.findUnique({
          where: { id: activeState.currentRoundId },
          select: { status: true }
        });
        if (activeRound && activeRound.status === "IN_PROGRESS") {
          throw new Error("Another round is currently active.");
        }
      }

      // 2. Enforce status constraints on the target round
      const round = await tx.round.findUnique({
        where: { id: roundId },
        select: { status: true, durationMinutes: true },
      });

      if (!round) {
        throw new Error("Target round not found.");
      }

      if (round.status === "COMPLETED") {
        throw new Error("Cannot restart a completed round.");
      }

      if (round.status === "IN_PROGRESS") {
        return; // harmless concurrent click no-op
      }

      const durationMinutesStr = formData.get("durationMinutes");
      let durationMinutes = round.durationMinutes;
      if (durationMinutesStr && typeof durationMinutesStr === "string") {
        durationMinutes = parseInt(durationMinutesStr, 10);
      }

      let newStartTime = new Date();
      if (round.status.startsWith("PAUSED_")) {
        const elapsedSec = parseInt(round.status.split("_")[1]);
        if (!isNaN(elapsedSec)) {
          newStartTime = new Date(Date.now() - (elapsedSec * 1000));
        }
      }

      await tx.round.update({
        where: { id: roundId },
        data: { status: "IN_PROGRESS", startTime: newStartTime, durationMinutes },
      });

      if (activeState) {
        await tx.gameState.update({
          where: { id: activeState.id },
          data: { currentRoundId: roundId },
        });
      } else {
        await tx.gameState.create({
          data: { currentRoundId: roundId },
        });
      }
    });

    invalidateGameStateCache();

    await broadcast('round_state_change', { action: 'start' });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e: any) {
    console.error("Failed to start round:", e.message || e);
    await setError(e.message || "Failed to start round");
  }
}

export async function stopRound(payload: FormData | string) {
  await requireAdmin();
  try {
    const roundId = typeof payload === "string" ? payload : payload.get("roundId") as string;

    await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
        select: { status: true }
      });
      if (!round || (round.status !== "IN_PROGRESS" && !round.status.startsWith("PAUSED_"))) {
        return; // harmless no-op
      }

      await tx.round.update({
        where: { id: roundId },
        data: { status: "COMPLETED", endedAt: new Date() },
      });
      const state = await tx.gameState.findFirst();
      if (state?.currentRoundId === roundId) {
        await tx.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
      }
    });

    invalidateGameStateCache();

    await broadcast('round_state_change', { action: 'stop' });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function pauseRound(formData: FormData) {
  await requireAdmin();
  try {
    const roundId = formData.get("roundId") as string;

    const [round, gameState] = await Promise.all([
      prisma.round.findUnique({
        where: { id: roundId },
        select: { startTime: true, status: true },
      }),
      prisma.gameState.findFirst({ select: { currentRoundId: true } }),
    ]);

    if (gameState?.currentRoundId !== roundId) return; // Not the active round — ignore

    if (round?.startTime && round.status === "IN_PROGRESS") {
      const elapsedSec = Math.floor((Date.now() - round.startTime.getTime()) / 1000);
      await prisma.round.update({
        where: { id: roundId },
        data: { status: `PAUSED_${elapsedSec}` },
      });
    }

    invalidateGameStateCache();

    await broadcast('round_state_change', { action: 'pause' });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function resetAllRounds() {
  await requireAdmin();
  try {
    await prisma.round.updateMany({
      data: { status: "PENDING", startTime: null, endedAt: null }
    });
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }

    invalidateGameStateCache();

    await broadcast('round_state_change', { action: 'reset' });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function clearReferrals(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);
    await prisma.referral.deleteMany({});
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to wipe data");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("cleared_referrals");
  revalidatePath("/admin");
}



// ──────────────────────────────────────────────
// EXCEL UPLOAD: MEMBER WHITELIST (emails only)
// ──────────────────────────────────────────────

export async function uploadWhitelistExcel(formData: FormData) {
  await requireAdmin();
  let emailsCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File exceeds 5MB size limit.");
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      throw new Error("Only Excel files (.xlsx, .xls) are allowed.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const usersData: { email: string; group: string | null }[] = [];
    for (const row of data) {
      const emailKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const groupKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("group") || key.toLowerCase().includes("college") || key.toLowerCase().includes("company") || key.toLowerCase().includes("org")
      );

      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (email) {
          usersData.push({
            email,
            group: groupKey && row[groupKey] ? String(row[groupKey]).trim() : null
          });
        }
      }
    }

    const uploadedEmails = usersData.map(u => u.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: uploadedEmails } },
      select: { email: true }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()).filter(Boolean) as string[]);

    const toCreate = usersData.filter(u => !existingEmails.has(u.email.toLowerCase()));
    const toUpdate = usersData.filter(u => existingEmails.has(u.email.toLowerCase()));

    if (toCreate.length > 0) {
      await prisma.user.createMany({
        data: toCreate.map(u => ({
          email: u.email,
          isApproved: true,
          role: "USER",
          group: u.group
        })),
        skipDuplicates: true
      });
    }

    if (toUpdate.length > 0) {
      const groupMap = new Map<string, string[]>();
      for (const u of toUpdate) {
        const key = u.group ?? "__null__";
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(u.email);
      }
      await Promise.all(
        Array.from(groupMap.entries()).map(([groupKey, emails]) =>
          prisma.user.updateMany({
            where: { email: { in: emails } },
            data: { isApproved: true, group: groupKey === "__null__" ? null : groupKey },
          })
        )
      );
    }
    emailsCount = usersData.length;
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to upload whitelist");
    revalidatePath("/admin");
    return;
  }
  await setSuccess(`uploaded_whitelist&added=${emailsCount}`);
  revalidatePath("/admin");
}

// ──────────────────────────────────────────────
// EXCEL UPLOAD: CAPTAIN LIST
// ──────────────────────────────────────────────

export async function uploadCaptainExcel(formData: FormData) {
  await requireAdmin();
  let captainCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File exceeds 5MB size limit.");
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      throw new Error("Only Excel files (.xlsx, .xls) are allowed.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const usersData: { email: string; group: string | null }[] = [];
    for (const row of data) {
      const emailKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const groupKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("group") || key.toLowerCase().includes("college") || key.toLowerCase().includes("company") || key.toLowerCase().includes("org")
      );

      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (email) {
          usersData.push({
            email,
            group: groupKey && row[groupKey] ? String(row[groupKey]).trim() : null
          });
        }
      }
    }

    const uploadedEmails = usersData.map(u => u.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: uploadedEmails } },
      select: { email: true }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()).filter(Boolean) as string[]);

    const toCreate = usersData.filter(u => !existingEmails.has(u.email.toLowerCase()));
    const toUpdate = usersData.filter(u => existingEmails.has(u.email.toLowerCase()));

    if (toCreate.length > 0) {
      await prisma.user.createMany({
        data: toCreate.map(u => ({
          email: u.email,
          isApproved: true,
          role: "CAPTAIN",
          group: u.group
        })),
        skipDuplicates: true
      });
    }

    if (toUpdate.length > 0) {
      const groupMap = new Map<string, string[]>();
      for (const u of toUpdate) {
        const key = u.group ?? "__null__";
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(u.email);
      }
      await Promise.all(
        Array.from(groupMap.entries()).map(([groupKey, emails]) =>
          prisma.user.updateMany({
            where: { email: { in: emails } },
            data: { isApproved: true, role: "CAPTAIN", group: groupKey === "__null__" ? null : groupKey },
          })
        )
      );
    }
    captainCount = usersData.length;
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to upload captains");
    revalidatePath("/admin");
    return;
  }
  await setSuccess(`uploaded_captains&added=${captainCount}`);
  revalidatePath("/admin");
}

// ──────────────────────────────────────────────
// CLEAR GENERATED ASSIGNMENTS (without touching users)
// ──────────────────────────────────────────────

export async function clearAssignments(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);
    // Order matters: children first due to FK constraints
    await prisma.tableAssignment.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.slot.deleteMany({});

    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }
    invalidateGameStateCache();
    revalidatePath("/dashboard");
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to clear assignments");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("cleared_assignments");
  revalidatePath("/admin");
}

// ──────────────────────────────────────────────
// AUTO-GENERATE ASSIGNMENTS (Client-Side Interface)
// ──────────────────────────────────────────────

export async function fetchUsersForGeneration() {
  await requireAdmin();
  try {
    // BUG-10 FIX: Run both queries in parallel — they are fully independent.
    const [captains, members] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CAPTAIN", isApproved: true },
        orderBy: { email: 'asc' },
        select: { id: true, email: true, group: true },
      }),
      prisma.user.findMany({
        where: { role: "USER", isApproved: true },
        orderBy: { email: 'asc' },
        select: { id: true, email: true, group: true },
      }),
    ]);
    return { captains, members, error: null };
  } catch (error: any) {
    return { captains: [], members: [], error: error.message };
  }
}

export async function saveAutoAssignments(payload: any) {
  await requireAdmin();
  try {
    const { slotData, roundData, tableData, assignmentData } = payload;

    await prisma.$transaction(async (tx) => {
      await tx.tableAssignment.deleteMany({});
      await tx.table.deleteMany({});
      await tx.round.deleteMany({});
      await tx.slot.deleteMany({});

      const state = await tx.gameState.findFirst();
      if (state) {
        await tx.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
      }

      await tx.slot.createMany({ data: slotData });
      await tx.round.createMany({ data: roundData });
      await tx.table.createMany({ data: tableData });
      await tx.tableAssignment.createMany({ data: assignmentData, skipDuplicates: true });
    }, { timeout: 30000 });

    invalidateGameStateCache();

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Save assignments failed:", error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────
// EXCEL UPLOAD: PRE-COMPUTED ASSIGNMENTS
// ──────────────────────────────────────────────

export async function uploadAssignmentsExcel(formData: FormData) {
  await requireAdmin();
  let assignmentsCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File exceeds 5MB size limit.");
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      throw new Error("Only Excel files (.xlsx, .xls) are allowed.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    // Prepare mapped data in memory
    const rows: { email: string; role: string; slot: number; round: number; table: number }[] = [];

    for (const row of data) {
      // Flexible matching for columns
      const emailKey = Object.keys(row).find(k => k.toLowerCase() === "email" || k.toLowerCase() === "mail");
      const roleKey = Object.keys(row).find(k => k.toLowerCase() === "role");
      const slotKey = Object.keys(row).find(k => k.toLowerCase() === "slot");
      const roundKey = Object.keys(row).find(k => k.toLowerCase() === "round");
      const tableKey = Object.keys(row).find(k => k.toLowerCase() === "table");

      if (emailKey && slotKey && roundKey && tableKey) {
        const email = String(row[emailKey]).trim().toLowerCase();
        const role = roleKey ? String(row[roleKey]).trim().toUpperCase() : "USER";
        const slot = parseInt(String(row[slotKey]), 10);
        const round = parseInt(String(row[roundKey]), 10);
        const table = parseInt(String(row[tableKey]), 10);

        if (email && !isNaN(slot) && !isNaN(round) && !isNaN(table)) {
          rows.push({ email, role: role === "CAPTAIN" ? "CAPTAIN" : "USER", slot, round, table });
        }
      }
    }

    if (rows.length === 0) throw new Error("No valid assignment rows found. Missing required columns.");

    // 1. Ensure all users exist
    const emails = [...new Set(rows.map(r => r.email))];
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));

    const missingUsers = rows
      .filter(r => !existingEmails.has(r.email))
      // Deduplicate before creation
      .filter((v, i, a) => a.findIndex(t => t.email === v.email) === i)
      .map(r => ({
        email: r.email,
        role: r.role,
        isApproved: true
      }));

    if (missingUsers.length > 0) {
      await prisma.user.createMany({
        data: missingUsers,
        skipDuplicates: true
      });
    }

    // Re-fetch all relevant users to get their IDs
    const allRelevantUsers = await prisma.user.findMany({
      where: { email: { in: emails } }
    });
    const userEmailToId = new Map(allRelevantUsers.map(u => [u.email?.toLowerCase() || "", u.id]));

    // 2. Build hierarchical data (Slots -> Rounds -> Tables -> Assignments)
    const slotData: { id: string; slotNumber: number }[] = [];
    const roundData: { id: string; slotId: string; roundNumber: number; status: string; durationMinutes: number }[] = [];
    const tableData: { id: string; roundId: string; tableNumber: number }[] = [];
    const assignmentData: { userId: string; tableId: string; isCaptain: boolean }[] = [];

    const slotMap = new Map<number, string>(); // slotNumber -> slotId
    const roundMap = new Map<string, string>(); // slotNumber_roundNumber -> roundId
    const tableMap = new Map<string, string>(); // roundId_tableNumber -> tableId

    for (const row of rows) {
      // Handle Slot
      if (!slotMap.has(row.slot)) {
        const slotId = genId();
        slotMap.set(row.slot, slotId);
        slotData.push({ id: slotId, slotNumber: row.slot });
      }
      const slotId = slotMap.get(row.slot)!;

      // Handle Round
      const roundKey = `${row.slot}_${row.round}`;
      if (!roundMap.has(roundKey)) {
        const roundId = genId();
        roundMap.set(roundKey, roundId);
        roundData.push({
          id: roundId,
          slotId: slotId,
          roundNumber: row.round,
          status: "PENDING",
          durationMinutes: 15 // default
        });
      }
      const roundId = roundMap.get(roundKey)!;

      // Handle Table
      const tableKey = `${roundId}_${row.table}`;
      if (!tableMap.has(tableKey)) {
        const tableId = genId();
        tableMap.set(tableKey, tableId);
        tableData.push({ id: tableId, roundId: roundId, tableNumber: row.table });
      }
      const tableId = tableMap.get(tableKey)!;

      // Handle Assignment
      const userId = userEmailToId.get(row.email);
      if (userId) {
        assignmentData.push({
          userId: userId,
          tableId: tableId,
          isCaptain: row.role === "CAPTAIN"
        });
        assignmentsCount++;
      }
    }

    // 3. Batch Create inside a single transaction
    await prisma.$transaction(async (tx) => {
      await tx.tableAssignment.deleteMany({});
      await tx.table.deleteMany({});
      await tx.round.deleteMany({});
      await tx.slot.deleteMany({});

      const state = await tx.gameState.findFirst();
      if (state) {
        await tx.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
      }

      await tx.slot.createMany({ data: slotData });
      await tx.round.createMany({ data: roundData });
      await tx.table.createMany({ data: tableData });
      await tx.tableAssignment.createMany({ data: assignmentData, skipDuplicates: true });
    }, { timeout: 30000 });

    invalidateGameStateCache();

  } catch (e: any) {
    console.error("Upload assignments failed:", e);
    await setError(e.message || "Failed to upload assignments");
    revalidatePath("/admin");
    return;
  }
  await setSuccess(`uploaded_assignments&added=${assignmentsCount}`);
  revalidatePath("/admin");
}

// Helper functions for matching
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calculateSlotGrouping(totalRounds: number): number[] {
  if (totalRounds <= 4) return [totalRounds];
  if (totalRounds % 4 === 0) return Array(totalRounds / 4).fill(4);
  if (totalRounds % 3 === 0) return Array(totalRounds / 3).fill(3);

  const slotsOf4 = Math.floor(totalRounds / 4);
  const remainder = totalRounds % 4;

  if (remainder === 0) return Array(slotsOf4).fill(4);
  if (remainder === 1 && slotsOf4 > 0) {
    return Array(Math.ceil(totalRounds / 3)).fill(0).map((_, i) => {
      const remaining = totalRounds - i * 3;
      return Math.min(remaining, 3);
    }).filter(n => n > 0);
  }
  if (remainder === 2) {
    if (totalRounds === 6) return [3, 3];
    const result = Array(slotsOf4).fill(4);
    result.push(2);
    return result;
  }
  if (remainder === 3) {
    const result = Array(slotsOf4).fill(4);
    result.push(3);
    return result;
  }

  const slots: number[] = [];
  let left = totalRounds;
  while (left > 0) {
    const chunk = Math.min(left, 4);
    slots.push(chunk);
    left -= chunk;
  }
  return slots;
}

export async function generateAutoAssignments(maxRounds: number, defaultDuration: number) {
  await requireAdmin();
  try {
    const { captains, members, error: fetchError } = await fetchUsersForGeneration();
    if (fetchError) throw new Error(fetchError);

    const C = captains.length;
    const M = members.length;
    if (C === 0) throw new Error("No captains found. Upload captain emails first.");
    if (M === 0) throw new Error("No members found. Upload member emails first.");
    if (M < C) throw new Error(`Need at least ${C} members for ${C} captains (tables). Currently have ${M}.`);

    const membersPerTable = Math.floor(M / C);
    const extraTables = M % C;

    const memberIds = members.map(m => m.id);
    const captainIds = captains.map(c => c.id);

    const userGroups = new Map<string, string | null>();
    members.forEach(m => userGroups.set(m.id, m.group));
    captains.forEach(c => userGroups.set(c.id, c.group));

    const totalPossiblePairs = (M * (M - 1) / 2) + (M * C);

    let bestRoundAssignments: { captainId: string; memberIds: string[] }[][] = [];
    let bestRoundCount = Infinity;
    let bestCoverage = -1;

    const evaluateCoverage = (matrix: string[][][]) => {
      const met = new Map<string, Set<string>>();
      for (const id of memberIds) met.set(id, new Set());
      for (const id of captainIds) met.set(id, new Set());

      let groupPenalty = 0;
      for (const round of matrix) {
        for (let t = 0; t < C; t++) {
          const allAtTable = [...round[t], captainIds[t]];
          for (let i = 0; i < allAtTable.length; i++) {
            for (let j = i + 1; j < allAtTable.length; j++) {
              met.get(allAtTable[i])!.add(allAtTable[j]);
              met.get(allAtTable[j])!.add(allAtTable[i]);

              const g1 = userGroups.get(allAtTable[i]);
              const g2 = userGroups.get(allAtTable[j]);
              if (g1 && g2 && g1 === g2) groupPenalty += 10;
            }
          }
        }
      }

      let totalSize = 0;
      for (const partners of met.values()) {
        totalSize += partners.size;
      }
      const pairs = totalSize / 2;
      return { pairs, met, score: pairs - groupPenalty };
    };

    for (let sim = 0; sim < 30; sim++) {
      const matrix: string[][][] = [];
      const currentMet = new Map<string, Set<string>>();
      for (const id of memberIds) currentMet.set(id, new Set());
      for (const id of captainIds) currentMet.set(id, new Set());

      const pool = [...memberIds];

      while (matrix.length < maxRounds) {
        let totalSize = 0;
        for (const partners of currentMet.values()) {
          totalSize += partners.size;
        }
        const metCount = totalSize / 2;
        if (metCount >= totalPossiblePairs) break;

        let bestRound: string[][] = Array.from({ length: C }, () => []);
        let maxNewPairs = -Infinity;

        for (let attempt = 0; attempt < 50; attempt++) {
          const tables: string[][] = Array.from({ length: C }, () => []);
          const tableSizes = Array.from({ length: C }, (_, i) => i >= C - extraTables ? membersPerTable + 1 : membersPerTable);
          shuffle(pool);
          const sorted = [...pool].sort((a, b) => currentMet.get(a)!.size - currentMet.get(b)!.size);

          for (const memberId of sorted) {
            let bestTable = -1, bestScore = -1, bestCurrentSize = Infinity;
            const tableIndices = Array.from({ length: C }, (_, i) => i);
            shuffle(tableIndices);

            for (const t of tableIndices) {
              if (tables[t].length >= tableSizes[t]) continue;
              let newMeetings = 0;
              let groupPenalty = 0;
              const myMet = currentMet.get(memberId)!;
              const myGroup = userGroups.get(memberId);

              for (const existing of tables[t]) {
                if (!myMet.has(existing)) newMeetings++;
                if (myGroup && myGroup === userGroups.get(existing)) groupPenalty += 10;
              }
              if (!myMet.has(captainIds[t])) newMeetings++;
              if (myGroup && myGroup === userGroups.get(captainIds[t])) groupPenalty += 10;

              const tableScore = newMeetings - groupPenalty;

              if (bestTable === -1 || tableScore > bestScore || (tableScore === bestScore && tables[t].length < bestCurrentSize)) {
                bestTable = t; bestScore = tableScore; bestCurrentSize = tables[t].length;
              }
            }
            if (bestTable >= 0) tables[bestTable].push(memberId);
          }

          const evalTableScoreLocal = (tableMembers: string[], capId: string) => {
            let score = 0;
            const len = tableMembers.length;
            for (let i = 0; i < len; i++) {
              const m1 = tableMembers[i];
              const m1Met = currentMet.get(m1)!;
              const g1 = userGroups.get(m1);
              for (let j = i + 1; j < len; j++) {
                const m2 = tableMembers[j];
                if (!m1Met.has(m2)) score++;
                if (g1 && g1 === userGroups.get(m2)) score -= 10;
              }
              if (!m1Met.has(capId)) score++;
              if (g1 && g1 === userGroups.get(capId)) score -= 10;
            }
            return score;
          };

          for (let step = 0; step < 10000; step++) {
            const t1 = Math.floor(Math.random() * C);
            const t2 = Math.floor(Math.random() * C);
            if (t1 === t2) continue;
            if (tables[t1].length === 0 || tables[t2].length === 0) continue;

            const m1Idx = Math.floor(Math.random() * tables[t1].length);
            const m2Idx = Math.floor(Math.random() * tables[t2].length);
            const m1 = tables[t1][m1Idx];
            const m2 = tables[t2][m2Idx];

            const scoreBefore = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

            tables[t1][m1Idx] = m2;
            tables[t2][m2Idx] = m1;
            const scoreAfter = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

            if (scoreAfter <= scoreBefore) {
              tables[t1][m1Idx] = m1;
              tables[t2][m2Idx] = m2;
            }
          }

          const finalTestMatrix = [...matrix, tables];
          const finalEval = evaluateCoverage(finalTestMatrix);

          const newScoreAdded = finalEval.score - (evaluateCoverage(matrix).score);
          if (newScoreAdded > maxNewPairs) {
            maxNewPairs = newScoreAdded;
            bestRound = tables.map(t => [...t]);
          }
          if (metCount + (finalEval.pairs - metCount) >= totalPossiblePairs && finalEval.score > 0) break;
        }

        matrix.push(bestRound);
        for (let t = 0; t < C; t++) {
          const allAtTable = [...bestRound[t], captainIds[t]];
          for (let i = 0; i < allAtTable.length; i++) {
            for (let j = i + 1; j < allAtTable.length; j++) {
              currentMet.get(allAtTable[i])!.add(allAtTable[j]);
              currentMet.get(allAtTable[j])!.add(allAtTable[i]);
            }
          }
        }
      }

      const finalEval = evaluateCoverage(matrix);
      const isBetter = (finalEval.pairs === totalPossiblePairs && matrix.length < bestRoundCount) ||
        (finalEval.score > bestCoverage && bestCoverage < totalPossiblePairs);

      if (bestCoverage === -1 || isBetter) {
        bestCoverage = finalEval.score;
        bestRoundCount = matrix.length;
        bestRoundAssignments = matrix.map(roundTables =>
          roundTables.map((memberList, tableIdx) => ({
            captainId: captainIds[tableIdx],
            memberIds: [...memberList],
          }))
        );
      }
    }

    const totalRounds = bestRoundAssignments.length;
    const slotGrouping = calculateSlotGrouping(totalRounds);
    const totalSlots = slotGrouping.length;

    const slotData: { id: string; slotNumber: number }[] = [];
    const roundData: { id: string; slotId: string; roundNumber: number; status: string; durationMinutes: number }[] = [];
    const tableData: { id: string; roundId: string; tableNumber: number }[] = [];
    const assignmentData: { userId: string; tableId: string; isCaptain: boolean }[] = [];

    let globalRoundIdx = 0;
    for (let s = 0; s < totalSlots; s++) {
      const slotId = genId();
      slotData.push({ id: slotId, slotNumber: s + 1 });

      const roundsInSlot = slotGrouping[s];
      for (let r = 0; r < roundsInSlot; r++) {
        const roundId = genId();
        roundData.push({
          id: roundId,
          slotId,
          roundNumber: globalRoundIdx + 1,
          status: "PENDING",
          durationMinutes: defaultDuration
        });

        const roundTables = bestRoundAssignments[globalRoundIdx];
        for (let t = 0; t < C; t++) {
          const tableId = genId();
          tableData.push({ id: tableId, roundId, tableNumber: t + 1 });

          assignmentData.push({ userId: roundTables[t].captainId, tableId, isCaptain: true });

          for (const memberId of roundTables[t].memberIds) {
            assignmentData.push({ userId: memberId, tableId, isCaptain: false });
          }
        }
        globalRoundIdx++;
      }
    }

    const payload = { slotData, roundData, tableData, assignmentData };
    return await saveAutoAssignments(payload);
  } catch (error: any) {
    console.error("Error generating assignments:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAllRoundsDuration(formData: FormData) {
  await requireAdmin();
  const durationStr = formData.get("duration") as string;
  if (!durationStr) return;
  const duration = parseInt(durationStr, 10);
  if (isNaN(duration) || duration <= 0) return;

  try {
    await prisma.round.updateMany({
      data: { durationMinutes: duration }
    });
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Failed to update round durations:", error);
    await setError("Failed to update round durations");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_durations");
  revalidatePath("/admin");
}

export async function updateShiftDuration(formData: FormData) {
  await requireAdmin();
  const durationStr = formData.get("shiftDuration") as string;
  if (!durationStr) return;
  const duration = parseInt(durationStr, 10);
  if (isNaN(duration) || duration <= 0) return;

  try {
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { shiftDuration: duration }
      });
    } else {
      await prisma.gameState.create({
        data: { shiftDuration: duration }
      });
    }
    invalidateGameStateCache();
    revalidatePath("/dashboard");
    revalidatePath("/admin/leaderboard");
  } catch (error) {
    console.error("Failed to update shift duration:", error);
    await setError("Failed to update shift duration");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_shift_duration");
  revalidatePath("/admin");
}

export async function toggleOpenLogin(formData: FormData) {
  try {
    await requireAdmin();
    const password = formData.get("password") as string;
    verifyDeletePassword(password);
    const isOpenLogins = formData.get("isOpenLogins") === "true";
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { isOpenLogins } });
    } else {
      await prisma.gameState.create({ data: { isOpenLogins } });
    }
    invalidateGameStateCache();
    await setSuccess("toggled_open_login");
    revalidatePath("/admin");
  } catch (e: any) {
    console.error("Failed to toggle open login:", e);
    await setError(e.message || "Failed to toggle open login.");
    revalidatePath("/admin");
  }
}

export async function toggleAutoMode(formData: FormData) {
  await requireAdmin();
  const isAutoMode = formData.get("isAutoMode") === "true";

  try {
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { isAutoMode }
      });
    } else {
      await prisma.gameState.create({
        data: { isAutoMode }
      });
    }
    invalidateGameStateCache();

    await setSuccess("toggled_mode");
    revalidatePath("/admin");
  } catch (e: any) {
    console.error("Failed to toggle auto mode:", e);
    await setError("Failed to toggle mode.");
    revalidatePath("/admin");
  }
}

export async function endConclave(formData: FormData) {
  await requireAdmin();
  try {
    await prisma.round.updateMany({
      where: { status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', endedAt: new Date() }
    });

    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { currentRoundId: null, isAutoMode: false }
      });
    }
    invalidateGameStateCache();

    await broadcast('round_state_change', { action: 'end_conclave' });

    await setSuccess("ended_conclave");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/admin/leaderboard");
  } catch (e: any) {
    console.error("Failed to end conclave:", e);
    await setError("Failed to end conclave.");
    revalidatePath("/admin");
  }
}

// ──────────────────────────────────────────────
// LATE ATTENDEE INJECTION (Safe Mid-Event Addition)
// Adds a user to ALL PENDING rounds only — never touches COMPLETED or IN_PROGRESS rounds.
// ──────────────────────────────────────────────

export async function injectLateAttendee(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  injectedRounds?: { roundNumber: number; tableNumber: number }[];
}> {
  await requireAdmin();

  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  const role = (formData.get("role") as string) || "USER";

  if (!email) {
    return { success: false, error: "Email is required." };
  }
  if (!["USER", "CAPTAIN"].includes(role)) {
    return { success: false, error: "Role must be USER or CAPTAIN." };
  }

  try {
    const injectedRounds = await prisma.$transaction(async (tx) => {
      // 1. Advisory lock to serialize concurrent injection operations safely
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(121121)`;

      // 2. Upsert the user into the database whitelisting schema
      const user = await tx.user.upsert({
        where: { email },
        update: { isApproved: true, role },
        create: { email, isApproved: true, role },
      });

      // 3. Find all PENDING rounds
      const pendingRounds = await tx.round.findMany({
        where: { status: "PENDING" },
        include: {
          tables: {
            include: {
              _count: { select: { assignments: true } },
            },
          },
        },
        orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
      });

      if (pendingRounds.length === 0) {
        throw new Error("No pending rounds found. All rounds are either in progress or completed.");
      }

      // 4. Check if this user is already assigned to any pending round to prevent duplicate writes
      const existingAssignments = await tx.tableAssignment.findMany({
        where: {
          userId: user.id,
          table: {
            roundId: { in: pendingRounds.map((r) => r.id) },
          },
        },
        include: { table: true },
      });
      const alreadyAssignedRoundIds = new Set(existingAssignments.map((a) => a.table.roundId));

      const roundResults: { roundNumber: number; tableNumber: number }[] = [];
      const newAssignments: { userId: string; tableId: string; isCaptain: boolean }[] = [];
      const newTableBatch: { id: string; roundId: string; tableNumber: number }[] = [];
      const rebalanceMoves: { crowdedTableId: string; newTableId: string }[] = [];

      for (const round of pendingRounds) {
        if (alreadyAssignedRoundIds.has(round.id)) {
          const existingAssignment = existingAssignments.find((a) => a.table.roundId === round.id);
          if (existingAssignment) {
            roundResults.push({
              roundNumber: round.roundNumber,
              tableNumber: existingAssignment.table.tableNumber,
            });
          }
          continue;
        }

        if (round.tables.length === 0) continue;

        if (role === "CAPTAIN") {
          const maxTableNumber = round.tables.reduce((max, t) => Math.max(max, t.tableNumber), 0);
          const newTableId = crypto.randomUUID();
          const newTableNumber = maxTableNumber + 1;

          newTableBatch.push({ id: newTableId, roundId: round.id, tableNumber: newTableNumber });
          newAssignments.push({ userId: user.id, tableId: newTableId, isCaptain: true });
          roundResults.push({ roundNumber: round.roundNumber, tableNumber: newTableNumber });

          const sortedTables = [...round.tables].sort(
            (a, b) => b._count.assignments - a._count.assignments
          );
          if (sortedTables.length > 0 && sortedTables[0]._count.assignments > 1) {
            rebalanceMoves.push({ crowdedTableId: sortedTables[0].id, newTableId });
            sortedTables[0]._count.assignments -= 1;
          }
        } else {
          const sortedTables = [...round.tables].sort(
            (a, b) => a._count.assignments - b._count.assignments
          );
          const targetTable = sortedTables[0];

          newAssignments.push({ userId: user.id, tableId: targetTable.id, isCaptain: false });
          roundResults.push({ roundNumber: round.roundNumber, tableNumber: targetTable.tableNumber });
        }
      }

      if (newTableBatch.length > 0) {
        await tx.table.createMany({ data: newTableBatch, skipDuplicates: true });
      }

      for (const { crowdedTableId, newTableId } of rebalanceMoves) {
        const userToMove = await tx.tableAssignment.findFirst({
          where: { tableId: crowdedTableId, isCaptain: false },
        });
        if (userToMove) {
          await tx.tableAssignment.update({
            where: { id: userToMove.id },
            data: { tableId: newTableId },
          });
        }
      }

      if (newAssignments.length > 0) {
        await tx.tableAssignment.createMany({
          data: newAssignments,
          skipDuplicates: true,
        });
      }

      return roundResults;
    }, { timeout: 15000 });

    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true, injectedRounds };
  } catch (e: any) {
    console.error("Failed to inject late attendee:", e);
    return { success: false, error: e.message || "Injection failed." };
  }
}
