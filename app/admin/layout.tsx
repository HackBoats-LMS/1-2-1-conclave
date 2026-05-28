import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Check if the user is authenticated and has the ADMIN role
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // If not an admin, redirect them to the regular dashboard
    redirect("/dashboard");
  }

  return <>{children}</>;
}
