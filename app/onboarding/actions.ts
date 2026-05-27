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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      businessName,
      businessCategory,
      contactNumber,
      description,
      onboardingCompleted: true,
    }
  });

  // Smart Table Assignment: Assign user to a table for every round
  const rounds = await prisma.round.findMany();
  for (const round of rounds) {
    const existingAssignment = await prisma.tableAssignment.findFirst({
      where: { userId: user.id, table: { roundId: round.id } }
    });
    
    if (!existingAssignment) {
      // Find tables in this round and their current occupancy
      const tables = await prisma.table.findMany({
        where: { roundId: round.id },
        include: { _count: { select: { assignments: true } } }
      });
      
      // Sort by fewest people to balance the tables
      tables.sort((a, b) => a._count.assignments - b._count.assignments);
      
      if (tables.length > 0) {
        await prisma.tableAssignment.create({
          data: {
            userId: user.id,
            tableId: tables[0].id
          }
        });
      }
    }
  }

  redirect("/dashboard");
}
