"use client";

import React, { useState, useEffect, useRef } from "react";

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  promptText: string;
}

export function AdminPinModal({ isOpen, onClose, onConfirm, promptText }: AdminPinModalProps) {
  const [pin, setPin] = useState("");
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPin("");
    }
  }

  useEffect(() => {
    if (isOpen) {
      // Autofocus the input on mount
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() !== "") {
      onConfirm(pin);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0D2421]/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Dialog Content Container */}
      <div className="relative w-full max-w-md bg-[#FAF8F4] border-4 border-[#0D2421] rounded-[2rem] shadow-[8px_8px_0px_#0D2421] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Warning Header block */}
        <div className="bg-[#0D2421] text-white p-6 flex flex-col gap-2">
          <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-0.5 bg-[#FFC000] text-[#0D2421] border border-[#0D2421] rounded-full text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#0D2421]">
            ⚠️ Action Authorization
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-[#BEF03C]">
            Confirm Identity
          </h3>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <p className="text-xs font-semibold text-[#0D2421]/70 uppercase tracking-wide leading-relaxed">
            {promptText}
          </p>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#0D2421]/60">
              Enter Admin PIN
            </label>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-[#0D2421] bg-white rounded-xl font-black text-center text-lg tracking-widest focus:outline-none focus:ring-4 focus:ring-[#BEF03C]/50 placeholder:text-[#0D2421]/20 transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[0px] active:translate-y-[0px] transition-all cursor-pointer text-center text-[#0D2421]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[0px] active:translate-y-[0px] transition-all cursor-pointer text-center"
            >
              Authorize
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
