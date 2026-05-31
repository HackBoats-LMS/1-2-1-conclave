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
      "From": r.fromUser.name || r.fromUser.email || "N/A",
      "From Business": r.fromUser.businessName || "N/A",
      "From Category": r.fromUser.businessCategory || "N/A",
      "From Contact": r.fromUser.contactNumber || "N/A",
      "To": r.toUser.name || r.toUser.email || "N/A",
      "To Business": r.toUser.businessName || "N/A",
      "To Category": r.toUser.businessCategory || "N/A",
      "To Contact": r.toUser.contactNumber || "N/A",
      "Note": r.note || "",
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // From Name
      { wch: 20 }, // From Business
      { wch: 15 }, // From Category
      { wch: 15 }, // From Contact
      { wch: 20 }, // To Name
      { wch: 20 }, // To Business
      { wch: 15 }, // To Category
      { wch: 15 }, // To Contact
      { wch: 30 }, // Note
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
