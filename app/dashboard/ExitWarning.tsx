"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ExitWarning() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only apply this logic in browser environments
    if (typeof window === 'undefined') return;

    // Push a dummy state to history on mount so we can intercept the first 'back' action
    window.history.pushState(null, "", window.location.pathname);

    const handlePopState = (_e: PopStateEvent) => {
      // The user hit the back button or swiped back. The dummy state is popped.
      setShowWarning(true);
      // We must push the dummy state AGAIN to intercept the next back swipe,
      // in case they choose to stay or swipe again while the modal is open.
      window.history.pushState(null, "", window.location.pathname);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Most modern browsers ignore the custom string, but it's required by the spec
      e.returnValue = "Are you sure you want to leave the active networking round?";
      return e.returnValue;
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0D2421]/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F4] border-4 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-sm w-full text-center space-y-6 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
        
        <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[4px_4px_0px_#ef4444]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl font-black uppercase text-[#0D2421]">Exit Lobby?</h2>
          <p className="text-sm font-bold text-[#0D2421]/60 leading-relaxed">
            Are you sure you want to leave the active networking round?
          </p>
        </div>
        
        <div className="flex gap-3 pt-2 relative z-10">
          <button
            onClick={() => setShowWarning(false)}
            className="flex-1 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
          >
            Stay
          </button>
          <button
            onClick={() => {
              setShowWarning(false);
              // Since we trap the popstate by pushing state, going back once
              // pops the dummy state again. To actually leave, we go back twice.
              window.history.go(-2);
            }}
            className="flex-1 py-4 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#dc2626] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#dc2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#dc2626] transition-all"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
