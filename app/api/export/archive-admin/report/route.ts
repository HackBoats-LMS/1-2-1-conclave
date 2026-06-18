import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    // Run heavily optimized aggregation queries in parallel
    const [roleDistribution, topSenders, topReceivers] = await Promise.all([
      // 1. Role Distribution
      prisma.archivedUser.groupBy({
        by: ['role'],
        where: { eventId },
        _count: { id: true }
      }),

      // 2. Top Senders (using raw query for robust grouping on fromEmail since we don't have a fromUserId in archive)
      prisma.$queryRaw`
        SELECT "fromEmail", "fromName", COUNT(*) as count 
        FROM "ArchivedReferral" 
        WHERE "eventId" = ${eventId} AND "fromEmail" IS NOT NULL
        GROUP BY "fromEmail", "fromName" 
        ORDER BY count DESC 
        LIMIT 10
      `,

      // 3. Top Receivers
      prisma.$queryRaw`
        SELECT "toEmail", "toName", COUNT(*) as count 
        FROM "ArchivedReferral" 
        WHERE "eventId" = ${eventId} AND "toEmail" IS NOT NULL
        GROUP BY "toEmail", "toName" 
        ORDER BY count DESC 
        LIMIT 10
      `
    ]);

    // Format role distribution into a simple object map
    const roles: Record<string, number> = {
      CAPTAIN: 0,
      USER: 0,
      VISITOR: 0,
      ADMIN: 0
    };
    roleDistribution.forEach((r) => {
      roles[r.role] = r._count.id;
    });

    // We serialize the BigInt counts from queryRaw to Numbers for JSON
    const formatTopList = (list: any[]) => list.map(item => ({
      email: item.fromEmail || item.toEmail,
      name: item.fromName || item.toName || "Unknown",
      count: Number(item.count)
    }));

    return NextResponse.json({
      roles,
      topSenders: formatTopList(topSenders as any[]),
      topReceivers: formatTopList(topReceivers as any[])
    });

  } catch (error: any) {
    console.error("Failed to generate archive report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
