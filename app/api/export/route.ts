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
      select: {
        createdAt: true,
        note: true,
        fromUser: {
          select: {
            email: true,
            name: true,
            businessName: true,
          },
        },
        toUser: {
          select: {
            email: true,
            name: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = referrals.map((r: any) => ({
      "Date & Time": r.createdAt.toLocaleString(),
      "Sender Email": r.fromUser.email,
      "Sender Name": r.fromUser.name || r.fromUser.businessName || "N/A",
      "Sender Business": r.fromUser.businessName || "N/A",
      "Receiver Email": r.toUser.email,
      "Receiver Name": r.toUser.name || r.toUser.businessName || "N/A",
      "Receiver Business": r.toUser.businessName || "N/A",
      "Referral Note": r.note || "No note provided"
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    
    // Auto-size columns slightly
    worksheet['!cols'] = [
      { wch: 22 }, // Date
      { wch: 25 }, // Sender Email
      { wch: 20 }, // Sender Name
      { wch: 20 }, // Sender Business
      { wch: 25 }, // Receiver Email
      { wch: 20 }, // Receiver Name
      { wch: 20 }, // Receiver Business
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
    return NextResponse.json({ error: "Failed to generate excel file" }, { status: 500 });
  }
}
