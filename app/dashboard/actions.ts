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

  await prisma.referral.create({
    data: {
      fromUserId: session.user.id,
      toUserId,
      note: note.trim() || null,
    },
  });

  return { success: true };
}
