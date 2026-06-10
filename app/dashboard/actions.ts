"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

export async function sendReferral(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized: You must be logged in to send a referral." };
    }

    const toUserId = formData.get("toUserId") as string;
    const note = formData.get("note") as string;
    const roundId = formData.get("roundId") as string | null;

    if (!toUserId) {
      return { error: "Recipient user ID is missing." };
    }

    if (toUserId === session.user.id) {
      return { error: "You cannot refer yourself." };
    }

    const cleanNote = note ? note.trim() : "";

    // If they submit an empty/blank note, check if they already sent an empty referral to this user.
    if (!cleanNote) {
      const existingEmpty = await prisma.referral.count({
        where: {
          fromUserId: session.user.id,
          toUserId: toUserId,
          OR: [
            { note: "" },
            { note: null }
          ]
        }
      });

      if (existingEmpty > 0) {
        return { error: "You already connected with this member. Please add a specific note for any additional referrals!" };
      }
    }

    await prisma.referral.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        roundId: roundId || null,
        note: cleanNote || null
      }
    });

    // Broadcast event to big screen leaderboard
    await supabase.channel('global_events').httpSend('new_referral', { timestamp: Date.now() });

    revalidatePath("/dashboard");
    revalidatePath("/admin"); // update admin live counter too
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendReferral:", error);
    return { error: error.message || "Failed to send referral. Please try again." };
  }
}