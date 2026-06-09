"use client";

import { SubmitButton } from "../components/SubmitButton";

export function EndConclaveButton({ action }: { action: string | ((formData: FormData) => void) }) {
  return (
    <form action={action} onSubmit={(e) => {
      if (!confirm("Are you sure you want to end the Conclave early? This will skip all remaining rounds and mark the event as concluded.")) {
        e.preventDefault();
      }
    }}>
      <SubmitButton loadingText="Ending..." className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
        End Conclave
      </SubmitButton>
    </form>
  );
}
