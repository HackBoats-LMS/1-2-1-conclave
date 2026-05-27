"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as xlsx from 'xlsx';

export async function addApprovedUser(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };

  try {
    await prisma.user.upsert({
      where: { email },
      update: { isApproved: true },
      create: { email, isApproved: true, role: "USER" }
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add user" };
  }
}

export async function removeUser(formData: FormData) {
  const email = formData.get("email") as string;
  try {
    await prisma.user.update({
      where: { email },
      data: { isApproved: false }
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { error: "Failed to remove user" };
  }
}

export async function initializeData() {
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
}

export async function startRound(formData: FormData) {
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
  try {
    await prisma.referral.deleteMany({});
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
  }
}

export async function revokeAllAccess() {
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
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return { error: "No file provided" };
    
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
    return { success: true };
  } catch (e) {
    return { error: "Failed to parse excel file" };
  }
}

export async function uploadAssignmentsExcel(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) throw new Error("No file provided");
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<any>(sheet);

    // 1. Extract unique emails
    const allEmails: string[] = Array.from(new Set(data.map(r => r.Email || r.email).filter(Boolean)));

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
      const email = row.Email || row.email;
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
  }
}

