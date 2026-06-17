import { prisma, getCachedGameState } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  // Batch 1: gameState + lastCompletedRound are fully independent — run in parallel
  const [gameState, lastCompletedRound] = await Promise.all([
    getCachedGameState(),
    prisma.round.findFirst({
      where: { status: "COMPLETED" },
      orderBy: [{ slot: { slotNumber: "desc" } }, { roundNumber: "desc" }],
      select: { endedAt: true, startTime: true, durationMinutes: true },
    }),
  ]);

  // Batch 2: everything that depends on gameState runs in parallel
  const [activeRound, nextPendingRound, totalRounds, completedRoundCount, topSenders, referralUsers] =
    await Promise.all([
      gameState?.currentRoundId
        ? prisma.round.findUnique({
          where: { id: gameState.currentRoundId },
          select: { id: true, status: true, startTime: true, durationMinutes: true, roundNumber: true },
        })
        : null,
      gameState?.isAutoMode
        ? prisma.round.findFirst({
          where: { status: "PENDING" },
          orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
          select: { id: true },
        })
        : null,
      // Use count() instead of findMany() — same boolean result, much less data
      prisma.round.count(),
      prisma.round.count({ where: { status: "COMPLETED" } }),
      // Explicit select — same shape: { id, name, businessCategory, _count.sentReferrals }
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
      // Explicit select on nested fromUser — same shape as before
      prisma.user.findMany({
        where: { role: { in: ["USER", "CAPTAIN"] }, onboardingCompleted: true },
        select: {
          id: true,
          name: true,
          email: true,
          businessName: true,
          businessCategory: true,
          role: true,
          receivedReferrals: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              note: true,
              createdAt: true,
              fromUser: {
                select: {
                  name: true,
                  email: true,
                  businessName: true,
                  businessCategory: true,
                  contactNumber: true,
                },
              },
            },
          },
        },
        orderBy: { receivedReferrals: { _count: "desc" } },
      }),
    ]);

  let lastRoundEndedAt: string | null = null;
  if (lastCompletedRound?.endedAt) {
    lastRoundEndedAt = lastCompletedRound.endedAt.toISOString();
  } else if (lastCompletedRound?.startTime) {
    lastRoundEndedAt = new Date(
      lastCompletedRound.startTime.getTime() + lastCompletedRound.durationMinutes * 60000
    ).toISOString();
  }

  const allRoundsCompleted =
    totalRounds > 0 &&
    completedRoundCount === totalRounds &&
    !gameState?.currentRoundId;

  return NextResponse.json({
    isRoundActive: !!activeRound,
    activeRound,
    lastRoundEndedAt,
    shiftDuration: gameState?.shiftDuration || 3,
    isAutoMode: !!gameState?.isAutoMode,
    nextRoundId: nextPendingRound?.id || null,
    allRoundsCompleted,
    topSenders,
    referralUsers,
  });
}
