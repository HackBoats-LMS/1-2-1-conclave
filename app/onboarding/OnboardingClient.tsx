"use client";

import { completeOnboarding } from "./actions";
import { SubmitButton } from "@/app/components/SubmitButton";
import { useRouter } from "next/navigation";

export function OnboardingClient() {
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const result = await completeOnboarding(formData);
    if (result && result.success) {
      if (result.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-[#0D2421]">
          Full Name
        </label>
        <input 
          required 
          name="name" 
          type="text" 
          className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 transition-all font-bold placeholder:text-[#0D2421]/30" 
          placeholder="John Doe" 
        />
      </div>
      
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-[#0D2421]">
          Business Name
        </label>
        <input 
          required 
          name="businessName" 
          type="text" 
          className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 transition-all font-bold placeholder:text-[#0D2421]/30" 
          placeholder="Acme Corp" 
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-[#0D2421]">
          Business Category
        </label>
        <div className="relative">
          <select 
            name="businessCategory" 
            className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 transition-all font-bold appearance-none cursor-pointer"
          >
            <option>IT Services</option>
            <option>Marketing</option>
            <option>Finance</option>
            <option>Other</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#0D2421]">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-[#0D2421]">
          Contact Number
        </label>
        <input 
          required 
          name="contactNumber" 
          type="tel" 
          className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 transition-all font-bold placeholder:text-[#0D2421]/30" 
          placeholder="+1 (555) 000-0000" 
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-wider text-[#0D2421]">
          Business Description
        </label>
        <textarea 
          required 
          name="description" 
          rows={4} 
          className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 transition-all font-bold placeholder:text-[#0D2421]/30 resize-none" 
          placeholder="Briefly describe what your business does..." 
        />
      </div>

      <SubmitButton 
        loadingText="Saving..." 
        className="w-full flex items-center justify-center gap-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] py-4 px-6 rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer"
      >
        Save Profile & Continue
      </SubmitButton>
    </form>
  );
}
