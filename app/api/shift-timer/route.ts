import { prisma, getCachedGameState } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Ultra-lightweight shift timer endpoint — 2 DB queries only.
 * Used by BigShiftingTimerClient as a targeted alternative to
 * /api/game-state when only shift/timer data is needed.
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

  const [gameState, lastCompletedRound] = await Promise.all([
    getCachedGameState(),
    prisma.round.findFirst({
      where: { status: "COMPLETED" },
      orderBy: [{ slot: { slotNumber: "desc" } }, { roundNumber: "desc" }],
      select: { endedAt: true, startTime: true, durationMinutes: true },
    }),
  ]);

  const nextPendingRound =
    gameState?.isAutoMode && !gameState?.currentRoundId
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
    isRoundActive: !!gameState?.currentRoundId,
    lastRoundEndedAt,
    shiftDuration: gameState?.shiftDuration ?? 3,
    isAutoMode: !!gameState?.isAutoMode,
    nextRoundId: nextPendingRound?.id ?? null,
  });
}
