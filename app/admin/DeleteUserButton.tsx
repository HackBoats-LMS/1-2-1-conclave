"use client";

import React, { useState, useRef } from "react";
import { SubmitButton } from "../components/SubmitButton";
import { deleteUserAccount } from "./actions";
import { AdminPinModal } from "./AdminPinModal";

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const hasPassword = e.currentTarget.querySelector('input[name="password"]');
    if (!hasPassword) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleConfirm = (password: string) => {
    setIsModalOpen(false);
    if (formRef.current) {
      let input = formRef.current.querySelector('input[name="password"]') as HTMLInputElement;
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "password";
        formRef.current.appendChild(input);
      }
      input.value = password;
      formRef.current.requestSubmit();
      
      // Clean up password input after trigger to keep form stateless
      setTimeout(() => {
        if (input && input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }, 100);
    }
  };

  return (
    <>
      <form ref={formRef} action={deleteUserAccount} onSubmit={handleSubmit}>
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton title="Delete User" loadingText="..." className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </SubmitButton>
      </form>
      
      <AdminPinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        promptText="Enter Admin Pin to delete this user:"
      />
    </>
  );
}
