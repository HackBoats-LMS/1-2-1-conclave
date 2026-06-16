"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const recipient = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!recipient) {
    return { error: "The selected participant was not found." };
  }

  const existingReferral = await prisma.referral.findFirst({
    where: { fromUserId: session.user.id, toUserId },
  });

  if (existingReferral && !note.trim()) {
    return { error: "A note is required for additional referrals to this participant." };
  }

  const [newReferral] = await prisma.$transaction([
    prisma.referral.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        note: note.trim() || null,
      },
      include: { fromUser: true },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { sentReferralsCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: toUserId },
      data: { receivedReferralsCount: { increment: 1 } },
    })
  ]);

  // Fetch updated top senders
  const topSenders = await prisma.user.findMany({
    where: { role: { in: ["USER", "CAPTAIN"] }, sentReferralsCount: { gt: 0 } },
    select: { id: true, name: true, businessCategory: true, sentReferralsCount: true },
    orderBy: { sentReferralsCount: "desc" },
    take: 10,
  });

  // Broadcast to global_events for leaderboard
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{ 
          topic: `global_events`, 
          event: "leaderboard_update", 
          payload: { 
            topSenders,
            totalReferrals: await prisma.referral.count()
          } 
        }],
      }),
    });
  } catch (e) {}

  // Broadcast to receiver's personal channel
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `user_events_${toUserId}`, event: "referral_received", payload: { referral: newReferral } }],
      }),
    });
  } catch (e) {}

  return { success: true };
}
