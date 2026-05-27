"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function sendReferral(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const toUserId = formData.get("toUserId") as string;
  const note = formData.get("note") as string;

  try {
    await prisma.referral.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        note
      }
    });
    revalidatePath("/dashboard");
    revalidatePath("/admin"); // update admin live counter too
  } catch (error) {
    console.error(error);
  }
}
