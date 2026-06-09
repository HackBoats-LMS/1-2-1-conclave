import { signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] font-sans selection:bg-[#BEF03C]/40 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Top Right HB Logo */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3 select-none">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#0D2421]/80 mt-1">Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hb-logo.png" alt="HackBoats" className="h-8 md:h-10 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm" draggable={false} />
      </div>

      {/* Blueprint Dot Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-md w-full text-center space-y-8 relative z-10">
        
        {/* Brand Logo Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0D2421] border border-[#0D2421] flex items-center justify-center text-[#BEF03C] shadow-[3px_3px_0px_#0D2421]">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">1-2-1 CONCLAVE</h1>
          <p className="text-sm font-semibold text-[#0D2421]/60 uppercase tracking-wider">
            Sign in to access your meeting table
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-600 p-5 rounded-2xl shadow-[4px_4px_0px_#C21A1A] text-left space-y-2 relative overflow-hidden transition-all duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-black text-red-600 uppercase tracking-wider">
                ACCESS RESTRICTED
              </span>
            </div>
            <p className="text-xs font-bold text-[#0D2421] leading-relaxed">
              {error === "AccessDenied"
                ? "You need to have access for evening to the onboarding page. Please make sure your Google account email is whitelisted by the Conclave Admin."
                : "An authentication error occurred. Please try signing in again or contact the administrator."}
            </p>
          </div>
        )}

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
            className="w-full flex items-center justify-center gap-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] py-4 px-6 rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#0D2421"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#0D2421"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#0D2421"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#0D2421"
              />
            </svg>
            Google OAuth Sign In
          </button>
        </form>

        {/* Security Warning Notice */}
        <div className="bg-[#FAF8F4] border border-[#0D2421]/15 p-4 rounded-xl text-left space-y-1">
          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">
            ⚠️ ACCESS RESTRICTION
          </span>
          <p className="text-[11px] font-semibold text-[#0D2421]/75 leading-relaxed">
            Your Google email must be whitelisted in the database by the Conclave Admin before access can be granted.
          </p>
        </div>

      </div>
    </div>
  );
}
