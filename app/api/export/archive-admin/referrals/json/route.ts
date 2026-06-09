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
    const userEmail = searchParams.get("userEmail");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const whereClause: any = { eventId: eventId };
    if (userEmail) {
      // If userEmail is provided, fetch referrals WHERE they are the receiver (To Email)
      // or optionally where they are the sender, but usually users want their received leads.
      whereClause.toEmail = userEmail;
    }

    const referrals = await prisma.archivedReferral.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });

    const data = referrals.map(r => ({
      Date: r.createdAt.toLocaleString(),
      From: r.fromName || "N/A",
      "From Email": r.fromEmail || "N/A",
      To: r.toName || "N/A",
      "To Email": r.toEmail || "N/A",
      Note: r.note || "No note provided"
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch archived referrals" }, { status: 500 });
  }
}
