"use client";

import { useEffect, useState } from "react";

type Reason = "back" | "reload";

export function ExitWarning() {
  const [reason, setReason] = useState<Reason | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.history.pushState(null, "", window.location.pathname);

    const handlePopState = () => {
      setReason("back");
      window.history.pushState(null, "", window.location.pathname);
    };

    // Intercept Ctrl+R, Cmd+R, F5 to show custom modal instead
    const handleKeyDown = (e: KeyboardEvent) => {
      const isReload =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r");
      if (isReload) {
        e.preventDefault();
        setReason("reload");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!reason) return null;

  const isReload = reason === "reload";

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0D2421]/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F4] border-4 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-sm w-full text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[4px_4px_0px_#ef4444]">
          {isReload ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[9px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
            {isReload ? "Page Reload" : "Navigation Warning"}
          </div>
          <h2 className="text-2xl font-black uppercase text-[#0D2421]">
            {isReload ? "Reload Page?" : "Exit Lobby?"}
          </h2>
          <p className="text-sm font-bold text-[#0D2421]/60 leading-relaxed">
            {isReload
              ? "Reloading will interrupt your active session. Your table position will be preserved."
              : "Are you sure you want to leave the active networking round?"}
          </p>
        </div>

        <div className="flex gap-3 pt-2 relative z-10">
          <button
            onClick={() => setReason(null)}
            className="flex-1 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
          >
            Stay
          </button>
          <button
            onClick={() => {
              setReason(null);
              if (isReload) {
                window.location.reload();
              } else {
                window.history.go(-2);
              }
            }}
            className="flex-1 py-4 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#dc2626] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#dc2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#dc2626] transition-all"
          >
            {isReload ? "Reload" : "Leave"}
          </button>
        </div>
      </div>
    </div>
  );
}
