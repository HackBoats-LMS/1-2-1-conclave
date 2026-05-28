"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as xlsx from 'xlsx';

import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}


export async function addManualUser(formData: FormData) {
  await requireAdmin();
  const email = formData.get("email") as string;
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
  const email = formData.get("email") as string;
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
  try {
    await prisma.user.delete({
      where: { id: userId }
    });
    revalidatePath("/admin");
  } catch (error) {
    console.error(error);
    return;
  }
  redirect("/admin?success=deleted_user");
}

export async function removeAllUsers() {
  await requireAdmin();
  try {
    await prisma.user.deleteMany({
      where: { role: { not: "ADMIN" } }
    });
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
    return;
  }
  redirect("/admin?success=cleared_members");
}

export async function initializeData() {
  await requireAdmin();
  const existing = await prisma.slot.count();
  if (existing > 0) throw new Error("Already initialized");

  for (let s = 1; s <= 2; s++) {
    const slot = await prisma.slot.create({ data: { slotNumber: s } });
    for (let r = 1; r <= 4; r++) {
      const round = await prisma.round.create({
        data: { slotId: slot.id, roundNumber: r, status: "PENDING" }
      });
      for (let t = 1; t <= 8; t++) {
        await prisma.table.create({
          data: { roundId: round.id, tableNumber: t }
        });
      }
    }
  }
  revalidatePath("/admin");
  redirect("/admin?success=initialized");
}

export async function startRound(formData: FormData) {
  await requireAdmin();
  const roundId = formData.get("roundId") as string;
  try {
    await prisma.round.update({
      where: { id: roundId },
      data: { status: "IN_PROGRESS", startTime: new Date() }
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

export async function clearReferrals() {
  await requireAdmin();
  try {
    await prisma.referral.deleteMany({});
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
    return;
  }
  redirect("/admin?success=cleared_referrals");
}

export async function revokeAllAccess() {
  await requireAdmin();
  try {
    await prisma.user.updateMany({
      data: { isApproved: false }
    });
    await prisma.tableAssignment.deleteMany({});
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
  }
}

export async function uploadWhitelistExcel(formData: FormData) {
  await requireAdmin();
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<any>(sheet);

    for (const row of data) {
      const email = row.Email || row.email;
      if (!email) continue;
      await prisma.user.upsert({
        where: { email },
        update: { isApproved: true },
        create: { email, isApproved: true, role: "USER" }
      });
    }
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
  }
}

export async function uploadAssignmentsExcel(formData: FormData) {
  await requireAdmin();
  let emailsCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) throw new Error("No file provided");
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<any>(sheet);

    // 0. Wipe all old assignments so re-uploads always start clean
    await prisma.tableAssignment.deleteMany({});

    // 1. Extract unique emails, trimming and lowercasing to avoid duplicates like "User@gmail.com" and "user@gmail.com"
    const allEmails: string[] = Array.from(
      new Set(
        data
          .map((r: any) => {
            const rawEmail = r.Email || r.email;
            return typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : rawEmail;
          })
          .filter(Boolean)
      )
    );
    emailsCount = allEmails.length;

    // 2. Bulk upsert users sequentially (Prisma doesn't have createManyUpsert yet)
    // but it's much faster than doing the other queries inside the loop too.
    for (const email of allEmails) {
      await prisma.user.upsert({
        where: { email },
        update: { isApproved: true },
        create: { email, isApproved: true, role: "USER" }
      });
    }

    // 3. Fetch all users, slots, rounds, and tables into memory for instant lookup
    const dbUsers = await prisma.user.findMany({ where: { email: { in: allEmails } } });
    const userMap = new Map(dbUsers.map((u: any) => [u.email as string, u.id]));

    const allSlots = await prisma.slot.findMany({
      include: { rounds: { include: { tables: true } } }
    });

    const tableMap = new Map();
    for (const slot of allSlots) {
      for (const round of slot.rounds) {
        for (const table of round.tables) {
          tableMap.set(`${slot.slotNumber}-${round.roundNumber}-${table.tableNumber}`, table.id);
        }
      }
    }

    // 4. Construct assignments array
    const assignmentsToCreate = [];
    for (const row of data) {
      const rawEmail = row.Email || row.email;
      const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : rawEmail;
      const slotNum = parseInt(row.Slot || row.slot);
      const roundNum = parseInt(row.Round || row.round);
      const tableNum = parseInt(row.Table || row.table);

      if (!email || isNaN(slotNum) || isNaN(roundNum) || isNaN(tableNum)) continue;

      const userId = userMap.get(email);
      const tableId = tableMap.get(`${slotNum}-${roundNum}-${tableNum}`);

      if (userId && tableId) {
        assignmentsToCreate.push({ userId, tableId });
      }
    }

    // 5. Bulk insert assignments
    if (assignmentsToCreate.length > 0) {
      await prisma.tableAssignment.createMany({
        data: assignmentsToCreate,
        skipDuplicates: true,
      });
    }

    revalidatePath("/admin");
  } catch (e) {
    console.error("Failed to process assignments excel", e);
    return;
  }
  
  redirect(`/admin?success=uploaded_assignments&added=${emailsCount}`);
}

