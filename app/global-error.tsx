"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleReset = () => {
    setIsResetting(true);
    reset();
    
    setTimeout(() => {
      setIsResetting(false);
    }, 1500);
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-6 selection:bg-[#BEF03C]/40 relative overflow-hidden font-sans">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
          <div className="bg-white border-2 border-[#0D2421] p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-md w-full text-center relative z-10 space-y-6">
            
            <div className="mx-auto w-20 h-20 bg-red-100 border-2 border-[#0D2421] rounded-3xl flex items-center justify-center shadow-[4px_4px_0px_#0D2421] transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase text-[#0D2421] tracking-tight">
                Critical Failure
              </h2>
              <p className="text-sm font-bold text-[#0D2421]/60 uppercase tracking-wide min-h-[40px] flex items-center justify-center">
                A fatal system error occurred. We need to reboot the interface.
              </p>
            </div>

            <div className="pt-4 border-t-2 border-dashed border-[#0D2421]/20 flex flex-col gap-3">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0D2421] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? "Attempting Reboot..." : "Hard Reboot"}
              </button>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full py-3 bg-transparent text-[#0D2421]/60 hover:text-[#0D2421] font-bold uppercase text-xs underline underline-offset-4 transition-colors"
              >
                Or Return to Dashboard
              </button>
            </div>
            <p className="text-[10px] font-black text-[#0D2421]/40 uppercase tracking-widest mt-4">
              Error code: {error.digest || "FATAL_EXCEPTION"}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
