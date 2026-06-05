"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const businessName = formData.get("businessName") as string;
  const businessCategory = formData.get("businessCategory") as string;
  const contactNumber = formData.get("contactNumber") as string;
  const description = formData.get("description") as string;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("User not found");

  // Save profile details
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      businessName,
      businessCategory,
      contactNumber,
      description,
      onboardingCompleted: true,
    }
  });

  // Use a standard Next.js cookie to flag completion instead of NextAuth's 
  // buggy unstable_update which corrupts the JWT token (JWEInvalid).
  const cookieStore = await cookies();
  cookieStore.set("conclave_onboarded", "true", { path: "/", maxAge: 60 * 60 * 24 });

  return { success: true, role: updatedUser.role };
}
