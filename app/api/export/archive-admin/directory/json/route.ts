import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const users = await prisma.archivedUser.findMany({
      where: { eventId: eventId },
      orderBy: { createdAt: "asc" }
    });

    const data = users.map((u: any) => ({
      "Name": u.name || "N/A",
      "Email": u.email || "N/A",
      "Role": u.role,
      "Business Name": u.businessName || "N/A",
      "Business Category": u.businessCategory || "N/A",
      "Contact Number": u.contactNumber || "N/A",
      "Created At": u.createdAt.toLocaleString(),
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
