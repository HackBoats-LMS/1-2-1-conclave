"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const businessName = formData.get("businessName") as string;
  const businessCategory = formData.get("businessCategory") as string;
  const contactNumber = formData.get("contactNumber") as string;
  const description = formData.get("description") as string;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User not found");

  // Save profile details
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      businessName,
      businessCategory,
      contactNumber,
      description,
      onboardingCompleted: true,
    }
  });

  if (updatedUser.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/dashboard");
  }
}
