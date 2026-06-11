"use client";

import { useState } from "react";
import { SubmitButton } from "../components/SubmitButton";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function EndConclaveButton({ action }: { action: string | ((formData: FormData) => void) }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-10 px-4 bg-red-500 hover:bg-red-600 text-white border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center"
      >
        End Conclave
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-[#0D2421]/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#FAF8F4] border-4 border-[#0D2421] p-8 rounded-[2rem] shadow-[8px_8px_0px_#0D2421] max-w-sm w-full text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[4px_4px_0px_#ef4444]">
              <ExclamationTriangleIcon className="w-8 h-8" />
            </div>

            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white border border-red-700 rounded-full text-[9px] font-black tracking-widest uppercase shadow-[1.5px_1.5px_0px_#0D2421]">
                ⚠️ Irreversible Action
              </div>
              <h2 className="text-2xl font-black uppercase text-[#0D2421]">End Conclave?</h2>
              <p className="text-sm font-bold text-[#0D2421]/60 leading-relaxed">
                This will skip all remaining rounds and mark the entire event as concluded. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
              >
                Cancel
              </button>
              <form action={action} onSubmit={() => setOpen(false)} className="flex-1">
                <SubmitButton
                  loadingText="Ending..."
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white border-2 border-[#0D2421] rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#dc2626] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#dc2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#dc2626] transition-all cursor-pointer"
                >
                  End Conclave
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
