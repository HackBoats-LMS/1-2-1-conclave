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
      select: { id: true, email: true, group: true, businessCategory: true, chapterName: true }
    });
    const members = await prisma.user.findMany({
      where: { role: "USER", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true, businessCategory: true, chapterName: true }
    });
    const visitors = await prisma.user.findMany({
      where: { role: "VISITOR", isApproved: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, group: true, businessCategory: true, chapterName: true }
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

    // 2. Find all approved users who are NOT in the pending rounds
    // Filter out admins so they don't get seated at tables!
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
        // If the latecomer is a CAPTAIN, they need their own brand new table!
        if (u.role === "CAPTAIN") {
          const maxTableNum = Math.max(...round.tables.map(t => t.tableNumber), 0);
          const newTable = await prisma.table.create({
            data: {
              roundId: round.id,
              tableNumber: maxTableNum + 1
            }
          });

          // Add this new table to our local tracking so other non-captain latecomers can join it
          round.tables.push({
            id: newTable.id,
            roundId: round.id,
            tableNumber: newTable.tableNumber,
            assignments: [
              { user: { businessCategory: u.businessCategory, role: "CAPTAIN" } }
            ]
          } as any);

          newAssignments.push({
            userId: u.id,
            tableId: newTable.id,
            isCaptain: true
          });

          continue;
        }

        // Quick scoring function to find the best table for Members/Visitors
        // We want to avoid matching business categories
        let bestTableId: string | undefined = undefined;
        let bestScore = -Infinity;

        for (const t of round.tables) {
          let score = 0;
          
          // PRIMARY: penalize heavily for size to keep tables balanced
          // This ensures the smallest table is always preferred
          score -= (t.assignments.length * 1000);

          // SECONDARY: light penalty for category collision (tiebreaker only)
          for (const existingAssignment of t.assignments) {
            const existingCat = existingAssignment.user.businessCategory;
            if (existingCat && u.businessCategory && existingCat === u.businessCategory && existingCat !== "N/A") {
              score -= 50;
            }
          }

          // Use >= with random tiebreaker so equal-scoring tables get fair distribution
          // instead of always defaulting to the first table
          if (score > bestScore || (score === bestScore && Math.random() < 0.5)) {
            bestScore = score;
            bestTableId = t.id;
          }
        }

        // Fallback: if somehow no table was picked, use the first one
        if (!bestTableId) {
          bestTableId = round.tables[0]?.id;
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

    await setSuccess("seated_latecomers");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, count: totalAssignmentsAdded };
  } catch (e: any) {
    console.error("Failed to seat latecomers:", e);
    await setError(e.message || "Failed to seat latecomers");
    return { success: false, error: e.message };
  }
}

export async function getLatecomersPreview() {
  await requireAdmin();
  try {
    const pendingRounds = await prisma.round.findMany({
      where: { status: "PENDING" },
      include: {
        tables: {
          include: {
            assignments: { select: { userId: true } }
          }
        }
      }
    });

    if (pendingRounds.length === 0) return { success: true, missingUsers: [] };

    const allUsers = await prisma.user.findMany({
      where: { isApproved: true, role: { not: "ADMIN" } },
      select: { id: true, name: true, email: true, role: true, businessCategory: true }
    });

    const missingUsersMap = new Map<string, any>();

    for (const round of pendingRounds) {
      const seatedUserIds = new Set<string>();
      for (const t of round.tables) {
        for (const a of t.assignments) {
          seatedUserIds.add(a.userId);
        }
      }

      for (const u of allUsers) {
        if (!seatedUserIds.has(u.id)) {
          if (!missingUsersMap.has(u.id)) {
            missingUsersMap.set(u.id, {
              ...u,
              missingInRounds: [round.roundNumber]
            });
          } else {
            missingUsersMap.get(u.id).missingInRounds.push(round.roundNumber);
          }
        }
      }
    }

    return { success: true, missingUsers: Array.from(missingUsersMap.values()) };
  } catch (e: any) {
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
