"use client";

import React, { useState, useRef } from "react";
import { AdminPinModal } from "./AdminPinModal";
import { OnboardingExportButton } from "./OnboardingExportButton";
import { ReferralsExportButtons } from "./ReferralsExportButtons";

interface Props {
  users: any[];
  clearAction: (formData: FormData) => Promise<void> | void;
}

export function ClearMembersWarningButton({ users, clearAction }: Props) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleConfirmPin = (password: string) => {
    setIsPinOpen(false);
    if (formRef.current) {
      let input = formRef.current.querySelector('input[name="password"]') as HTMLInputElement;
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "password";
        formRef.current.appendChild(input);
      }
      input.value = password;

      let eventNameInput = formRef.current.querySelector('input[name="eventName"]') as HTMLInputElement;
      if (!eventNameInput) {
        eventNameInput = document.createElement("input");
        eventNameInput.type = "hidden";
        eventNameInput.name = "eventName";
        formRef.current.appendChild(eventNameInput);
      }
      eventNameInput.value = eventName;

      formRef.current.requestSubmit();
      
      // Clean up the password element after trigger to keep form stateless
      setTimeout(() => {
        if (input && input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }, 100);
    }
  };

  return (
    <>
      <form ref={formRef} action={clearAction} className="inline-block w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setIsWarningOpen(true)}
          className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2"
        >
          Clear Database Members
        </button>
      </form>

      {/* Warning Modal */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-[#0D2421]/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsWarningOpen(false)} 
          />
          <div className="relative w-full max-w-md bg-[#FAF8F4] border-4 border-[#0D2421] rounded-[2rem] shadow-[8px_8px_0px_#0D2421] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-600 text-white p-6 flex flex-col gap-2">
              <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-0.5 bg-red-800 text-red-100 border border-red-900 rounded-full text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#0D2421]">
                ⚠️ Danger Zone
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Clear All Members?
              </h3>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <p className="text-sm font-bold text-[#0D2421] leading-relaxed">
                Please make sure you download the data before clearing out the database. This action is irreversible.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-[#0D2421]/60 tracking-widest">1. All Live Referrals Data</p>
                  <div className="flex gap-2">
                    <ReferralsExportButtons />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-[#0D2421]/60 tracking-widest">2. Member Directory Data</p>
                  <div className="flex gap-2">
                    <OnboardingExportButton users={users} mode="split" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t-2 border-[#0D2421]/10">
                <p className="text-[10px] font-black uppercase text-[#0D2421]/60 tracking-widest">3. Name this Event Archive</p>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Conclave Mumbai 2026"
                  className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl font-bold text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#BEF03C]/50 transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWarningOpen(false)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[0px] active:translate-y-[0px] transition-all cursor-pointer text-center text-[#0D2421]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!eventName.trim()}
                  onClick={() => {
                    setIsWarningOpen(false);
                    setIsPinOpen(true);
                  }}
                  className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[0px] active:translate-y-[0px] transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Modal */}
      <AdminPinModal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onConfirm={handleConfirmPin}
        promptText="Enter Admin Pin to remove all members and captains:"
      />
    </>
  );
}
