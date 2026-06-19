"use client";
import React, { useState } from "react";
import { updateUserDetails } from "./actions/user.actions";
import { useRouter } from "next/navigation";
import { PencilIcon } from "@heroicons/react/24/outline";

export function EditUserDetailsButton({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("userId", user.id);
    const res = await updateUserDetails(formData);
    if (res?.error) {
      alert(res.error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
        title="Edit User"
      >
        <PencilIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2421]/80 backdrop-blur-sm">
          <div className="bg-[#FAF8F4] w-full max-w-md border-4 border-[#0D2421] rounded-3xl shadow-[8px_8px_0px_#0D2421] overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b-4 border-[#0D2421] bg-amber-100 flex justify-between items-center">
              <h2 className="font-black text-xl uppercase tracking-tight text-[#0D2421]">Edit User Details</h2>
              <button onClick={() => setIsOpen(false)} className="text-[#0D2421] hover:text-black font-black text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Full Name</label>
                <input type="text" name="name" defaultValue={user.name || ""} className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" name="email" required defaultValue={user.email || ""} className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
                <p className="text-[9px] text-amber-600 mt-1 uppercase font-bold tracking-wide">Changing email instantly revokes access for the old email.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Company / Business Name</label>
                <input type="text" name="businessName" defaultValue={user.businessName || ""} className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Category</label>
                  <input type="text" name="businessCategory" defaultValue={user.businessCategory || ""} className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#0D2421]/60 mb-1">Role</label>
                  <select name="role" defaultValue={user.role} className="w-full px-4 py-3 border-2 border-[#0D2421] rounded-xl text-sm font-bold bg-white">
                    <option value="USER">Member</option>
                    <option value="VISITOR">Visitor</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-4 py-3 font-black text-xs uppercase text-[#0D2421] border-2 border-[#0D2421] rounded-xl hover:bg-slate-100 transition-colors bg-white shadow-[2px_2px_0px_#0D2421]">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-amber-300 hover:bg-amber-400 text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
