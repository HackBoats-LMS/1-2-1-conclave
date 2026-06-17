"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";


import { cookies } from "next/headers";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const businessName = formData.get("businessName") as string;
  const businessCategory = formData.get("businessCategory") as string;
  const contactNumber = formData.get("contactNumber") as string;
  const description = formData.get("description") as string;
  const specificAsk1 = formData.get("specificAsk1") as string | null;
  const specificAsk2 = formData.get("specificAsk2") as string | null;

  // session.user.id is already the DB user ID — no need for an extra findUnique round-trip
  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      businessName,
      businessCategory,
      contactNumber,
      description,
      specificAsk1: specificAsk1 || null,
      specificAsk2: specificAsk2 || null,
      onboardingCompleted: true,
    }
  });

  // Use a standard Next.js cookie to flag completion instead of NextAuth's 
  // buggy unstable_update which corrupts the JWT token (JWEInvalid).
  const cookieStore = await cookies();
  cookieStore.set("conclave_onboarded", session.user.id, { path: "/", maxAge: 60 * 60 * 24 });

  return { success: true, role: updatedUser.role };
}
