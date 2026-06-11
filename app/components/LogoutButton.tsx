"use client";

import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <div className="fixed inset-0 z-[9999] bg-[#0D2421]/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#FAF8F4] border-4 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-sm w-full text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-[#0D2421] border-2 border-[#0D2421] flex items-center justify-center text-[#BEF03C] shadow-[4px_4px_0px_#BEF03C]">
          <ArrowRightOnRectangleIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded-full text-[9px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
            Session Termination
          </div>
          <h2 className="text-2xl font-black uppercase text-[#0D2421]">Sign Out?</h2>
          <p className="text-sm font-bold text-[#0D2421]/60 leading-relaxed">
            You will be signed out of your current session and returned to the home page.
          </p>
        </div>

        <div className="flex gap-3 pt-2 relative z-10">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-4 bg-white hover:bg-slate-50 text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 py-4 bg-[#0D2421] hover:bg-[#163733] text-[#BEF03C] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#BEF03C] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#BEF03C] transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors ${className}`}
      >
        Sign Out
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
