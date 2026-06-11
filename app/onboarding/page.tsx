import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./OnboardingClient";
import { LogoutButton } from "../components/LogoutButton";

export default async function Onboarding() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Verify approval / whitelist status
  if (!(session.user as any).isApproved) {
    redirect("/login?error=AccessDenied");
  }

  const isProfileComplete = (session.user as any).onboardingCompleted;
  const role = (session.user as any).role;
  
  if (isProfileComplete) {
    if (role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] font-sans selection:bg-[#BEF03C]/40 py-12 px-6 relative flex items-center justify-center overflow-x-hidden">
      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-between items-center">
        <a href="/" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-[#0D2421] flex items-center justify-center text-[#BEF03C]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-black text-xs uppercase tracking-tight hidden sm:block">1-2-1 Conclave</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center text-[10px] font-black px-3 py-1.5 bg-white text-[#0D2421] rounded-lg border border-[#0D2421]/20 uppercase">
            {session.user.name?.split(" ")[0] || session.user.email?.split("@")[0]}
          </span>
          <LogoutButton />
        </div>
      </div>

      <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-lg w-full relative z-10 space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1.5 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[10px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
            STEP 02 / ACCOUNT CONFIGURATION
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-center">
            {role === "ADMIN" ? "Admin Setup" : "Complete Your Profile"}
          </h2>
          <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wider">
            {role === "ADMIN" ? "Confirm your basic details to access the console" : "Provide business detail credentials to join the table rounds"}
          </p>
        </div>
        
        <OnboardingClient userRole={role} />
      </div>
    </div>
  );
}
