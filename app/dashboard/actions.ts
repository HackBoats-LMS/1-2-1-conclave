"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function broadcast(event: string, payload: object = {}) {
  const channels = ["big_shift_timer", "global_events", "leaderboard_page_refresh"];
  try {
    await Promise.all(
      channels.map((channel) =>
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
              "x-api-key": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              messages: [{ topic: `realtime:${channel}`, event, payload }],
            }),
          }
        )
      )
    );
  } catch (_) { }
}

export async function sendReferral(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in and try again." };
  }

  const toUserId = formData.get("toUserId") as string;
  const note = (formData.get("note") as string) || "";

  if (!toUserId) {
    return { error: "Referral target is missing." };
  }

  if (toUserId === session.user.id) {
    return { error: "You cannot refer yourself." };
  }

  // Fetch caller, recipient, and current active round info
  const [caller, recipient, gameState] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { isApproved: true, onboardingCompleted: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true },
    }),
    prisma.gameState.findFirst({
      select: { currentRoundId: true }
    })
  ]);

  // Guard: caller must still be an active, onboarded non-admin member
  if (!caller || !caller.isApproved || !caller.onboardingCompleted || caller.role === "ADMIN") {
    return { error: "You are not authorized to send referrals." };
  }

  if (!recipient) {
    return { error: "The selected participant was not found." };
  }

  if (!gameState || !gameState.currentRoundId) {
    return { error: "No active conclave round." };
  }

  // Fetch round status and table assignments for both users
  const [round, callerTable, recipientTable] = await Promise.all([
    prisma.round.findUnique({
      where: { id: gameState.currentRoundId },
      select: { status: true, startTime: true }
    }),
    prisma.tableAssignment.findFirst({
      where: { userId: session.user.id, table: { roundId: gameState.currentRoundId } },
      select: { tableId: true }
    }),
    prisma.tableAssignment.findFirst({
      where: { userId: toUserId, table: { roundId: gameState.currentRoundId } },
      select: { tableId: true }
    })
  ]);

  if (!round || (round.status !== "IN_PROGRESS" && !round.status.startsWith("PAUSED_"))) {
    return { error: "Referrals can only be sent during an active round." };
  }

  if (!callerTable || !recipientTable || callerTable.tableId !== recipientTable.tableId) {
    return { error: "You can only refer participants at your table." };
  }

  // Check for duplicate referral within the active round
  if (round.startTime) {
    const duplicateReferral = await prisma.referral.findFirst({
      where: {
        fromUserId: session.user.id,
        toUserId,
        createdAt: { gte: round.startTime }
      }
    });
    if (duplicateReferral) {
      return { error: "You have already sent a referral to this participant in this round." };
    }
  }

  // Escape/sanitize the note to prevent XSS script injection
  const escapedNote = note
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  await prisma.referral.create({
    data: {
      fromUserId: session.user.id,
      toUserId,
      note: escapedNote || null,
    },
  });

  // Broadcast the referral event to realtime subscribers
  await broadcast("referral_sent", { fromUserId: session.user.id, toUserId });

  return { success: true };
}

