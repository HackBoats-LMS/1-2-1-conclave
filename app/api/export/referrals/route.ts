import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referrals = await prisma.referral.findMany({
      include: {
        fromUser: true,
        toUser: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const data = referrals.map(r => ({
      "Date": r.createdAt.toISOString().split('T')[0],
      "From Name": r.fromUser.name || r.fromUser.businessName || "N/A",
      "From Email": r.fromUser.email || "N/A",
      "To Name": r.toUser.name || r.toUser.businessName || "N/A",
      "To Email": r.toUser.email || "N/A",
      "Note": r.note || "",
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    
    worksheet['!cols'] = [
      { wch: 15 }, // Date
      { wch: 20 }, // From Name
      { wch: 30 }, // From Email
      { wch: 20 }, // To Name
      { wch: 30 }, // To Email
      { wch: 40 }, // Note
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Referrals");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": 'attachment; filename="conclave_referrals.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    });
  } catch (error) {
    console.error("Failed to generate referrals excel", error);
    return NextResponse.json({ error: "Failed to generate excel file" }, { status: 500 });
  }
}
