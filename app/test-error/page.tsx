"use client";

import { useState } from "react";

// This variable lives outside the component to persist across Error Boundary resets
let crashAttempts = 0;

export default function TestErrorPage() {
  const [crash, setCrash] = useState(false);

  // If triggered, it stays crashed for exactly 3 reset attempts so you can see the panic UI
  if (crash || crashAttempts > 0) {
    if (crashAttempts < 3) {
      crashAttempts++;
      throw new Error("This error refuses to be fixed immediately!");
    } else {
      // After 3 reboots, the system finally "recovers"
      crashAttempts = 0;
      if (crash) setCrash(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] p-6 font-sans">
      <div className="bg-white border-2 border-[#0D2421] p-8 rounded-2xl shadow-[6px_6px_0px_#0D2421] text-center space-y-4 max-w-sm w-full">
        <h1 className="text-xl font-black uppercase text-[#0D2421]">Test Error Boundary</h1>
        <p className="text-xs font-bold text-[#0D2421]/60 uppercase tracking-wide">
          Click the button below to simulate a stubborn crash. It will require 3 reboots to recover!
        </p>
        <button
          onClick={() => {
            crashAttempts = 1;
            setCrash(true);
          }}
          className="w-full py-3 bg-red-500 hover:bg-red-400 text-white border-2 border-[#0D2421] rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0D2421] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0D2421] transition-all"
        >
          Simulate Stubborn Crash
        </button>
      </div>
    </div>
  );
}
