"use client";

import { useState } from "react";
import { UserPlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { InjectLateAttendeeForm } from "./InjectLateAttendeeForm";
import { SubmitButton } from "../components/SubmitButton";

export function AddParticipantForms({ 
  hasAssignments, 
  pendingRoundCount,
  addManualUserAction
}: { 
  hasAssignments: boolean;
  pendingRoundCount: number;
  addManualUserAction: (formData: FormData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border-2 border-[#0D2421] p-4 rounded-2xl shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#BEF03C] border-2 border-[#0D2421] rounded-xl flex items-center justify-center text-[#0D2421]">
            <UserPlusIcon className="w-4 h-4" />
          </div>
          <span className="font-black text-sm uppercase text-[#0D2421]">Add New Participant Manually</span>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-[#0D2421] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
          {hasAssignments && (
            <InjectLateAttendeeForm pendingRoundCount={pendingRoundCount} />
          )}

          {/* Manual User Add Form (Database Whitelist Only) */}
          <form action={addManualUserAction} className="bg-[#FAF8F4] p-6 rounded-2xl border-2 border-[#0D2421] shadow-[3px_3px_0px_#0D2421] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D2421]"></span>
              <span className="text-[10px] font-black tracking-widest text-[#0D2421] uppercase">ADD SINGLE ATTENDEE TO DATABASE</span>
            </div>
            <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-wide leading-relaxed mt-1">
              Use this form to add an attendee to the whitelist so they can log in. If rounds have already been generated, this will <strong>NOT</strong> inject them into active rounds.
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-[#0D2421]/60">Google Account Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all placeholder:text-[#0D2421]/30"
                />
              </div>
              <div className="w-full md:w-56 space-y-1.5">
                <label htmlFor="role" className="block text-xs font-black uppercase tracking-wider text-[#0D2421]/60">Security Role</label>
                <div className="relative">
                  <select
                    id="role"
                    name="role"
                    className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="USER">Standard Member</option>
                    <option value="CAPTAIN">Table Captain</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#0D2421]">
                    <ChevronDownIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <SubmitButton
                loadingText="Adding..."
                className="w-full md:w-auto h-11 px-6 bg-[#0D2421] text-[#BEF03C] hover:bg-[#163733] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                Whitelist User
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
