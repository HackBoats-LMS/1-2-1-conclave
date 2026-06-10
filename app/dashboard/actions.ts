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

export async function autoStopExpiredRound(roundId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.status === "COMPLETED" || !round.startTime) return { success: true };

    const totalDurationMs = (round.durationMinutes || 15) * 60 * 1000;
    let elapsedMs = 0;

    if (round.status.startsWith("PAUSED_")) {
      const elapsedSec = parseInt(round.status.split("_")[1]);
      elapsedMs = (isNaN(elapsedSec) ? 0 : elapsedSec) * 1000;
    } else {
      elapsedMs = Date.now() - new Date(round.startTime).getTime();
    }

    // Only allow auto-stop if the time has actually expired, allowing a 1 second buffer
    if (elapsedMs + 1000 >= totalDurationMs) {
      await prisma.round.update({
        where: { id: roundId },
        data: { status: "COMPLETED", endedAt: new Date() }
      });
      
      const state = await prisma.gameState.findFirst();
      if (state?.currentRoundId === roundId) {
        await prisma.gameState.update({ where: { id: state.id }, data: { currentRoundId: null } });
      }

      await supabase.channel('global_events').httpSend('round_state_change', { action: 'stop' });
      return { success: true };
    }
    
    return { success: false, error: "Time not yet expired" };
  } catch (error: any) {
    console.error("Auto stop error:", error);
    return { error: error.message };
  }
}
