"use server";
import { prisma } from "@/lib/prisma";
import { auth, unstable_update } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  // Forcefully update the JWT cookie so NextAuth knows the user is onboarded
  await unstable_update({
    onboardingCompleted: true,
    role: updatedUser.role,
  } as any);

  // We do not call redirect() here. Next.js sometimes swallows Set-Cookie headers 
  // when redirect() is thrown in a Server Action. Instead, we revalidate the path.
  // The /onboarding page will re-render, see the new cookie, and redirect safely.
  revalidatePath("/onboarding", "page");
}
