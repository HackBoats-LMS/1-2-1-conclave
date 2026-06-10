"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUsersForGeneration, saveAutoAssignments } from "./actions";
import { SubmitButton } from "../components/SubmitButton";

// Zero-latency yield to keep animations smooth
const yieldToMain = () => new Promise(resolve => {
  if (typeof MessageChannel !== 'undefined') {
    const channel = new MessageChannel();
    channel.port1.onmessage = resolve;
    channel.port2.postMessage(null);
  } else {
    setTimeout(resolve, 0);
  }
});

// Move crypto logic for browser compatibility
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calculateSlotGrouping(totalRounds: number): number[] {
  if (totalRounds <= 4) return [totalRounds];
  if (totalRounds % 4 === 0) return Array(totalRounds / 4).fill(4);
  if (totalRounds % 3 === 0) return Array(totalRounds / 3).fill(3);
  
  const slotsOf4 = Math.floor(totalRounds / 4);
  const remainder = totalRounds % 4;
  
  if (remainder === 0) return Array(slotsOf4).fill(4);
  if (remainder === 1 && slotsOf4 > 0) {
    return Array(Math.ceil(totalRounds / 3)).fill(0).map((_, i) => {
      const remaining = totalRounds - i * 3;
      return Math.min(remaining, 3);
    }).filter(n => n > 0);
  }
  if (remainder === 2) {
    if (totalRounds === 6) return [3, 3];
    const result = Array(slotsOf4).fill(4);
    result.push(2);
    return result;
  }
  if (remainder === 3) {
    const result = Array(slotsOf4).fill(4);
    result.push(3);
    return result;
  }
  
  const slots: number[] = [];
  let left = totalRounds;
  while (left > 0) {
    const chunk = Math.min(left, 4);
    slots.push(chunk);
    left -= chunk;
  }
  return slots;
}

export function AutoGenerateClient({ captainCount, memberCount, currentDuration = 15 }: { captainCount: number, memberCount: number, currentDuration?: number }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxRounds, setMaxRounds] = useState<number | string>(10);

  useEffect(() => {
    const saved = localStorage.getItem("conclave_max_rounds");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setMaxRounds(parseInt(saved, 10));
  }, []);

  const handleMaxRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMaxRounds(isNaN(val) ? "" : val);
    if (!isNaN(val)) {
      localStorage.setItem("conclave_max_rounds", val.toString());
    }
  };

  async function handleGenerate(formData: FormData) {
    setIsGenerating(true);
    setError(null);
    try {
      const MAX_ROUNDS = parseInt(formData.get("maxRounds")?.toString() || "12", 10);
      const DEFAULT_DURATION = parseInt(formData.get("defaultDuration")?.toString() || "15", 10);

      // Call the server action
      const { generateAutoAssignments } = await import('./actions');
      const result = await generateAutoAssignments(MAX_ROUNDS, DEFAULT_DURATION);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      // Refresh in-place
      router.refresh();
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred during generation");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex-1 w-full space-y-4">
      {error && (
        <div className="bg-red-100 border-2 border-red-500 p-3 rounded-xl text-red-700 text-xs font-bold uppercase">
          {error}
        </div>
      )}
      <form action={handleGenerate} className="flex flex-col space-y-4 w-full">
        <input type="hidden" name="defaultDuration" value={currentDuration} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#FAF8F4] p-4 rounded-xl border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421]">
          <label htmlFor="maxRounds" className="text-xs font-black text-[#0D2421] uppercase tracking-wide whitespace-nowrap flex-shrink-0">
            Max Rounds to Generate
          </label>
          <input 
            type="number" 
            id="maxRounds" 
            name="maxRounds" 
            value={maxRounds}
            onChange={handleMaxRoundsChange}
            min={1} 
            max={20}
            className="p-3 border-2 border-[#0D2421] bg-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 w-24 text-center text-xs flex-shrink-0"
          />
          <p className="text-[10px] text-[#0D2421]/60 font-semibold uppercase tracking-wide leading-relaxed flex-1">
            The engine will stop early if it hits 100% room coverage before reaching this limit.
          </p>
        </div>

        <SubmitButton 
          loadingText="🎲 Generating in Browser (Do Not Close)..."
          className={`w-full py-3.5 border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs transition-all ${
            captainCount > 0 && memberCount > 0 && !isGenerating
              ? 'bg-[#0D2421] text-[#BEF03C] hover:bg-[#163733] shadow-[3px_3px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer'
              : 'bg-[#FAF8F4] text-[#0D2421]/40 border-[#0D2421]/30 cursor-not-allowed shadow-none'
          }`}
        >
          🎲 Auto-Generate Round Assignments
        </SubmitButton>
      </form>
    </div>
  );
}
