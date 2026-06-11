import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./components/LogoutButton";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user && (session.user as any).role === "ADMIN";
  const isProfileComplete = session?.user && (session.user as any).onboardingCompleted;

  let ctaLink = "/login";
  let ctaText = "Sign In with Google";
  if (isLoggedIn) {
    if (isAdmin) {
      ctaLink = "/admin";
      ctaText = "Admin Panel";
    } else if (isProfileComplete) {
      ctaLink = "/dashboard";
      ctaText = "Enter Lobby";
    } else {
      ctaLink = "/onboarding";
      ctaText = "Onboard Profile";
    }
  }

  const isCaptain = session?.user && (session.user as any).role === "CAPTAIN";

  // Live database stats
  const totalReferrals = await prisma.referral.count();
  const totalRounds = await prisma.round.count();
  const totalUsers = await prisma.user.count({ where: { role: "USER" } });
  const totalSlots = await prisma.slot.count();

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] font-sans selection:bg-[#BEF03C]/40 flex flex-col relative overflow-x-hidden">
      {/* Blueprint Dot Grid Background (Subtle) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F4]/95 border-b border-[#0D2421] relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] shadow-[2px_2px_0px_#0D2421] flex-shrink-0">
              <UserGroupIcon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="font-black text-base md:text-xl tracking-tight uppercase truncate">
              1-2-1 Conclave
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 font-bold text-sm tracking-wide">
            <a href="#features" className="hover:text-slate-600 transition-colors uppercase">Features</a>
            <a href="#how-it-works" className="hover:text-slate-600 transition-colors uppercase">How It Works</a>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoggedIn && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 bg-[#0D2421]/5 text-[#0D2421] rounded-lg border border-[#0D2421] uppercase">
                  {isCaptain && <span>👑</span>}
                  {session.user?.name?.split(" ")[0]}
                </span>
                <LogoutButton />
              </div>
            )}
            <a
              href={ctaLink}
              className="px-4 md:px-6 py-2 md:py-2.5 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs md:text-sm font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all whitespace-nowrap"
            >
              {ctaText}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-32 px-4 md:px-6 border-b border-[#0D2421]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10">
          <div className="lg:col-span-6 space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_#0D2421]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BEF03C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BEF03C]"></span>
              </span>
              Live Conclave Interface
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] uppercase">
              STRUCTURED <br />
              <span className="bg-[#BEF03C] px-3 py-1 border-2 border-[#0D2421] inline-block shadow-[4px_4px_0px_#0D2421] -rotate-1 transform">
                NETWORKING
              </span> <br />
              FOR AGGRESSIVE ROI.
            </h1>

            <p className="text-sm md:text-lg text-[#0D2421]/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
              Wipe out unstructured chit-chat. 1-2-1 Conclave orchestrates real-time, round-based, whitelisted matchmaking events. Sit at your assigned table, pitch to active leads, and exchange digital referrals in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <a
                href={ctaLink}
                className="px-8 py-4 bg-[#0D2421] text-[#FAF8F4] hover:bg-[#163733] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-center shadow-[4px_4px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#BEF03C] transition-all"
              >
                {isLoggedIn ? "Enter Platform Lobby" : "Join the Next Session"}
              </a>
            </div>
          </div>

          {/* Interactive Live Lobby Mock Widget — hidden on small mobile, shown md+ */}
          <div className="lg:col-span-6 hidden sm:flex justify-center w-full">
            <div className="w-full max-w-lg bg-white border-2 border-[#0D2421] rounded-[2rem] shadow-[8px_8px_0px_#0D2421] overflow-hidden p-6 md:p-8 space-y-6">
              
              {/* Widget Top Controller */}
              <div className="flex items-center justify-between border-b-2 border-dashed border-[#0D2421]/20 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse border border-[#0D2421]"></span>
                  <span className="font-black text-xs uppercase tracking-wider text-[#0D2421]">
                    ROUND 3 ACTIVE
                  </span>
                </div>
                <div className="px-3.5 py-1.5 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-xl text-xs font-black tracking-wider shadow-[2px_2px_0px_#0D2421]">
                  11:42 REMAINING
                </div>
              </div>

              {/* Central Circle Table Grid */}
              <div className="relative py-8 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-[#0D2421]/30 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-[#FAF8F4] border-2 border-[#0D2421] flex items-center justify-center shadow-inner">
                    <span className="font-black text-xs text-[#0D2421] uppercase tracking-widest">TABLE 4</span>
                  </div>
                </div>
                <div className="absolute -top-2 bg-[#BEF03C] border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[3px_3px_0px_#0D2421] text-xs font-black uppercase text-[#0D2421]">
                  💡 You (IT)
                </div>
                <div className="absolute -right-4 bg-white border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[3px_3px_0px_#0D2421] text-xs font-black uppercase text-[#0D2421] flex flex-col items-center">
                  <span>Marcus (Mkt)</span>
                  <span className="text-[10px] text-[#0D2421]/60 font-semibold lowercase">Agency</span>
                </div>
                <div className="absolute -left-4 bg-white border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[3px_3px_0px_#0D2421] text-xs font-black uppercase text-[#0D2421] flex flex-col items-center">
                  <span>Sarah (Law)</span>
                  <span className="text-[10px] text-[#0D2421]/60 font-semibold lowercase">Partner</span>
                </div>
                <div className="absolute -bottom-2 bg-white border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[3px_3px_0px_#0D2421] text-xs font-black uppercase text-[#0D2421] flex flex-col items-center">
                  <span>Dave (Fin)</span>
                  <span className="text-[10px] text-[#0D2421]/60 font-semibold lowercase">Venture</span>
                </div>
              </div>

              {/* Dynamic Referral Notification Box */}
              <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-4 rounded-2xl relative shadow-[3px_3px_0px_#0D2421] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase bg-[#0D2421] text-white px-2 py-0.5 rounded">
                    OUTGOING REFERRAL
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Just Now</span>
                </div>
                <p className="text-xs font-bold leading-relaxed text-[#0D2421]/80">
                  You sent a digital connection request to <span className="underline">Marcus (Mkt)</span>: 
                  <span className="italic text-slate-600 block mt-1 bg-white p-2 border border-[#0D2421]/15 rounded">{"\"I have a client looking for a brand strategist. Let's sync up tomorrow.\""}</span>
                </p>
                <div className="absolute -top-3 -right-2 bg-emerald-500 border border-[#0D2421] text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow tracking-wider">
                  SENT SECURELY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Stats Banner Section (Architectural blueprint layout) */}
      <section id="features" className="grid grid-cols-2 lg:grid-cols-4 bg-white border-b border-[#0D2421]">
        
        <div className="p-5 md:p-8 border-r border-[#0D2421] border-b lg:border-b-0 flex flex-col justify-between hover:bg-[#BEF03C]/10 transition-colors">
          <span className="text-[10px] md:text-xs font-black tracking-widest text-[#0D2421]/40 uppercase">01 / TOTAL CONNECTIONS</span>
          <div className="mt-4 md:mt-8 space-y-1 md:space-y-2">
            <span className="text-3xl md:text-5xl font-black tracking-tight">{totalReferrals}</span>
            <p className="text-[10px] md:text-xs font-bold uppercase text-[#0D2421]/60">Referrals Exchanged</p>
          </div>
        </div>

        <div className="p-5 md:p-8 border-b lg:border-b-0 lg:border-r border-[#0D2421] flex flex-col justify-between hover:bg-[#BEF03C]/10 transition-colors">
          <span className="text-[10px] md:text-xs font-black tracking-widest text-[#0D2421]/40 uppercase">02 / TOTAL ROUNDS</span>
          <div className="mt-4 md:mt-8 space-y-1 md:space-y-2">
            <span className="text-3xl md:text-5xl font-black tracking-tight">{totalRounds}</span>
            <p className="text-[10px] md:text-xs font-bold uppercase text-[#0D2421]/60">Rounds Configured</p>
          </div>
        </div>

        <div className="p-5 md:p-8 border-r border-[#0D2421] flex flex-col justify-between hover:bg-[#BEF03C]/10 transition-colors">
          <span className="text-[10px] md:text-xs font-black tracking-widest text-[#0D2421]/40 uppercase">03 / WHITELIST SIZE</span>
          <div className="mt-4 md:mt-8 space-y-1 md:space-y-2">
            <span className="text-3xl md:text-5xl font-black tracking-tight">{totalUsers}</span>
            <p className="text-[10px] md:text-xs font-bold uppercase text-[#0D2421]/60">Attendees Whitelisted</p>
          </div>
        </div>

        <div className="p-5 md:p-8 flex flex-col justify-between hover:bg-[#BEF03C]/10 transition-colors">
          <span className="text-[10px] md:text-xs font-black tracking-widest text-[#0D2421]/40 uppercase">04 / EVENT SLOTS</span>
          <div className="mt-4 md:mt-8 space-y-1 md:space-y-2">
            <span className="text-3xl md:text-5xl font-black tracking-tight">{totalSlots}</span>
            <p className="text-[10px] md:text-xs font-bold uppercase text-[#0D2421]/60">Active Slots</p>
          </div>
        </div>

      </section>

      {/* How it Works / Timeline Section */}
      <section id="how-it-works" className="py-14 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-block px-3 py-1 bg-[#BEF03C] border border-[#0D2421] rounded-full text-xs font-black tracking-widest uppercase">
            OPERATIONAL ENGINE
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-tight">
            How The Lobby Automates Your Connections
          </h2>
          <p className="text-sm font-semibold text-[#0D2421]/70 max-w-xl mx-auto">
            A secure, automated matching ecosystem developed to maximize participant contacts in high-velocity rounds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          
          {/* Card 1 */}
          <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-8 rounded-[2rem] shadow-[4px_4px_0px_#0D2421] relative flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] transition-all">
            <div className="absolute top-6 right-8 text-6xl font-black text-[#0D2421]/5 pointer-events-none select-none">01</div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] font-black text-sm">
                KEY
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg uppercase">Pre-Approval Gate</h3>
                <p className="text-xs text-[#0D2421]/75 leading-relaxed font-semibold">
                  Organizers pre-approve participant emails. Users sign in securely using Google OAuth; unlisted emails are barred instantly to keep meetings professional.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-8 rounded-[2rem] shadow-[4px_4px_0px_#0D2421] relative flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] transition-all">
            <div className="absolute top-6 right-8 text-6xl font-black text-[#0D2421]/5 pointer-events-none select-none">02</div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] font-black text-sm">
                GRID
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg uppercase">Table Allocation</h3>
                <p className="text-xs text-[#0D2421]/75 leading-relaxed font-semibold">
                  Admin uploads the assignment matrix. The system maps your business profile to a designated table matching slot numbers and round rotations.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-8 rounded-[2rem] shadow-[4px_4px_0px_#0D2421] relative flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] transition-all">
            <div className="absolute top-6 right-8 text-6xl font-black text-[#0D2421]/5 pointer-events-none select-none">03</div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] font-black text-sm">
                LIVE
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg uppercase">Pitch & Swap</h3>
                <p className="text-xs text-[#0D2421]/75 leading-relaxed font-semibold">
                  A countdown timer starts on the dashboard. Inspect table partner profiles, pitch, and transmit private digital referrals instantly to their panels.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-8 rounded-[2rem] shadow-[4px_4px_0px_#0D2421] relative flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] transition-all">
            <div className="absolute top-6 right-8 text-6xl font-black text-[#0D2421]/5 pointer-events-none select-none">04</div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] font-black text-sm">
                SYNC
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg uppercase">Dynamic Shifting</h3>
                <p className="text-xs text-[#0D2421]/75 leading-relaxed font-semibold">
                  When the timer hits zero, the admin launches the next round. The dashboard auto-refreshes instantly to display your new table partners without lag.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* Retro Call-to-Action Grid Banner */}
      <section className="bg-[#FAF8F4] py-14 md:py-24 px-4 md:px-6 border-b border-[#0D2421] text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 relative z-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0D2421] uppercase leading-[1.1]">
            ORCHESTRATE YOUR NEXT <br />
            CONCLAVE WITH PRECISION.
          </h2>
          <p className="text-base font-semibold text-[#0D2421]/70 max-w-lg mx-auto leading-relaxed">
            Acquire access credentials from your team organizer, enter the live table allocation space, and expand your business channels.
          </p>
          <div className="pt-2">
            <a
              href={ctaLink}
              className="px-8 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-center shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
            >
              {ctaText}
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
