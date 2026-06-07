"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function UserSearchFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("search", term);
    else params.delete("search");
    
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="relative w-full mb-6">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#0D2421]/40">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <input 
        type="text" 
        placeholder="Search members by name, email, company, or group..." 
        defaultValue={searchParams.get("search")?.toString() || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full bg-white border-2 border-[#0D2421] rounded-2xl pl-12 pr-10 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all placeholder:text-[#0D2421]/30 shadow-[4px_4px_0px_#0D2421]"
      />
      {isPending && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
           <svg className="w-4 h-4 text-[#0D2421]/40 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      )}
    </div>
  );
}
