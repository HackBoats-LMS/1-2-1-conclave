"use client";

import { signOut } from "next-auth/react";
import React from "react";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors ${className}`}
      title="Sign Out"
    >
      Sign Out
    </button>
  );
}
