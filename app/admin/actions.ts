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

// ──────────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// ROUND LIFECYCLE CONTROLS
// ──────────────────────────────────────────────

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
      where: { role: { notIn: ["ADMIN"] } },
      data: { isApproved: false }
    });
    await prisma.tableAssignment.deleteMany({});
    revalidatePath("/admin");
  } catch (e) {
    console.error(e);
  }
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

export async function clearAssignments() {
  await requireAdmin();
  try {
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
  } catch (e) {
    console.error(e);
    return;
  }
  redirect("/admin?success=cleared_assignments");
}

// ──────────────────────────────────────────────
// AUTO-GENERATE ASSIGNMENTS (core algorithm)
// ──────────────────────────────────────────────

/**
 * Fisher-Yates shuffle (in-place, O(n))
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a short unique ID for pre-generating Prisma record IDs.
 * Uses crypto.randomUUID() — valid as Prisma String @id.
 */
function genId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate optimal slot grouping for a given number of rounds.
 * Tries to distribute rounds evenly into groups of 3-4.
 */
function calculateSlotGrouping(totalRounds: number): number[] {
  if (totalRounds <= 4) return [totalRounds];
  
  // Try grouping by 4 first, then 3
  if (totalRounds % 4 === 0) {
    return Array(totalRounds / 4).fill(4);
  }
  if (totalRounds % 3 === 0) {
    return Array(totalRounds / 3).fill(3);
  }
  
  // Mixed: fill with 4s, adjust last group
  const slotsOf4 = Math.floor(totalRounds / 4);
  const remainder = totalRounds % 4;
  
  if (remainder === 0) return Array(slotsOf4).fill(4);
  if (remainder === 1 && slotsOf4 > 0) {
    // e.g., 9 = 3+3+3 is better than 4+4+1
    return Array(Math.ceil(totalRounds / 3)).fill(0).map((_, i) => {
      const remaining = totalRounds - i * 3;
      return Math.min(remaining, 3);
    }).filter(n => n > 0);
  }
  if (remainder === 2) {
    // e.g., 6 = 3+3
    const result = Array(slotsOf4).fill(4);
    result.push(2);
    // Actually prefer 3+3 for 6
    if (totalRounds === 6) return [3, 3];
    return result;
  }
  if (remainder === 3) {
    const result = Array(slotsOf4).fill(4);
    result.push(3);
    return result;
  }
  
  // Fallback: ceil(totalRounds / 4) slots
  const slots: number[] = [];
  let left = totalRounds;
  while (left > 0) {
    const chunk = Math.min(left, 4);
    slots.push(chunk);
    left -= chunk;
  }
  return slots;
}

