import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch referrals json", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
