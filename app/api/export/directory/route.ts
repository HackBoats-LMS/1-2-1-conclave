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

    const users = await prisma.user.findMany({
      orderBy: { email: "asc" }
    });

    const data = users.map((u: any) => ({
      "Name": u.name || "N/A",
      "Email": u.email || "N/A",
      "Role": u.role,
      "Business Name": u.businessName || "N/A",
      "Business Category": u.businessCategory || "N/A",
      "Contact Number": u.contactNumber || "N/A",
      "Onboarded": u.onboardingCompleted ? "Yes" : "No",
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    
    worksheet['!cols'] = [
      { wch: 25 }, // Name
      { wch: 35 }, // Email
      { wch: 15 }, // Role
      { wch: 25 }, // Business Name
      { wch: 25 }, // Business Category
      { wch: 15 }, // Contact Number
      { wch: 10 }, // Onboarded
      { wch: 25 }, // Created At
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Directory");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": 'attachment; filename="conclave_directory.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate excel file" }, { status: 500 });
  }
}
