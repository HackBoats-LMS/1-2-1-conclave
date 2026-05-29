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
      const emailKey = Object.keys(row).find(key => 
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (!email) continue;
        await prisma.user.upsert({
          where: { email },
          update: { isApproved: true },
          create: { email, isApproved: true, role: "USER" }
        });
      }
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

    // 0. Wipe old mappings to start completely fresh based on the uploaded spreadsheet
    await prisma.tableAssignment.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.slot.deleteMany({});

    // Reset current active round in GameState
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { currentRoundId: null }
      });
    }

    // Helper function to extract digits from string or number values
    const parseNum = (val: any): number => {
      if (val === null || val === undefined) return NaN;
      if (typeof val === "number") return val;
      const match = String(val).match(/\d+/);
      return match ? parseInt(match[0], 10) : NaN;
    };

    // 1. Extract ALL unique emails from any email-like columns to guarantee whitelisting
    const allEmailsSet = new Set<string>();
    
    data.forEach((row: any) => {
      const emailKey = Object.keys(row).find(key => 
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const cleaned = rawEmail.trim().toLowerCase();
        if (cleaned) {
          allEmailsSet.add(cleaned);
        }
      }
    });

    const allEmails = Array.from(allEmailsSet);
    emailsCount = allEmails.length;

    // 2. Upsert all unique users sequentially to grant approved access
    for (const email of allEmails) {
      await prisma.user.upsert({
        where: { email },
        update: { isApproved: true },
        create: { email, isApproved: true, role: "USER" }
      });
    }

    // 3. Clean, parse, and validate data rows for table assignments
    const parsedRows = data.map((row: any) => {
      const emailKey = Object.keys(row).find(key => 
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const rawEmail = emailKey ? row[emailKey] : null;
      const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

      const slotKey = Object.keys(row).find(key => key.toLowerCase().includes("slot"));
      const roundKey = Object.keys(row).find(key => key.toLowerCase().includes("round"));
      const tableKey = Object.keys(row).find(key => key.toLowerCase().includes("table"));
      const captainKey = Object.keys(row).find(key => key.toLowerCase().includes("captain"));

      const slotNum = slotKey ? parseNum(row[slotKey]) : NaN;
      const roundNum = roundKey ? parseNum(row[roundKey]) : NaN;
      const tableNum = tableKey ? parseNum(row[tableKey]) : NaN;
      const isCaptain = captainKey ? String(row[captainKey]).trim().toLowerCase() === "yes" : false;

      return { email, slotNum, roundNum, tableNum, isCaptain };
    }).filter(r => r.email && !isNaN(r.slotNum) && !isNaN(r.roundNum) && !isNaN(r.tableNum));

    // Map users to their IDs
    const dbUsers = await prisma.user.findMany({ where: { email: { in: allEmails } } });
    const userMap = new Map(dbUsers.map((u: any) => [u.email as string, u.id]));

    // 3. Dynamically generate Slots
    const uniqueSlots = Array.from(new Set(parsedRows.map(r => r.slotNum))).sort((a, b) => a - b);
    const slotMap = new Map(); // slotNum -> slotId
    for (const slotNum of uniqueSlots) {
      const dbSlot = await prisma.slot.create({
        data: { slotNumber: slotNum }
      });
      slotMap.set(slotNum, dbSlot.id);
    }

    // 4. Dynamically generate Rounds
    const uniqueRoundKeys = Array.from(new Set(parsedRows.map(r => `${r.slotNum}-${r.roundNum}`)));
    const roundMap = new Map(); // "slotNum-roundNum" -> roundId
    for (const key of uniqueRoundKeys) {
      const [slotNumStr, roundNumStr] = key.split("-");
      const slotNum = parseInt(slotNumStr);
      const roundNum = parseInt(roundNumStr);
      const slotId = slotMap.get(slotNum);
      if (slotId) {
        const dbRound = await prisma.round.create({
          data: {
            slotId,
            roundNumber: roundNum,
            status: "PENDING"
          }
        });
        roundMap.set(key, dbRound.id);
      }
    }

    // 5. Dynamically generate Tables
    const uniqueTableKeys = Array.from(new Set(parsedRows.map(r => `${r.slotNum}-${r.roundNum}-${r.tableNum}`)));
    const tableMap = new Map(); // "slotNum-roundNum-tableNum" -> tableId
    for (const key of uniqueTableKeys) {
      const [slotNumStr, roundNumStr, tableNumStr] = key.split("-");
      const slotNum = parseInt(slotNumStr);
      const roundNum = parseInt(roundNumStr);
      const tableNum = parseInt(tableNumStr);
      const roundId = roundMap.get(`${slotNum}-${roundNum}`);
      if (roundId) {
        const dbTable = await prisma.table.create({
          data: {
            roundId,
            tableNumber: tableNum
          }
        });
        tableMap.set(key, dbTable.id);
      }
    }

    // 6. Map and bulk insert TableAssignments (with captain flag)
    const assignmentsToCreate = [];
    for (const row of parsedRows) {
      const userId = userMap.get(row.email);
      const tableId = tableMap.get(`${row.slotNum}-${row.roundNum}-${row.tableNum}`);
      if (userId && tableId) {
        assignmentsToCreate.push({ userId, tableId, isCaptain: row.isCaptain });
      }
    }

    if (assignmentsToCreate.length > 0) {
      await prisma.tableAssignment.createMany({
        data: assignmentsToCreate,
        skipDuplicates: true,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error("Failed to process assignments excel", e);
    return;
  }
  
  redirect(`/admin?success=uploaded_assignments&added=${emailsCount}`);
}

