"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

export async function sendReferral(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const toUserId = formData.get("toUserId") as string;
  const note = (formData.get("note") as string) || "";

  try {
    if (!note.trim()) {
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
        note
      }
    });

    // Broadcast event to big screen leaderboard
    await supabase.channel('global_events').httpSend('new_referral', { timestamp: Date.now() });

    revalidatePath("/dashboard");
    revalidatePath("/admin"); // update admin live counter too
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to send referral." };
  }
}
