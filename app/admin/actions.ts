"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as xlsx from 'xlsx';
import { auth } from "@/lib/auth";
import crypto from 'crypto';

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
    revalidatePath("/admin");
  } catch (error) {
    console.error(error);
    return;
  }
  redirect("/admin?success=added_user");
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
    revalidatePath("/admin");
  } catch (error: any) {
    console.error(error);
    redirect(`/admin?error=${encodeURIComponent(error.message || "Failed to delete user")}`);
  }
  redirect("/admin?success=deleted_user");
}

export async function removeAllUsers(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);
    await prisma.user.deleteMany({
      where: { role: { not: "ADMIN" } }
    });
    revalidatePath("/admin");
  } catch (e: any) {
    console.error(e);
    redirect(`/admin?error=${encodeURIComponent(e.message || "Failed to clear members")}`);
  }
  redirect("/admin?success=cleared_members");
}

// ──────────────────────────────────────────────
// ROUND LIFECYCLE CONTROLS
// ──────────────────────────────────────────────

export async function startRound(formData: FormData) {
  await requireAdmin();
  const roundId = formData.get("roundId") as string;

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId }
    });
    const durationMinutes = round?.durationMinutes || 15;

    await prisma.round.update({
      where: { id: roundId },
      data: { 
        status: "IN_PROGRESS", 
        startTime: new Date(),
        durationMinutes
      }
    });
    
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { currentRoundId: roundId }
      });
    } else {
      await prisma.gameState.create({
        data: { currentRoundId: roundId }
      });
    }
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error("Failed to start round", e);
  }
}

export async function stopRound(formData: FormData) {
  await requireAdmin();
  try {
    const roundId = formData.get("roundId") as string;
    await prisma.round.update({
      where: { id: roundId },
      data: { status: "COMPLETED" }
    });
    const state = await prisma.gameState.findFirst();
    if (state?.currentRoundId === roundId) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }
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
    const state = await prisma.gameState.findFirst();
    if (state?.currentRoundId === roundId) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }
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
      data: { status: "PENDING" }
    });
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }
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
    revalidatePath("/admin");
  } catch (e: any) {
    console.error(e);
    redirect(`/admin?error=${encodeURIComponent(e.message || "Failed to wipe data")}`);
  }
  redirect("/admin?success=cleared_referrals");
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

    // Batch upsert — sequential but necessary since upsert isn't batchable
    for (const userData of usersData) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: { isApproved: true, group: userData.group },
        create: { email: userData.email, isApproved: true, role: "USER", group: userData.group }
      });
    }
    emailsCount = usersData.length;
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
    return;
  }
  redirect(`/admin?success=uploaded_whitelist&added=${emailsCount}`);
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

    // Upsert captains — always set role to CAPTAIN
    for (const userData of usersData) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: { isApproved: true, role: "CAPTAIN", group: userData.group },
        create: { email: userData.email, isApproved: true, role: "CAPTAIN", group: userData.group }
      });
    }
    captainCount = usersData.length;
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
    return;
  }
  redirect(`/admin?success=uploaded_captains&added=${captainCount}`);
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
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e: any) {
    console.error(e);
    redirect(`/admin?error=${encodeURIComponent(e.message || "Failed to clear assignments")}`);
  }
  redirect("/admin?success=cleared_assignments");
}

// ──────────────────────────────────────────────
// AUTO-GENERATE ASSIGNMENTS (Client-Side Interface)
// ──────────────────────────────────────────────

export async function fetchUsersForGeneration() {
  await requireAdmin();
  try {
    const captains = await prisma.user.findMany({
      where: { role: "CAPTAIN", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true }
    });
    const members = await prisma.user.findMany({
      where: { role: "USER", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true }
    });
    return { captains, members, error: null };
  } catch (error: any) {
    return { captains: [], members: [], error: error.message };
  }
}

export async function saveAutoAssignments(payload: any) {
  await requireAdmin();
  try {
    const { slotData, roundData, tableData, assignmentData } = payload;
    
    // Wipe old data
    await prisma.tableAssignment.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.slot.deleteMany({});

    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }

    // Batch create
    await prisma.slot.createMany({ data: slotData });
    await prisma.round.createMany({ data: roundData });
    await prisma.table.createMany({ data: tableData });
    await prisma.tableAssignment.createMany({ data: assignmentData, skipDuplicates: true });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Save assignments failed:", error);
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
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Failed to update round durations:", error);
    redirect(`/admin?error=${encodeURIComponent("Failed to update round durations")}`);
  }
  redirect("/admin?success=updated_durations");
}
