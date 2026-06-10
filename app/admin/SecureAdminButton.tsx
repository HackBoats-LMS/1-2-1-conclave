"use client";

import React, { useState, useRef } from "react";
import { SubmitButton } from "../components/SubmitButton";
import { AdminPinModal } from "./AdminPinModal";

interface SecureAdminButtonProps {
  action: (formData: FormData) => Promise<void> | void;
  label: string;
  loadingText: string;
  className: string;
  promptText: string;
  formClassName?: string;
  children?: React.ReactNode;
}

export function SecureAdminButton({ 
  action, 
  label, 
  loadingText, 
  className, 
  promptText,
  formClassName = "inline-block w-full sm:w-auto",
  children
}: SecureAdminButtonProps) {
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
      
      // Clean up the password element after trigger to keep form stateless
      setTimeout(() => {
        if (input && input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }, 100);
    }
  };

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className={formClassName}>
        {children}
        <SubmitButton loadingText={loadingText} className={className}>
          {label}
        </SubmitButton>
      </form>
      
      <AdminPinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        promptText={promptText}
      />
    </>
  );
}