export async function generateAutoAssignments(formData?: FormData) {
  await requireAdmin();

  // Extract Max Rounds from the UI (defaults to 12 if not provided)
  const maxRoundsStr = formData?.get("maxRounds")?.toString();
  const MAX_ROUNDS = maxRoundsStr ? parseInt(maxRoundsStr, 10) : 12;

  try {
    // ── 1. Fetch captains and regular members ──
    const captains = await prisma.user.findMany({
      where: { role: "CAPTAIN", isApproved: true },
      orderBy: { email: 'asc' }
    });
    const members = await prisma.user.findMany({
      where: { role: "USER", isApproved: true },
      orderBy: { email: 'asc' }
    });

    const C = captains.length;
    const M = members.length;

    if (C === 0) throw new Error("No captains found. Upload captain emails first.");
    if (M === 0) throw new Error("No members found. Upload member emails first.");
    if (M < C) throw new Error(`Need at least ${C} members for ${C} captains (tables). Currently have ${M}.`);

    // ── 2. Calculate dimensions ──
    const membersPerTable = Math.floor(M / C);
    const extraTables = M % C; // first 'extraTables' tables get +1 member
    // ── 3. Advanced Optimization: Dynamic Round Generation (Until 100% Coverage) ──
    const memberIds = members.map(m => m.id);
    const captainIds = captains.map(c => c.id);
    
    // Create quick lookup for user groups
    const userGroups = new Map<string, string | null>();
    members.forEach(m => userGroups.set(m.id, m.group));
    captains.forEach(c => userGroups.set(c.id, c.group));

    // Total possible pairs = Member-to-Member pairs + Member-to-Captain pairs.
    // (Captains never meet other Captains because they don't move)
    const totalPossiblePairs = (M * (M - 1) / 2) + (M * C);

    let bestRoundAssignments: { captainId: string; memberIds: string[] }[][] = [];
    let bestRoundCount = Infinity;
    let bestCoverage = -1;
    let finalMet = new Map<string, Set<string>>();

    // Helper to evaluate coverage of a given matrix
    const evaluateCoverage = (matrix: string[][][]) => {
      const met = new Map<string, Set<string>>();
      for (const id of memberIds) met.set(id, new Set());
      for (const id of captainIds) met.set(id, new Set()); // Track captains too

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
      
      let pairs = 0;
      const counted = new Set<string>();
      for (const [id, partners] of met) {
        for (const partner of partners) {
          // Exclude Captain-to-Captain pairs (they can never meet)
          if (captainIds.includes(id) && captainIds.includes(partner)) continue;
          
          const key = id < partner ? `${id}|${partner}` : `${partner}|${id}`;
          if (!counted.has(key)) { counted.add(key); pairs++; }
        }
      }
      return { pairs, met, score: pairs - groupPenalty };
    };

    // Run 10 full simulations and pick the best one
    for (let sim = 0; sim < 10; sim++) {
      const matrix: string[][][] = [];
      const currentMet = new Map<string, Set<string>>();
      for (const id of memberIds) currentMet.set(id, new Set());
      for (const id of captainIds) currentMet.set(id, new Set());
      
      const pool = [...memberIds];

      while (matrix.length < MAX_ROUNDS) {
        // Check if we already hit 100% coverage
        let metCount = 0;
        const counted = new Set<string>();
        for (const [id, partners] of currentMet) {
          for (const partner of partners) {
            if (captainIds.includes(id) && captainIds.includes(partner)) continue;
            const key = id < partner ? `${id}|${partner}` : `${partner}|${id}`;
            if (!counted.has(key)) { counted.add(key); metCount++; }
          }
        }
        if (metCount >= totalPossiblePairs) break;

        // Generate the NEXT round using greedy + swapping
        let bestRound: string[][] = Array.from({ length: C }, () => []);
        let maxNewPairs = -Infinity;

        // Try 20 starting configurations for THIS round
        for (let attempt = 0; attempt < 20; attempt++) {
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
              // Check against captain too
              if (!myMet.has(captainIds[t])) newMeetings++;
              if (myGroup && myGroup === userGroups.get(captainIds[t])) groupPenalty += 10;
              
              const tableScore = newMeetings - groupPenalty;
              
              // We want to maximize the tableScore!
              if (bestTable === -1 || tableScore > bestScore || (tableScore === bestScore && tables[t].length < bestCurrentSize)) {
                bestTable = t; bestScore = tableScore; bestCurrentSize = tables[t].length;
              }
            }
            if (bestTable >= 0) tables[bestTable].push(memberId);
          }

          // Evaluate base new pairs
          const testMatrix = [...matrix, tables];
          evaluateCoverage(testMatrix);

          // Hill climb this round using FAST local delta (O(1) instead of O(N^2))
          // Helper to evaluate just one table
          const evalTableScoreLocal = (tableMembers: string[], capId: string) => {
             let score = 0;
             const all = [...tableMembers, capId];
             for (let i = 0; i < all.length; i++) {
               for (let j = i + 1; j < all.length; j++) {
                  if (!currentMet.get(all[i])!.has(all[j])) score++; // met new person
                  const g1 = userGroups.get(all[i]);
                  const g2 = userGroups.get(all[j]);
                  if (g1 && g2 && g1 === g2) score -= 10; // group penalty
               }
             }
             return score;
          };

          for (let step = 0; step < 2000; step++) {
            const t1 = Math.floor(Math.random() * C);
            const t2 = Math.floor(Math.random() * C);
            if (t1 === t2) continue;
            if (tables[t1].length === 0 || tables[t2].length === 0) continue;

            const m1Idx = Math.floor(Math.random() * tables[t1].length);
            const m2Idx = Math.floor(Math.random() * tables[t2].length);
            const m1 = tables[t1][m1Idx];
            const m2 = tables[t2][m2Idx];

            // Evaluate current score BEFORE swap
            const scoreBefore = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

            // Apply swap
            tables[t1][m1Idx] = m2;
            tables[t2][m2Idx] = m1;
            // Evaluate new score AFTER swap
            const scoreAfter = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

            if (scoreAfter > scoreBefore) {
              // Keep swap, we gained points!
            } else {
              // Undo swap
              tables[t1][m1Idx] = m1;
              tables[t2][m2Idx] = m2;
            }
          }

          // Only do the heavy O(N^2) full evaluation ONCE per attempt, after all 2000 swaps are finished
          const finalTestMatrix = [...matrix, tables];
          const finalEval = evaluateCoverage(finalTestMatrix);
          
          const newScoreAdded = finalEval.score - (evaluateCoverage(matrix).score);
          if (newScoreAdded > maxNewPairs) {
            maxNewPairs = newScoreAdded;
            bestRound = tables.map(t => [...t]);
          }
          if (metCount + (finalEval.pairs - metCount) >= totalPossiblePairs && finalEval.score > 0) break; // found perfect next round
        }

        // Commit best round to matrix
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
        finalMet = currentMet;
      }
    }

    const roundAssignments = bestRoundAssignments;
    const met = finalMet;
    const totalRounds = roundAssignments.length;
    const slotGrouping = calculateSlotGrouping(totalRounds);
    const totalSlots = slotGrouping.length;

    // ── 5. Wipe old data ──
    await prisma.tableAssignment.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.slot.deleteMany({});

    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
    }

    // ── 6. Batch create all records (optimized for free tier) ──

    // Pre-generate all IDs and build data arrays
    const slotData: { id: string; slotNumber: number }[] = [];
    const roundData: { id: string; slotId: string; roundNumber: number; status: string }[] = [];
    const tableData: { id: string; roundId: string; tableNumber: number }[] = [];
    const assignmentData: { userId: string; tableId: string; isCaptain: boolean }[] = [];

    let globalRoundIdx = 0;
    for (let s = 0; s < totalSlots; s++) {
      const slotId = genId();
      slotData.push({ id: slotId, slotNumber: s + 1 });

      const roundsInSlot = slotGrouping[s];
      for (let r = 0; r < roundsInSlot; r++) {
        const roundId = genId();
        roundData.push({ id: roundId, slotId, roundNumber: globalRoundIdx + 1, status: "PENDING" });

        const roundTables = roundAssignments[globalRoundIdx];
        for (let t = 0; t < C; t++) {
          const tableId = genId();
          tableData.push({ id: tableId, roundId, tableNumber: t + 1 });

          // Captain assignment
          assignmentData.push({ userId: roundTables[t].captainId, tableId, isCaptain: true });

          // Member assignments
          for (const memberId of roundTables[t].memberIds) {
            assignmentData.push({ userId: memberId, tableId, isCaptain: false });
          }
        }
        globalRoundIdx++;
      }
    }

    // Execute batch inserts (4 queries total — optimized for connection limits)
    await prisma.slot.createMany({ data: slotData });
    await prisma.round.createMany({ data: roundData });
    await prisma.table.createMany({ data: tableData });
    await prisma.tableAssignment.createMany({ data: assignmentData, skipDuplicates: true });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e: unknown) {
    console.error("Auto-assignment failed:", e);
    // Re-throw to let the UI handle errors
    throw e;
  }

  redirect(`/admin?success=generated`);
}
