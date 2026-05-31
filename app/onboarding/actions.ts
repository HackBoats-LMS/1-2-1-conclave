"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  if (updatedUser.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/dashboard");
  }
}
