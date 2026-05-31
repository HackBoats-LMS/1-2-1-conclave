import { signIn } from "@/lib/auth";

export default function CaptainLoginPage() {
  return (
    <div className="min-h-screen bg-[#1a0e00] text-amber-100 font-sans selection:bg-amber-500/40 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Top Right HB Logo */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3 select-none">
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-500/80 mt-1">Powered by</span>
        <img src="/hb-logo.png" alt="HackBoats" className="h-8 md:h-10 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm" draggable={false} />
      </div>

      {/* Warm dot grid background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <div className="bg-[#2a1a08] border-2 border-amber-600 p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#f59e0b] max-w-md w-full text-center space-y-8 relative z-10">
        
        {/* Captain Crown Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 border-2 border-amber-700 flex items-center justify-center shadow-[3px_3px_0px_#1a0e00]">
          <span className="text-3xl">👑</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight text-amber-400">Captain Login</h1>
          <p className="text-sm font-semibold text-amber-300/60 uppercase tracking-wider">
            Sign in to access your table captain dashboard
          </p>
        </div>

        {/* Auth Action Form */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/onboarding" });
          }}
          className="pt-2"
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-[#1a0e00] border-2 border-amber-700 py-4 px-6 rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#1a0e00] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#1a0e00] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#1a0e00] transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#1a0e00"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#1a0e00"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#1a0e00"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#1a0e00"
              />
            </svg>
            👑 Captain Google Sign In
          </button>
        </form>

        {/* Captain Info Notice */}
        <div className="bg-amber-900/30 border border-amber-600/30 p-4 rounded-xl text-left space-y-2">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
            👑 CAPTAIN PRIVILEGES
          </span>
          <ul className="text-[11px] font-semibold text-amber-300/70 leading-relaxed space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              View your table members before the round starts
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              Host your assigned table across all rounds
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              Confirm participation of your table members
            </li>
          </ul>
        </div>

        {/* Link to regular login */}
        <div className="pt-2">
          <a 
            href="/login" 
            className="text-[11px] font-bold text-amber-400/50 uppercase tracking-wider hover:text-amber-400 transition-colors underline decoration-amber-600/30 underline-offset-4"
          >
            Not a captain? Sign in as a member →
          </a>
        </div>
      </div>
    </div>
  );
}
