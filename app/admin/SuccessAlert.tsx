"use client";
import { useEffect, useState } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export function SuccessAlert({ initialMessage }: { initialMessage: string }) {
  const [message, setMessage] = useState(initialMessage);
  const [prevInitial, setPrevInitial] = useState(initialMessage);

  if (initialMessage !== prevInitial) {
    setPrevInitial(initialMessage);
    setMessage(initialMessage);
  }

  useEffect(() => {
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
            <ExclamationTriangleIcon className="w-6 h-6 text-[#0D2421] flex-shrink-0" />
          ) : (
            <CheckCircleIcon className="w-6 h-6 text-[#0D2421] flex-shrink-0" />
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
