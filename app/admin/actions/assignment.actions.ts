"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, verifyDeletePassword, setSuccess, setError } from "./utils";



export async function clearAssignments(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.tableAssignment.deleteMany({});
      await tx.table.deleteMany({});
      await tx.round.deleteMany({});
      await tx.slot.deleteMany({});

      const state = await tx.gameState.findFirst();
      if (state) {
        await tx.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
      }
    });

  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to clear assignments");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("cleared_assignments");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function fetchUsersForGeneration() {
  await requireAdmin();
  try {
    const captains = await prisma.user.findMany({
      where: { role: "CAPTAIN", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true, businessCategory: true }
    });
    const members = await prisma.user.findMany({
      where: { role: "USER", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true, businessCategory: true }
    });
    const visitors = await prisma.user.findMany({
      where: { role: "VISITOR", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true, businessCategory: true }
    });
    return { captains, members, visitors, error: null };
  } catch (error: any) {
    return { captains: [], members: [], visitors: [], error: error.message };
  }
}

export async function saveRoundChunk(payload: any, isFirstChunk: boolean) {
  await requireAdmin();
  try {
    const { slotData, roundData, tableData, assignmentData } = payload;

    await prisma.$transaction(async (tx) => {
      // If this is the very first chunk being uploaded, wipe the old matrix
      if (isFirstChunk) {
        await tx.tableAssignment.deleteMany({});
        await tx.table.deleteMany({});
        await tx.round.deleteMany({});
        await tx.slot.deleteMany({});

        const state = await tx.gameState.findFirst();
        if (state) {
          await tx.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
        }
      }

      // We use createMany for speed
      if (slotData && slotData.length > 0) {
        await tx.slot.createMany({ data: slotData, skipDuplicates: true });
      }
      
      if (roundData && roundData.length > 0) {
        await tx.round.createMany({ data: roundData });
      }
      
      if (tableData && tableData.length > 0) {
        await tx.table.createMany({ data: tableData });
      }
      
      if (assignmentData && assignmentData.length > 0) {
        await tx.tableAssignment.createMany({ data: assignmentData, skipDuplicates: true });
      }
    }, { maxWait: 10000, timeout: 20000 }); // generous timeout for safety

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Save round chunk failed:", error);
    return { success: false, error: error.message };
  }
}

export async function seatLatecomers() {
  await requireAdmin();
  try {
    // 1. Find all PENDING rounds
    const pendingRounds = await prisma.round.findMany({
      where: { status: "PENDING" },
      orderBy: { roundNumber: 'asc' },
      include: {
        tables: {
          include: {
            assignments: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (pendingRounds.length === 0) {
      return { success: false, error: "No upcoming pending rounds found." };
    }

    // 2. Find all approved users who are NOT in the pending rounds and are NOT admins
    // To do this simply, we get ALL approved users who are not admins...
    const allUsers = await prisma.user.findMany({
      where: { 
        isApproved: true,
        role: { not: "ADMIN" }
      },
      select: { id: true, businessCategory: true, role: true }
    });

    // We will do this round by round
    let totalAssignmentsAdded = 0;

    for (const round of pendingRounds) {
      // Find who is already seated in this round
      const seatedUserIds = new Set<string>();
      for (const t of round.tables) {
        for (const a of t.assignments) {
          seatedUserIds.add(a.userId);
        }
      }

      // Find the unseated latecomers for this round
      const unseatedUsers = allUsers.filter(u => !seatedUserIds.has(u.id));

      if (unseatedUsers.length === 0) continue;

      const newAssignments = [];

      for (const u of unseatedUsers) {
        // Quick scoring function to find the best table
        // We want to avoid matching business categories
        let bestTableId = round.tables[0]?.id;
        let bestScore = -Infinity;

        for (const t of round.tables) {
          let score = 0;
          
          // Penalize for size to keep tables somewhat balanced
          score -= (t.assignments.length * 10);

          // Penalize for category collision
          for (const existingAssignment of t.assignments) {
            const existingCat = existingAssignment.user.businessCategory;
            if (existingCat && u.businessCategory && existingCat === u.businessCategory && existingCat !== "N/A") {
              score -= 500;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestTableId = t.id;
          }
        }

        if (bestTableId) {
          newAssignments.push({
            userId: u.id,
            tableId: bestTableId,
            isCaptain: u.role === "CAPTAIN"
          });
          
          // Temporarily add them to the table's assignments so the next latecomer in the loop avoids them if same category
          const table = round.tables.find(t => t.id === bestTableId);
          if (table) {
            table.assignments.push({ user: { businessCategory: u.businessCategory } } as any);
          }
        }
      }

      // Insert all new assignments for this round
      if (newAssignments.length > 0) {
        await prisma.tableAssignment.createMany({
          data: newAssignments,
          skipDuplicates: true
        });
        totalAssignmentsAdded += newAssignments.length;
      }
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, count: totalAssignmentsAdded };
  } catch (e: any) {
    console.error("Failed to seat latecomers:", e);
    return { success: false, error: e.message };
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
