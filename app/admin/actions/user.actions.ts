"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, verifyDeletePassword, setSuccess, setError } from "./utils";

export async function addManualUser(formData: FormData) {
  await requireAdmin();
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  const role = formData.get("role") as string || "USER";
  if (!email) {
    console.error("Email is required");
    return;
  }

  try {
    await prisma.user.upsert({
      where: { email },
      update: { isApproved: true, role },
      create: { email, isApproved: true, role }
    });
  } catch (error) {
    console.error(error);
    return;
  }
  await setSuccess("added_user");
  revalidatePath("/admin");
}

export async function createFullUser(formData: FormData) {
  await requireAdmin();
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  const role = formData.get("role") as string || "USER";
  const name = formData.get("name") as string || "";
  const businessCategory = formData.get("businessCategory") as string || "N/A";
  
  if (!email || !name) {
    await setError("Name and Email are required");
    revalidatePath("/admin");
    return { success: false };
  }

  try {
    await prisma.user.upsert({
      where: { email },
      update: { isApproved: true, role, name, businessCategory },
      create: { email, isApproved: true, role, name, businessCategory }
    });
    await setSuccess("added_user_manually");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to add user");
    revalidatePath("/admin");
    return { success: false };
  }
}

export async function removeUser(formData: FormData) {
  await requireAdmin();
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  try {
    await prisma.user.update({
      where: { email },
      data: { isApproved: false }
    });
    revalidatePath("/admin");
  } catch (error) {
    console.error(error);
  }
}

export async function deleteUserAccount(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;
  try {
    verifyDeletePassword(password);
    await prisma.user.delete({
      where: { id: userId }
    });
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to delete user");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("deleted_user");
  revalidatePath("/admin");
}

export async function deleteArchivedEvent(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  const eventId = formData.get("eventId") as string;

  if (!eventId) {
    await setError("Event ID is required");
    revalidatePath("/admin/archive");
    return;
  }

  try {
    verifyDeletePassword(password);
    await prisma.archivedEvent.delete({
      where: { id: eventId }
    });
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to delete archived event");
    revalidatePath("/admin/archive");
    return;
  }

  await setSuccess("deleted_archive");
  revalidatePath("/admin/archive");
}

export async function updateArchivedEventName(formData: FormData) {
  await requireAdmin();
  const eventId = formData.get("eventId") as string;
  const newName = formData.get("name") as string;

  if (!eventId || !newName || newName.trim() === "") {
    await setError("Invalid event ID or name");
    revalidatePath("/admin/archive");
    return;
  }

  try {
    await prisma.archivedEvent.update({
      where: { id: eventId },
      data: { name: newName.trim() }
    });
  } catch (error: any) {
    console.error(error);
    await setError(error.message || "Failed to update archived event name");
    revalidatePath("/admin/archive");
    return;
  }

  await setSuccess("updated_archive_name");
  revalidatePath("/admin/archive");
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!userId || !role || !["USER", "CAPTAIN", "ADMIN", "VISITOR"].includes(role)) {
    await setError("Invalid Role Update");
    revalidatePath("/admin");
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: role }
    });
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to update role");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_role");
  revalidatePath("/admin");
}

export async function updateUserDetails(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const rawEmail = formData.get("email") as string;
  const email = rawEmail?.trim().toLowerCase();
  const name = formData.get("name") as string || null;
  const businessName = formData.get("businessName") as string || null;
  const businessCategory = formData.get("businessCategory") as string || null;
  const role = formData.get("role") as string;

  if (!userId || !email) {
    return { error: "Email is required" };
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email, id: { not: userId } }
    });
    if (existing) {
      return { error: "That email is already in use by another user." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name: name || null,
        businessName: businessName || null,
        businessCategory: businessCategory || null,
        role
      }
    });
    await setSuccess("updated_user_details");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Failed to update user" };
  }
}

export async function removeAllUsers(formData: FormData) {
  await requireAdmin();
  const password = formData.get("password") as string;
  const eventName = formData.get("eventName") as string;

  if (!eventName || eventName.trim() === "") {
    await setError("Event name is required to archive data before clearing.");
    revalidatePath("/admin");
    return;
  }

  try {
    verifyDeletePassword(password);

    const usersToArchive = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } }
    });

    const referralsToArchive = await prisma.referral.findMany({
      include: { fromUser: true, toUser: true }
    });

    if (usersToArchive.length > 0 || referralsToArchive.length > 0) {
      const archivedEvent = await prisma.archivedEvent.create({
        data: { name: eventName.trim() }
      });

      if (usersToArchive.length > 0) {
        await prisma.archivedUser.createMany({
          data: usersToArchive.map(u => ({
            eventId: archivedEvent.id,
            originalUserId: u.id,
            name: u.name,
            email: u.email,
            businessName: u.businessName,
            businessCategory: u.businessCategory,
            contactNumber: u.contactNumber,
            role: u.role,
          }))
        });
      }

      if (referralsToArchive.length > 0) {
        await prisma.archivedReferral.createMany({
          data: referralsToArchive.map(r => ({
            eventId: archivedEvent.id,
            fromName: r.fromUser?.name || "Unknown",
            fromEmail: r.fromUser?.email || "unknown@email.com",
            toName: r.toUser?.name || "Unknown",
            toEmail: r.toUser?.email || "unknown@email.com",
            note: r.note,
            createdAt: r.createdAt
          }))
        });
      }
    }

    await prisma.user.deleteMany({
      where: { role: { not: "ADMIN" } }
    });
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to clear members");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("cleared_members");
  revalidatePath("/admin");
}
