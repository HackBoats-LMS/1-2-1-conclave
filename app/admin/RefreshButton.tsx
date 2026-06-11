"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

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
      <ArrowPathIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}
