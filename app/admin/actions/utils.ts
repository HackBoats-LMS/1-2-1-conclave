import { auth } from "@/lib/auth";
import crypto from "crypto";
import { cookies } from "next/headers";

export function genId() {
  return crypto.randomUUID();
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export function verifyDeletePassword(password: string | null) {
  if (!password) {
    throw new Error("Admin Pin is required for deletion");
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const expectedHash = process.env.ADMIN_DELETE_PASSWORD_HASH;
  const expectedPlain = process.env.ADMIN_DELETE_PASSWORD;

  // Hashed password default: HACKBOATS
  const defaultHash = "728fce39b4446fc2aaa0f4a42971737f137b3ad20c36099fba20891eacca64f8";

  const match = expectedHash
    ? hash === expectedHash
    : expectedPlain
      ? password === expectedPlain
      : hash === defaultHash;

  if (!match) {
    throw new Error("Incorrect Admin Pin. Action denied.");
  }
}

// Helper: set a success cookie (read by page.tsx, auto-expires in 5s)
export async function setSuccess(key: string) {
  (await cookies()).set("admin_success", key, { maxAge: 5 });
}
export async function setError(msg: string) {
  (await cookies()).set("admin_error", msg, { maxAge: 5 });
}
