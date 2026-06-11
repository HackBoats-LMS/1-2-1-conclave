import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gameState = await prisma.gameState.findFirst();

  let activeRound = null;
  if (gameState?.currentRoundId) {
    activeRound = await prisma.round.findUnique({
      where: { id: gameState.currentRoundId },
      select: { id: true, status: true, startTime: true, durationMinutes: true, roundNumber: true },
    });
  }

  const lastCompletedRound = await prisma.round.findFirst({
    where: { status: "COMPLETED" },
    orderBy: [{ slot: { slotNumber: "desc" } }, { roundNumber: "desc" }],
    select: { endedAt: true, startTime: true, durationMinutes: true },
  });

  let lastRoundEndedAt: string | null = null;
  if (lastCompletedRound?.endedAt) {
    lastRoundEndedAt = lastCompletedRound.endedAt.toISOString();
  } else if (lastCompletedRound?.startTime) {
    lastRoundEndedAt = new Date(
      lastCompletedRound.startTime.getTime() + lastCompletedRound.durationMinutes * 60000
    ).toISOString();
  }

  const nextPendingRound = gameState?.isAutoMode
    ? await prisma.round.findFirst({
        where: { status: "PENDING" },
        orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
        select: { id: true },
      })
    : null;

  const rounds = await prisma.round.findMany({ select: { status: true } });
  const allRoundsCompleted =
    rounds.length > 0 &&
    rounds.every((r) => r.status === "COMPLETED") &&
    !gameState?.currentRoundId;

  return NextResponse.json({
    isRoundActive: !!activeRound,
    activeRound,
    lastRoundEndedAt,
    shiftDuration: gameState?.shiftDuration || 3,
    isAutoMode: !!gameState?.isAutoMode,
    nextRoundId: nextPendingRound?.id || null,
    allRoundsCompleted,
  });
}
