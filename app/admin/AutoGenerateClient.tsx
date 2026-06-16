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
  const [minRounds, setMinRounds] = useState<number | string>(1);
  const [maxTableSize, setMaxTableSize] = useState<number | string>("");

  useEffect(() => {
    const savedMax = localStorage.getItem("conclave_max_rounds");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedMax) setMaxRounds(parseInt(savedMax, 10));

    const savedMin = localStorage.getItem("conclave_min_rounds");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedMin) setMinRounds(parseInt(savedMin, 10));

    const savedTableSize = localStorage.getItem("conclave_max_table_size");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTableSize) setMaxTableSize(parseInt(savedTableSize, 10));
  }, []);

  const handleNumericChange = (setter: any, key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setter(isNaN(val) ? "" : val);
    if (!isNaN(val)) {
      localStorage.setItem(key, val.toString());
    } else {
      localStorage.removeItem(key);
    }
  };

  async function handleGenerate(formData: FormData) {
    setIsGenerating(true);
    setError(null);
    try {
      const MAX_ROUNDS = parseInt(formData.get("maxRounds")?.toString() || "12", 10);
      const MIN_ROUNDS = parseInt(formData.get("minRounds")?.toString() || "1", 10);
      const MAX_TABLE_SIZE = parseInt(formData.get("maxTableSize")?.toString() || "0", 10); // 0 means no limit
      const DEFAULT_DURATION = parseInt(formData.get("defaultDuration")?.toString() || "15", 10);

      // 1. Fetch users from server
      const { captains, members, error: fetchError } = await fetchUsersForGeneration();
      if (fetchError) throw new Error(fetchError);
      
      const C = captains.length;
      const M = members.length;
      if (C === 0) throw new Error("No captains found. Upload captain emails first.");
      if (M === 0) throw new Error("No members found. Upload member emails first.");
      if (M < C) throw new Error(`Need at least ${C} members for ${C} captains (tables). Currently have ${M}.`);

      const membersPerTable = Math.floor(M / C);
      const extraTables = M % C;

      const memberIds = members.map(m => m.id);
      const captainIds = captains.map(c => c.id);
      
      const userGroups = new Map<string, string | null>();
      members.forEach(m => userGroups.set(m.id, m.group));
      captains.forEach(c => userGroups.set(c.id, c.group));

      const totalPossiblePairs = (M * (M - 1) / 2) + (M * C);

      let bestRoundAssignments: { captainId: string; memberIds: string[] }[][] = [];
      let bestRoundCount = Infinity;
      let bestCoverage = -1;

      const evaluateCoverage = (matrix: string[][][]) => {
        const met = new Map<string, Set<string>>();
        for (const id of memberIds) met.set(id, new Set());
        for (const id of captainIds) met.set(id, new Set());

        let groupPenalty = 0;
        for (const round of matrix) {
          for (let t = 0; t < C; t++) {
            const allAtTable = [...round[t], captainIds[t]];
            for (let i = 0; i < allAtTable.length; i++) {
              for (let j = i + 1; j < allAtTable.length; j++) {
                met.get(allAtTable[i])!.add(allAtTable[j]);
                met.get(allAtTable[j])!.add(allAtTable[i]);
                
                const g1 = userGroups.get(allAtTable[i]);
                const g2 = userGroups.get(allAtTable[j]);
                if (g1 && g2 && g1 === g2) groupPenalty += 10;
              }
            }
          }
        }
        
        let totalSize = 0;
        for (const partners of met.values()) {
          totalSize += partners.size;
        }
        const pairs = totalSize / 2;
        return { pairs, met, score: pairs - groupPenalty };
      };

      // Force browser to paint loading state before heavy lifting
      await yieldToMain();

      // REDUCED SIMULATIONS from 10 to 3 to heavily boost speed
      for (let sim = 0; sim < 3; sim++) {
        // Yield at the start of each simulation
        await yieldToMain();
        const matrix: string[][][] = [];
        const currentMet = new Map<string, Set<string>>();
        for (const id of memberIds) currentMet.set(id, new Set());
        for (const id of captainIds) currentMet.set(id, new Set());
        
        const pool = [...memberIds];

        while (matrix.length < MAX_ROUNDS) {
          let totalSize = 0;
          for (const partners of currentMet.values()) {
            totalSize += partners.size;
          }
          const metCount = totalSize / 2;
          if (matrix.length >= MIN_ROUNDS && metCount >= totalPossiblePairs) break;

          let bestRound: string[][] = Array.from({ length: C }, () => []);
          let maxNewPairs = -Infinity;

          // REDUCED ATTEMPTS from 20 to 10 to heavily boost speed
          for (let attempt = 0; attempt < 10; attempt++) {
            // Yield every 2 attempts to keep the loading spinner perfectly smooth
            if (attempt % 2 === 0) await yieldToMain();

            const tables: string[][] = Array.from({ length: C }, () => []);
            let tableSizes = Array.from({ length: C }, (_, i) => i >= C - extraTables ? membersPerTable + 1 : membersPerTable);
            
            // Enforce max table size (subtract 1 for the captain)
            if (MAX_TABLE_SIZE > 1) {
              const maxMembers = MAX_TABLE_SIZE - 1;
              tableSizes = tableSizes.map(size => Math.min(size, maxMembers));
            }
            shuffle(pool);
            const sorted = [...pool].sort((a, b) => currentMet.get(a)!.size - currentMet.get(b)!.size);

            for (const memberId of sorted) {
              let bestTable = -1, bestScore = -1, bestCurrentSize = Infinity;
              const tableIndices = Array.from({ length: C }, (_, i) => i);
              shuffle(tableIndices);

              for (const t of tableIndices) {
                if (tables[t].length >= tableSizes[t]) continue;
                let newMeetings = 0;
                let groupPenalty = 0;
                const myMet = currentMet.get(memberId)!;
                const myGroup = userGroups.get(memberId);
                
                for (const existing of tables[t]) {
                  if (!myMet.has(existing)) newMeetings++;
                  if (myGroup && myGroup === userGroups.get(existing)) groupPenalty += 10;
                }
                if (!myMet.has(captainIds[t])) newMeetings++;
                if (myGroup && myGroup === userGroups.get(captainIds[t])) groupPenalty += 10;
                
                const tableScore = newMeetings - groupPenalty;
                
                if (bestTable === -1 || tableScore > bestScore || (tableScore === bestScore && tables[t].length < bestCurrentSize)) {
                  bestTable = t; bestScore = tableScore; bestCurrentSize = tables[t].length;
                }
              }
              if (bestTable >= 0) tables[bestTable].push(memberId);
            }

          // High-performance evaluator without array allocations (Garbage Collection optimization)
          const evalTableScoreLocal = (tableMembers: string[], capId: string) => {
             let score = 0;
             const len = tableMembers.length;
             for (let i = 0; i < len; i++) {
               const m1 = tableMembers[i];
               const m1Met = currentMet.get(m1)!;
               const g1 = userGroups.get(m1);
               for (let j = i + 1; j < len; j++) {
                  const m2 = tableMembers[j];
                  if (!m1Met.has(m2)) score++;
                  if (g1 && g1 === userGroups.get(m2)) score -= 10;
               }
               if (!m1Met.has(capId)) score++;
               if (g1 && g1 === userGroups.get(capId)) score -= 10;
             }
             return score;
          };

          // REDUCED SWAPS from 2000 to 800 to heavily boost speed
          for (let step = 0; step < 800; step++) {
              const t1 = Math.floor(Math.random() * C);
              const t2 = Math.floor(Math.random() * C);
              if (t1 === t2) continue;
              if (tables[t1].length === 0 || tables[t2].length === 0) continue;

              const m1Idx = Math.floor(Math.random() * tables[t1].length);
              const m2Idx = Math.floor(Math.random() * tables[t2].length);
              const m1 = tables[t1][m1Idx];
              const m2 = tables[t2][m2Idx];

              const scoreBefore = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

              tables[t1][m1Idx] = m2;
              tables[t2][m2Idx] = m1;
              const scoreAfter = evalTableScoreLocal(tables[t1], captainIds[t1]) + evalTableScoreLocal(tables[t2], captainIds[t2]);

              if (scoreAfter > scoreBefore) {
                // Keep swap
              } else {
                tables[t1][m1Idx] = m1;
                tables[t2][m2Idx] = m2;
              }
            }

            const finalTestMatrix = [...matrix, tables];
            const finalEval = evaluateCoverage(finalTestMatrix);
            
            const newScoreAdded = finalEval.score - (evaluateCoverage(matrix).score);
            if (newScoreAdded > maxNewPairs) {
              maxNewPairs = newScoreAdded;
              bestRound = tables.map(t => [...t]);
            }
            if (metCount + (finalEval.pairs - metCount) >= totalPossiblePairs && finalEval.score > 0) {
              if (matrix.length >= MIN_ROUNDS - 1) break;
            }
          }

          // Yield to the browser main thread to prevent "Page Unresponsive" warnings
          await yieldToMain();

          matrix.push(bestRound);
          for (let t = 0; t < C; t++) {
            const allAtTable = [...bestRound[t], captainIds[t]];
            for (let i = 0; i < allAtTable.length; i++) {
              for (let j = i + 1; j < allAtTable.length; j++) {
                currentMet.get(allAtTable[i])!.add(allAtTable[j]);
                currentMet.get(allAtTable[j])!.add(allAtTable[i]);
              }
            }
          }
        }

        const finalEval = evaluateCoverage(matrix);
        const isBetter = (finalEval.pairs === totalPossiblePairs && matrix.length < bestRoundCount) ||
                         (finalEval.score > bestCoverage && bestCoverage < totalPossiblePairs);
        
        if (bestCoverage === -1 || isBetter) {
          bestCoverage = finalEval.score;
          bestRoundCount = matrix.length;
          bestRoundAssignments = matrix.map(roundTables => 
            roundTables.map((memberList, tableIdx) => ({
              captainId: captainIds[tableIdx],
              memberIds: [...memberList],
            }))
          );
        }
      }

      const totalRounds = bestRoundAssignments.length;
      const slotGrouping = calculateSlotGrouping(totalRounds);
      const totalSlots = slotGrouping.length;

      // Prepare payload
      const slotData: { id: string; slotNumber: number }[] = [];
      const roundData: { id: string; slotId: string; roundNumber: number; status: string; durationMinutes: number }[] = [];
      const tableData: { id: string; roundId: string; tableNumber: number }[] = [];
      const assignmentData: { userId: string; tableId: string; isCaptain: boolean }[] = [];

      let globalRoundIdx = 0;
      for (let s = 0; s < totalSlots; s++) {
        const slotId = genId();
        slotData.push({ id: slotId, slotNumber: s + 1 });

        const roundsInSlot = slotGrouping[s];
        for (let r = 0; r < roundsInSlot; r++) {
          const roundId = genId();
          roundData.push({ 
            id: roundId, 
            slotId, 
            roundNumber: globalRoundIdx + 1, 
            status: "PENDING",
            durationMinutes: DEFAULT_DURATION
          });

          const roundTables = bestRoundAssignments[globalRoundIdx];
          for (let t = 0; t < C; t++) {
            const tableId = genId();
            tableData.push({ id: tableId, roundId, tableNumber: t + 1 });

            assignmentData.push({ userId: roundTables[t].captainId, tableId, isCaptain: true });

            for (const memberId of roundTables[t].memberIds) {
              assignmentData.push({ userId: memberId, tableId, isCaptain: false });
            }
          }
          globalRoundIdx++;
        }
      }

      // Send to server
      const payload = { slotData, roundData, tableData, assignmentData };
      const result = await saveAutoAssignments(payload);
      if (result.error) throw new Error(result.error);
      
      // Refresh in-place (no scroll jump) — server already revalidated
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
        <div className="flex flex-col gap-4 bg-[#FAF8F4] p-5 rounded-xl border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="minRounds" className="text-[10px] font-black text-[#0D2421] uppercase tracking-wider">
                Min Rounds
              </label>
              <input 
                type="number" 
                id="minRounds" 
                name="minRounds" 
                value={minRounds}
                onChange={handleNumericChange(setMinRounds, "conclave_min_rounds")}
                min={1} 
                max={20}
                className="p-3 border-2 border-[#0D2421] bg-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="maxRounds" className="text-[10px] font-black text-[#0D2421] uppercase tracking-wider">
                Max Rounds
              </label>
              <input 
                type="number" 
                id="maxRounds" 
                name="maxRounds" 
                value={maxRounds}
                onChange={handleNumericChange(setMaxRounds, "conclave_max_rounds")}
                min={1} 
                max={20}
                className="p-3 border-2 border-[#0D2421] bg-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="maxTableSize" className="text-[10px] font-black text-[#0D2421] uppercase tracking-wider">
                Max Table Size <span className="text-[#0D2421]/50 text-[8px]">(Total People)</span>
              </label>
              <input 
                type="number" 
                id="maxTableSize" 
                name="maxTableSize" 
                value={maxTableSize}
                onChange={handleNumericChange(setMaxTableSize, "conclave_max_table_size")}
                placeholder="No limit"
                min={2} 
                max={50}
                className="p-3 border-2 border-[#0D2421] bg-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 text-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-[#0D2421]/60 font-semibold uppercase tracking-wide leading-relaxed">
            The engine will stop when it hits 100% coverage, but never before <span className="font-bold">Min Rounds</span>. It will never exceed <span className="font-bold">Max Rounds</span>. If <span className="font-bold">Max Table Size</span> forces members to sit out, the engine will automatically rotate them fairly.
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
