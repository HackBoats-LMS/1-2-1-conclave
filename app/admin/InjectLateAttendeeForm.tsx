"use client";

import { useState, useTransition, useRef } from "react";
import { injectLateAttendee } from "./actions";
import { UserPlusIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export function InjectLateAttendeeForm({ pendingRoundCount }: { pendingRoundCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
    injectedRounds?: { roundNumber: number; tableNumber: number }[];
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const res = await injectLateAttendee(formData);
      setResult(res);
      if (res.success) {
        formRef.current?.reset();
      }
    });
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-500 p-6 rounded-2xl shadow-[4px_4px_0px_#0D2421] space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-500 border-2 border-[#0D2421] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-[2px_2px_0px_#0D2421]">
          <UserPlusIcon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black tracking-widest text-amber-800 uppercase">
              SAFE INJECTION
            </span>
            <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-lg border border-amber-700 uppercase">
              {pendingRoundCount} Pending Round{pendingRoundCount !== 1 ? "s" : ""}
            </span>
          </div>
          <h3 className="font-black text-sm uppercase text-[#0D2421]">Add Late Attendee</h3>
          <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-wide leading-relaxed">
            Injects user into all <strong>pending</strong> rounds only.{" "}
            <span className="text-emerald-700">Active &amp; completed rounds are untouched.</span>
          </p>
        </div>
      </div>

      {/* Warning if no pending rounds */}
      {pendingRoundCount === 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 p-3 rounded-xl">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">
            No pending rounds available. All rounds have started or completed.
          </p>
        </div>
      )}

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {/* Email */}
          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="late-email" className="block text-[9px] font-black uppercase tracking-wider text-[#0D2421]/60">
              Google Account Email
            </label>
            <input
              type="email"
              id="late-email"
              name="email"
              required
              placeholder="latecomer@company.com"
              disabled={pendingRoundCount === 0 || isPending}
              className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-bold transition-all placeholder:text-[#0D2421]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label htmlFor="late-role" className="block text-[9px] font-black uppercase tracking-wider text-[#0D2421]/60">
              Role
            </label>
            <div className="relative">
              <select
                id="late-role"
                name="role"
                disabled={pendingRoundCount === 0 || isPending}
                className="w-full bg-white border-2 border-[#0D2421] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-bold transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="USER">Member</option>
                <option value="CAPTAIN">Captain</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#0D2421]">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pendingRoundCount === 0 || isPending}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Injecting into rounds...
            </>
          ) : (
            <>
              <UserPlusIcon className="w-4 h-4" />
              Inject into {pendingRoundCount} Pending Round{pendingRoundCount !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </form>

      {/* Result feedback */}
      {result && (
        <div
          className={`p-4 rounded-xl border-2 space-y-2 ${
            result.success
              ? "bg-emerald-50 border-emerald-500"
              : "bg-red-50 border-red-400"
          }`}
        >
          {result.success ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                  Attendee successfully injected!
                </span>
              </div>
              {result.injectedRounds && result.injectedRounds.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest">
                    Assigned to:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.injectedRounds.map((r) => (
                      <span
                        key={r.roundNumber}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 border border-emerald-400 rounded-lg text-[9px] font-black text-emerald-800 uppercase"
                      >
                        Round {r.roundNumber} → Table {r.tableNumber}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                {result.error}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
