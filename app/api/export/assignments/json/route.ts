import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch assignments json", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
