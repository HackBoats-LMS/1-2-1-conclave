import { auth } from "@/lib/auth";
import { ExitWarning } from "./ExitWarning";
import { LogoutButton } from "../components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isCaptain = (session?.user as any)?.role === "CAPTAIN";

  return (
    <div className="relative min-h-screen w-full">
      <ExitWarning />
      {/* Floating Global Header for Dashboard */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-50 pointer-events-none flex justify-between items-center">
        {/* Brand mark */}
        <a href="/" className="pointer-events-auto flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-[#0D2421] flex items-center justify-center text-[#BEF03C]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-black text-xs uppercase tracking-tight text-[#0D2421] hidden sm:block">1-2-1 Conclave</span>
        </a>

        {/* User identity + logout */}
        <div className="pointer-events-auto flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 bg-white/80 backdrop-blur text-[#0D2421] rounded-lg border border-[#0D2421]/20 uppercase">
                {isCaptain && <span>👑</span>}
                {session.user.name?.split(" ")[0] || session.user.email?.split("@")[0]}
              </span>
              <LogoutButton />
            </>
          ) : (
            <a
              href="/login"
              className="px-4 py-1.5 bg-[#BEF03C] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            >
              Sign In
            </a>
          )}
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
