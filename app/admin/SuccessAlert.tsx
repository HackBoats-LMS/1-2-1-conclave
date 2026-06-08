"use client";
import { useEffect, useState } from "react";

export function SuccessAlert({ initialMessage }: { initialMessage: string }) {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage);
    if (initialMessage) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [initialMessage]);

  if (!message) return null;

  const isWarning = message.includes("IMPORTANT:");

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in max-w-sm w-full">
      <div className={`${isWarning ? "bg-amber-400" : "bg-[#BEF03C]"} border-2 border-[#0D2421] p-4 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex items-center justify-between gap-3 transition-all duration-300 relative`}>
        <div className="flex items-center gap-3">
          {isWarning ? (
            <svg className="w-6 h-6 text-[#0D2421] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[#0D2421] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-black text-xs uppercase tracking-wide text-left">{message}</span>
        </div>
        <button 
          onClick={() => setMessage("")}
          className="text-[#0D2421]/60 hover:text-[#0D2421] font-black text-xs uppercase cursor-pointer flex-shrink-0 border-b border-[#0D2421]/30 hover:border-[#0D2421]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
