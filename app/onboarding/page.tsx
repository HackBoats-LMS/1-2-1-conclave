import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./OnboardingClient";

export default async function Onboarding() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Verify approval / whitelist status
  if (!(session.user as any).isApproved) {
    redirect("/login?error=AccessDenied");
  }

  const isProfileComplete = (session.user as any).onboardingCompleted;
  if (isProfileComplete) {
    const role = (session.user as any).role;
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

      <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-lg w-full relative z-10 space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1.5 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[10px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
            STEP 02 / ACCOUNT CONFIGURATION
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-center">
            Complete Your Profile
          </h2>
          <p className="text-xs font-semibold text-[#0D2421]/60 uppercase tracking-wider">
            Provide business detail credentials to join the table rounds
          </p>
        </div>
        
        <OnboardingClient />
      </div>
    </div>
  );
}
