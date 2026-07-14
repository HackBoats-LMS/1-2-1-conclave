"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { requireAdmin, setSuccess, setError, genId } from "./utils";

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

    const usersData: { email: string; group: string | null; chapterName: string | null; regionName: string | null }[] = [];
    for (const row of data) {
      const emailKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const groupKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("group") || key.toLowerCase().includes("college") || key.toLowerCase().includes("company") || key.toLowerCase().includes("org")
      );
      const chapterKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("chapter")
      );
      const regionKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("region")
      );

      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (email) {
          usersData.push({
            email,
            group: groupKey && row[groupKey] ? String(row[groupKey]).trim() : null,
            chapterName: chapterKey && row[chapterKey] ? String(row[chapterKey]).trim() : null,
            regionName: regionKey && row[regionKey] ? String(row[regionKey]).trim() : null
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
          group: u.group,
          chapterName: u.chapterName,
          regionName: u.regionName
        })),
        skipDuplicates: true
      });
    }

    if (toUpdate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        await prisma.$transaction(
          batch.map(u => prisma.user.update({
            where: { email: u.email },
            data: { isApproved: true, group: u.group, chapterName: u.chapterName, regionName: u.regionName }
          }))
        );
      }
    }
    emailsCount = usersData.length;
  } catch (e) {
    console.error(e);
    return;
  }
  await setSuccess(`uploaded_whitelist&added=${emailsCount}`);
  revalidatePath("/admin");
}

export async function uploadVisitorExcel(formData: FormData) {
  await requireAdmin();
  let visitorCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const usersData: { email: string; businessCategory: string | null; chapterName: string | null; regionName: string | null }[] = [];
    for (const row of data) {
      const emailKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      // Fallback to checking group/category if the excel has it
      const catKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("category") || key.toLowerCase().includes("group") || key.toLowerCase().includes("business")
      );
      const chapterKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("chapter")
      );
      const regionKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("region")
      );

      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (email) {
          usersData.push({
            email,
            businessCategory: catKey && row[catKey] ? String(row[catKey]).trim() : null,
            chapterName: chapterKey && row[chapterKey] ? String(row[chapterKey]).trim() : null,
            regionName: regionKey && row[regionKey] ? String(row[regionKey]).trim() : null
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
          role: "VISITOR",
          businessCategory: u.businessCategory,
          chapterName: u.chapterName,
          regionName: u.regionName
        })),
        skipDuplicates: true
      });
    }

    if (toUpdate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        await prisma.$transaction(
          batch.map(u => prisma.user.update({
            where: { email: u.email },
            data: { isApproved: true, role: "VISITOR", businessCategory: u.businessCategory, chapterName: u.chapterName, regionName: u.regionName }
          }))
        );
      }
    }
    visitorCount = usersData.length;
  } catch (e) {
    console.error(e);
    return;
  }
  await setSuccess(`uploaded_visitors&added=${visitorCount}`);
  revalidatePath("/admin");
}

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

    const usersData: { email: string; group: string | null; chapterName: string | null; regionName: string | null }[] = [];
    for (const row of data) {
      const emailKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("email") || key.toLowerCase() === "mail" || key.toLowerCase() === "user"
      );
      const groupKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("group") || key.toLowerCase().includes("college") || key.toLowerCase().includes("company") || key.toLowerCase().includes("org")
      );
      const chapterKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("chapter")
      );
      const regionKey = Object.keys(row).find(key =>
        key.toLowerCase().includes("region")
      );

      const rawEmail = emailKey ? row[emailKey] : null;
      if (typeof rawEmail === "string") {
        const email = rawEmail.trim().toLowerCase();
        if (email) {
          usersData.push({
            email,
            group: groupKey && row[groupKey] ? String(row[groupKey]).trim() : null,
            chapterName: chapterKey && row[chapterKey] ? String(row[chapterKey]).trim() : null,
            regionName: regionKey && row[regionKey] ? String(row[regionKey]).trim() : null
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
          group: u.group,
          chapterName: u.chapterName,
          regionName: u.regionName
        })),
        skipDuplicates: true
      });
    }

    if (toUpdate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        await prisma.$transaction(
          batch.map(u => prisma.user.update({
            where: { email: u.email },
            data: { isApproved: true, role: "CAPTAIN", group: u.group, chapterName: u.chapterName, regionName: u.regionName }
          }))
        );
      }
    }
    captainCount = usersData.length;
  } catch (e) {
    console.error(e);
    return;
  }
  await setSuccess(`uploaded_captains&added=${captainCount}`);
  revalidatePath("/admin");
}

export async function uploadAssignmentsExcel(formData: FormData) {
  await requireAdmin();
  let assignmentsCount = 0;
  try {
    const file = formData.get("file") as File;
    if (!file || !file.size) return;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const rows: { email: string; role: string; slot: number; round: number; table: number }[] = [];

    for (const row of data) {
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

    if (rows.length === 0) throw new Error("No valid assignment rows found.");

    const emails = [...new Set(rows.map(r => r.email))];
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));

    const missingUsers = rows
      .filter(r => !existingEmails.has(r.email))
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

    const allRelevantUsers = await prisma.user.findMany({
      where: { email: { in: emails } }
    });
    const userEmailToId = new Map(allRelevantUsers.map(u => [u.email?.toLowerCase() || "", u.id]));

    const slotData: { id: string; slotNumber: number }[] = [];
    const roundData: { id: string; slotId: string; roundNumber: number; status: string; durationMinutes: number }[] = [];
    const tableData: { id: string; roundId: string; tableNumber: number }[] = [];
    const assignmentData: { userId: string; tableId: string; isCaptain: boolean }[] = [];

    const slotMap = new Map<number, string>(); 
    const roundMap = new Map<string, string>(); 
    const tableMap = new Map<string, string>(); 

    for (const row of rows) {
      if (!slotMap.has(row.slot)) {
        const slotId = genId();
        slotMap.set(row.slot, slotId);
        slotData.push({ id: slotId, slotNumber: row.slot });
      }
      const slotId = slotMap.get(row.slot)!;

      const roundKey = `${row.slot}_${row.round}`;
      if (!roundMap.has(roundKey)) {
        const roundId = genId();
        roundMap.set(roundKey, roundId);
        roundData.push({
          id: roundId,
          slotId: slotId,
          roundNumber: row.round,
          status: "PENDING",
          durationMinutes: 15
        });
      }
      const roundId = roundMap.get(roundKey)!;

      const tableKey = `${roundId}_${row.table}`;
      if (!tableMap.has(tableKey)) {
        const tableId = genId();
        tableMap.set(tableKey, tableId);
        tableData.push({
          id: tableId,
          roundId: roundId,
          tableNumber: row.table
        });
      }
      const tableId = tableMap.get(tableKey)!;

      const userId = userEmailToId.get(row.email);
      if (userId) {
        assignmentData.push({
          userId,
          tableId,
          isCaptain: row.role === "CAPTAIN"
        });
      }
    }

    // ACID Transaction for applying assignments
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
    }, { maxWait: 5000, timeout: 20000 });

    assignmentsCount = assignmentData.length;
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Upload failed");
    revalidatePath("/admin");
    return;
  }
  await setSuccess(`uploaded_assignments&added=${assignmentsCount}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}
