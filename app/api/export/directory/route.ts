import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    const usersRaw = await prisma.user.findMany({
      orderBy: { email: "asc" }
    });

    const users = [...usersRaw].sort((a, b) => {
      const roleOrder: Record<string, number> = {
        CAPTAIN: 1,
        USER: 2,
        ADMIN: 3
      };
      const priorityA = roleOrder[a.role] || 99;
      const priorityB = roleOrder[b.role] || 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      const emailA = a.email || "";
      const emailB = b.email || "";
      return emailA.localeCompare(emailB);
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
