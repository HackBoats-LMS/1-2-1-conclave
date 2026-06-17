import { prisma, getCachedGameState } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Lightweight leaderboard endpoint — 3 DB queries only.
 * Used by LiveLeaderboardClient and BigShiftingTimerClient
 * instead of /api/game-state (which runs 6 queries and fetches
 * the full referralUsers list unnecessarily for the leaderboard).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isApproved: true },
  });

  if (!dbUser || !dbUser.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [gameState, lastCompletedRound, topSenders] = await Promise.all([
    getCachedGameState(),
    prisma.round.findFirst({
      where: { status: "COMPLETED" },
      orderBy: [{ slot: { slotNumber: "desc" } }, { roundNumber: "desc" }],
      select: { endedAt: true, startTime: true, durationMinutes: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["USER", "CAPTAIN"] } },
      select: {
        id: true,
        name: true,
        businessCategory: true,
        _count: { select: { sentReferrals: true } },
      },
      orderBy: { sentReferrals: { _count: "desc" } },
      take: 10,
    }),
  ]);

  // Resolve activeRound only if there is one — adds 1 query if active, 0 if not
  const activeRound = gameState?.currentRoundId
    ? await prisma.round.findUnique({
      where: { id: gameState.currentRoundId },
      select: {
        id: true,
        status: true,
        startTime: true,
        durationMinutes: true,
        roundNumber: true,
      },
    })
    : null;

  // Resolve nextPendingRound only in auto mode
  const nextPendingRound =
    gameState?.isAutoMode && !activeRound
      ? await prisma.round.findFirst({
        where: { status: "PENDING" },
        orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
        select: { id: true },
      })
      : null;

  let lastRoundEndedAt: string | null = null;
  if (lastCompletedRound?.endedAt) {
    lastRoundEndedAt = lastCompletedRound.endedAt.toISOString();
  } else if (lastCompletedRound?.startTime) {
    lastRoundEndedAt = new Date(
      lastCompletedRound.startTime.getTime() +
      lastCompletedRound.durationMinutes * 60000
    ).toISOString();
  }

  return NextResponse.json({
    isRoundActive: !!activeRound,
    activeRound,
    lastRoundEndedAt,
    shiftDuration: gameState?.shiftDuration ?? 3,
    isAutoMode: !!gameState?.isAutoMode,
    nextRoundId: nextPendingRound?.id ?? null,
    topSenders,
  });
}
