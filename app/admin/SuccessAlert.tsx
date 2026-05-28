"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SuccessAlert({ initialMessage }: { initialMessage: string }) {
  const [message, setMessage] = useState(initialMessage);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("success");
      params.delete("added");
      const newQuery = params.toString();
      const cleanPath = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(cleanPath, { scroll: false });
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [message, pathname, searchParams, router]);

  if (!message) return null;

  return (
    <div className="bg-[#BEF03C] border-2 border-[#0D2421] p-4 rounded-2xl shadow-[4px_4px_0px_#0D2421] flex items-center justify-between gap-3 transition-all duration-300 relative z-20">
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-[#0D2421] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-black text-xs uppercase tracking-wide text-left">{message}</span>
      </div>
      <button 
        onClick={() => {
          setMessage("");
          const params = new URLSearchParams(searchParams.toString());
          params.delete("success");
          params.delete("added");
          const newQuery = params.toString();
          const cleanPath = newQuery ? `${pathname}?${newQuery}` : pathname;
          router.replace(cleanPath, { scroll: false });
        }}
        className="text-[#0D2421]/60 hover:text-[#0D2421] font-black text-xs uppercase cursor-pointer flex-shrink-0 border-b border-[#0D2421]/30 hover:border-[#0D2421]"
      >
        Dismiss
      </button>
    </div>
  );
}
