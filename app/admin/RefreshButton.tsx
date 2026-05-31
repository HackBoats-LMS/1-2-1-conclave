"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`p-1.5 bg-white text-[#0D2421] border-2 border-[#0D2421] rounded-full shadow-[2px_2px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all focus:outline-none disabled:opacity-50 cursor-pointer ${isRefreshing ? 'opacity-50' : ''}`}
      title="Refresh Live Referrals Data"
    >
      <svg 
        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  );
}
