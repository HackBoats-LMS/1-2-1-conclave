import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "../components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center text-[10px] font-black px-3 py-1.5 bg-white text-[#0D2421] rounded-lg border border-[#0D2421]/20 uppercase shadow-sm">
          {session.user.name?.split(" ")[0] || session.user.email?.split("@")[0]}
        </span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
