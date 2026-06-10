"use client";

import { SubmitButton } from "../components/SubmitButton";

export function EndConclaveButton({ action }: { action: string | ((formData: FormData) => void) }) {
  return (
    <form action={action} onSubmit={(e) => {
      if (!confirm("Are you sure you want to end the Conclave early? This will skip all remaining rounds and mark the event as concluded.")) {
        e.preventDefault();
      }
    }} className="w-full">
      <SubmitButton loadingText="Ending..." className="w-full h-10 px-4 bg-red-500 hover:bg-red-600 text-white border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center">
        End Conclave
      </SubmitButton>
    </form>
  );
}
