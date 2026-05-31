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
      include: {
        user: true,
        table: {
          include: {
            round: {
              include: { slot: true }
            }
          }
        }
      }
    });

    const data = (assignments as any[])
      .map(a => ({
        "Slot": `Slot ${a.table.round.slot.slotNumber}`,
        "Round": `Round ${a.table.round.roundNumber}`,
        "Table": `Table ${a.table.tableNumber}`,
        "Role": a.isCaptain ? "CAPTAIN" : "MEMBER",
        "Email": a.user.email || "N/A",
        "Name": a.user.name || a.user.businessName || "N/A",
        "Business": a.user.businessName || "N/A",
        "Category": a.user.businessCategory || "N/A",
      }))
      .sort((a, b) => {
        // Sort by Slot → Round → Table → Role (captains first)
        if (a["Slot"] !== b["Slot"]) return a["Slot"].localeCompare(b["Slot"]);
        if (a["Round"] !== b["Round"]) return a["Round"].localeCompare(b["Round"]);
        if (a["Table"] !== b["Table"]) return a["Table"].localeCompare(b["Table"]);
        if (a["Role"] !== b["Role"]) return a["Role"] === "CAPTAIN" ? -1 : 1;
        return 0;
      });

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
