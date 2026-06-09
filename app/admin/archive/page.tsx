import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminArchiveSection } from "../AdminArchiveSection";
import { LogoutButton } from "@/app/components/LogoutButton";

export const dynamic = 'force-dynamic';

export default async function AdminArchivePage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  const archivedEvents = await prisma.archivedEvent.findMany({
    include: {
      _count: {
        select: { users: true, referrals: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] font-sans selection:bg-[#BEF03C]/40 flex flex-col relative overflow-x-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F4]/95 border-b border-[#0D2421] relative z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="w-10 h-10 rounded-xl bg-white border border-[#0D2421] flex items-center justify-center text-[#0D2421] shadow-[2px_2px_0px_#0D2421] hover:bg-slate-50 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <span className="font-black text-xl tracking-tight uppercase">
              Admin Archive Center
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <LogoutButton className="bg-transparent border-none shadow-none text-red-600 hover:bg-transparent hover:underline px-0 py-0 text-[10px]" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 w-full relative z-10 flex-1">
        <AdminArchiveSection events={archivedEvents} />
      </main>
    </div>
  );
}
