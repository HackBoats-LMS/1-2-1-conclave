"use client";

import { useState, useRef } from "react";
import { updateUserRole } from "./actions/user.actions";
import { SubmitButton } from "../components/SubmitButton";
import { PencilIcon } from "@heroicons/react/24/outline";

interface Props {
  userId: string;
  currentRole: string;
}

export function EditUserRoleButton({ userId, currentRole }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
        title="Edit Role"
      >
        <PencilIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <form 
      ref={formRef} 
      action={(formData) => {
        updateUserRole(formData);
        setIsEditing(false);
      }} 
      className="flex items-center gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <select 
        name="role" 
        defaultValue={currentRole}
        className="text-[9px] font-black uppercase bg-white border-2 border-[#0D2421] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
      >
        <option value="USER">Member</option>
        <option value="VISITOR">Visitor</option>
        <option value="CAPTAIN">Captain</option>
        <option value="ADMIN">Admin</option>
      </select>
      <SubmitButton loadingText=".." className="px-2 py-1 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-lg font-black uppercase text-[9px] shadow-[1.5px_1.5px_0px_#0D2421] transition-all cursor-pointer">
        Save
      </SubmitButton>
      <button 
        type="button"
        onClick={() => setIsEditing(false)}
        className="px-2 py-1 bg-white hover:bg-gray-100 text-[#0D2421] border-2 border-[#0D2421] rounded-lg font-black uppercase text-[9px] shadow-[1.5px_1.5px_0px_#0D2421] transition-all cursor-pointer"
      >
        X
      </button>
    </form>
  );
}
