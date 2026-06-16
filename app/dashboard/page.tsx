import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClientWrapper } from "./DashboardClientWrapper";

export const dynamic = 'force-dynamic';

export default async function UserDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fresh DB lookup
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { isApproved: true, onboardingCompleted: true, role: true },
  });

  if (!dbUser || !dbUser.isApproved) redirect("/login?error=AccessDenied");

  const isProfileComplete = dbUser.onboardingCompleted;
  const userRole = dbUser.role;
  const isAdmin = userRole === "ADMIN";
  const isCaptain = userRole === "CAPTAIN";

  if (isAdmin) redirect("/admin");
  if (!isProfileComplete) redirect("/onboarding");

  // Fetch complete current state
  const gameState = await prisma.gameState.findFirst();
  const allRounds = await prisma.round.findMany({
    include: { slot: true },
    orderBy: { roundNumber: 'asc' },
  });

  // Fetch user's table assignments
  const initialMyAssignments = await prisma.tableAssignment.findMany({
    where: { userId: session.user.id },
    include: { table: true },
  });

  // Fetch all users at all my tables
  const tableIds = initialMyAssignments.map((a) => a.tableId);
  const initialTableUsers = await prisma.tableAssignment.findMany({
    where: { tableId: { in: tableIds } },
    include: { user: true },
    orderBy: { isCaptain: 'desc' },
  });

  // Fetch referrals
  const receivedReferrals = await prisma.referral.findMany({
    where: { toUserId: session.user.id },
    include: { fromUser: true },
    orderBy: { createdAt: 'desc' },
  });

  const sentReferrals = await prisma.referral.findMany({
    where: { fromUserId: session.user.id },
    select: { toUserId: true },
  });
  const initialSentReferralUserIds = sentReferrals.map((r) => r.toUserId);

  const initialRoundProgress = await prisma.roundProgress.findMany({
    where: { tableId: { in: tableIds } },
  });

  return (
    <DashboardClientWrapper
      initialGameState={gameState}
      initialRounds={allRounds}
      initialMyAssignments={initialMyAssignments}
      initialTableUsers={initialTableUsers}
      initialReceivedReferrals={receivedReferrals}
      initialSentReferralUserIds={initialSentReferralUserIds}
      initialRoundProgress={initialRoundProgress}
      sessionUser={{
        id: session.user.id as string,
        email: session.user.email as string,
        name: session.user.name || null,
      }}
      isCaptain={isCaptain}
    />
  );
}
