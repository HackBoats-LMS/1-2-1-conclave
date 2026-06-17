import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    // Auth check — only admins can download
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.tableAssignment.findMany({
      select: {
        isCaptain: true,
        user: {
          select: {
            email: true,
            name: true,
            businessName: true,
            businessCategory: true,
          },
        },
        table: {
          select: {
            tableNumber: true,
            round: {
              select: {
                roundNumber: true,
                slot: { select: { slotNumber: true } },
              },
            },
          },
        },
      },
      // Sort at DB level — no JS .sort() needed
      orderBy: [
        { table: { round: { slot: { slotNumber: "asc" } } } },
        { table: { round: { roundNumber: "asc" } } },
        { table: { tableNumber: "asc" } },
        { isCaptain: "desc" }, // captains first
      ],
    });

    const data = assignments.map((a) => ({
      "Slot": `Slot ${a.table.round.slot.slotNumber}`,
      "Round": `Round ${a.table.round.roundNumber}`,
      "Table": `Table ${a.table.tableNumber}`,
      "Role": a.isCaptain ? "CAPTAIN" : "MEMBER",
      "Email": a.user.email || "N/A",
      "Name": a.user.name || a.user.businessName || "N/A",
      "Business": a.user.businessName || "N/A",
      "Category": a.user.businessCategory || "N/A",
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    
    worksheet['!cols'] = [
      { wch: 10 }, // Slot
      { wch: 10 }, // Round
      { wch: 10 }, // Table
      { wch: 10 }, // Role
      { wch: 30 }, // Email
      { wch: 20 }, // Name
      { wch: 20 }, // Business
      { wch: 15 }, // Category
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Assignments");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": 'attachment; filename="conclave_assignments.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    });
  } catch (error) {
    console.error("Failed to generate assignments excel", error);
    return NextResponse.json({ error: "Failed to generate excel file" }, { status: 500 });
  }
}
