"use client";
import React, { useState } from "react";
import { createFullUser } from "./actions/user.actions";
import { useRouter } from "next/navigation";

export function QuickAddUserClient() {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await createFullUser(formData);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert("Failed to add user");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-5 py-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer whitespace-nowrap text-center"
      >
        + Quick Add Walk-In
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2421]/80 backdrop-blur-sm">
          <div className="bg-[#FAF8F4] w-full max-w-md border-4 border-[#0D2421] rounded-3xl shadow-[8px_8px_0px_#0D2421] overflow-hidden flex flex-col">
            <div className="p-6 border-b-4 border-[#0D2421] bg-[#BEF03C] flex justify-between items-center">
              <h2 className="font-black text-xl uppercase tracking-tight text-[#0D2421]">Quick Add Walk-In</h2>
              <button onClick={() => setIsOpen(false)} className="text-[#0D2421] hover:text-black font-black text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Full Name</label>
                <input type="text" name="name" required placeholder="John Doe" className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Email</label>
                <input type="email" name="email" required placeholder="john@example.com" className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Role</label>
                  <select name="role" className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white">
                    <option value="USER">Member</option>
                    <option value="VISITOR">Visitor</option>
                    <option value="CAPTAIN">Captain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Category</label>
                  <input type="text" name="businessCategory" placeholder="e.g. Marketing" className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-4 py-3 font-black text-xs uppercase text-[#0D2421] border-2 border-[#0D2421] rounded-xl hover:bg-slate-100 transition-colors bg-white shadow-[2px_2px_0px_#0D2421]">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-[#BEF03C] hover:bg-[#a5d631] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
                  {loading ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
