"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUsersForGeneration, saveRoundChunk } from "./actions/assignment.actions";
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

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
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

function normalizeCategory(cat: string | null | undefined): string {
  if (!cat) return "N/A";
  
  const raw = cat.toLowerCase().trim();
  if (raw === "" || raw === "n/a" || raw === "na" || raw === "none") return "N/A";

  const mappings = [
    { keywords: ["it", "information technology", "software", "tech", "app ", "web ", "computer", "developer", "coding"], base: "IT & Tech" },
    { keywords: ["hr", "human resource", "recruitment", "staffing", "talent"], base: "HR & Recruitment" },
    { keywords: ["finance", "accounting", "ca", "tax", "banking", "wealth", "investment", "audit"], base: "Finance" },
    { keywords: ["marketing", "digital marketing", "seo", "advertising", "pr", "branding", "agency"], base: "Marketing & PR" },
    { keywords: ["real estate", "property", "realtor", "builder", "construction", "architecture", "interior"], base: "Real Estate & Construction" },
    { keywords: ["legal", "law", "lawyer", "advocate", "attorney"], base: "Legal" },
    { keywords: ["health", "medical", "doctor", "healthcare", "pharma", "clinic", "hospital", "wellness", "fitness"], base: "Healthcare & Wellness" },
    { keywords: ["education", "school", "college", "university", "training", "teaching", "tutor", "edtech"], base: "Education" },
    { keywords: ["manufactur", "factory", "production", "industrial"], base: "Manufacturing" },
    { keywords: ["logistic", "transport", "shipping", "courier", "supply chain"], base: "Logistics" },
    { keywords: ["consult", "advis", "coach"], base: "Consulting & Coaching" },
    { keywords: ["design", "graphic", "creative", "ui/ux"], base: "Design & Creative" },
    { keywords: ["event", "wedding", "planning", "exhibition"], base: "Events" },
    { keywords: ["retail", "ecommerce", "e-commerce", "shop", "store", "wholesale"], base: "Retail" },
    { keywords: ["food", "restaurant", "cafe", "catering", "fmcg", "beverage"], base: "Food & Beverage" },
    { keywords: ["travel", "tourism", "hotel", "hospitality"], base: "Travel & Hospitality" },
    { keywords: ["insurance"], base: "Insurance" }
  ];

  for (const map of mappings) {
    // Check if the raw string contains any of the keywords as a whole word or significant substring
    if (map.keywords.some(kw => raw.includes(kw))) {
      return map.base;
    }
  }

  // Fallback to exact string (lowercase and trimmed) so exact matches still work
  return raw;
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

export function AutoGenerateClient({ captainCount, memberCount, visitorCount = 0, currentDuration = 15 }: { captainCount: number, memberCount: number, visitorCount?: number, currentDuration?: number }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ current: number, total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxRounds, setMaxRounds] = useState<number | string>(10);
  const [enableLimits, setEnableLimits] = useState(false);
  const [targetMembers, setTargetMembers] = useState<number | string>(6);
  const [targetVisitors, setTargetVisitors] = useState<number | string>(2);

  useEffect(() => {
    const savedMax = localStorage.getItem("conclave_max_rounds");
    if (savedMax) setMaxRounds(parseInt(savedMax, 10));
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
    setSavingProgress(null);
    setError(null);
    try {
      const MAX_ROUNDS = parseInt(formData.get("maxRounds")?.toString() || "12", 10);
      const DEFAULT_DURATION = parseInt(formData.get("defaultDuration")?.toString() || "15", 10);

      const { captains, members, visitors, error: fetchError } = await fetchUsersForGeneration();
      if (fetchError) throw new Error(fetchError);
      
      const C = captains.length;
      if (C === 0) throw new Error("No captains found. Upload captain emails first.");
      if (members.length === 0 && visitors.length === 0) throw new Error("No members or visitors found. Upload attendees first.");

      if (enableLimits) {
        const expectedMembers = Math.ceil(members.length / C);
        const expectedVisitors = visitors.length > 0 ? Math.ceil(visitors.length / C) : 0;
        
        const maxM = typeof targetMembers === "number" ? targetMembers : 6;
        const maxV = typeof targetVisitors === "number" ? targetVisitors : 2;

        if (expectedMembers > maxM + 1) {
          throw new Error(`Limit Exceeded: Fitting ${members.length} members into ${C} tables means ~${expectedMembers} per table. You set a limit of ${maxM}. Upload more captains.`);
        }
        if (expectedVisitors > maxV + 1) {
          throw new Error(`Limit Exceeded: Fitting ${visitors.length} visitors into ${C} tables means ~${expectedVisitors} per table. You set a limit of ${maxV}. Upload more captains.`);
        }
      }

      const memberIds = members.map(m => m.id);
      const visitorIds = visitors.map(v => v.id);
      const captainIds = captains.map(c => c.id);
      
      const userCategory = new Map<string, string>();
      const userChapter = new Map<string, string>();
      members.forEach(m => {
        userCategory.set(m.id, normalizeCategory(m.businessCategory));
        userChapter.set(m.id, (m.chapterName || "").trim().toLowerCase());
      });
      visitors.forEach(v => {
        userCategory.set(v.id, normalizeCategory(v.businessCategory));
        userChapter.set(v.id, (v.chapterName || "").trim().toLowerCase());
      });
      captains.forEach(c => {
        userCategory.set(c.id, normalizeCategory(c.businessCategory));
        userChapter.set(c.id, (c.chapterName || "").trim().toLowerCase());
      });

      await yieldToMain();

      const currentMet = new Map<string, Set<string>>();
      const visitedTables = new Map<string, Set<number>>();
      const lastRoundTable = new Map<string, number>();
      const roundsPlayed = new Map<string, number>();

      for (const id of [...memberIds, ...visitorIds, ...captainIds]) {
        currentMet.set(id, new Set());
        visitedTables.set(id, new Set());
        lastRoundTable.set(id, -1);
        roundsPlayed.set(id, 0);
      }

      const matrix: { memberIds: string[], visitorIds: string[] }[][] = [];

      for (let roundNum = 0; roundNum < MAX_ROUNDS; roundNum++) {
        // Yield to prevent UI freeze
        await yieldToMain();

        const mPool = [...memberIds];
        const vPool = [...visitorIds];
        
        shuffle(mPool); mPool.sort((a,b) => roundsPlayed.get(a)! - roundsPlayed.get(b)!);
        shuffle(vPool); vPool.sort((a,b) => roundsPlayed.get(a)! - roundsPlayed.get(b)!);

        const activeMembers: string[] = mPool;
        const activeVisitors: string[] = vPool;

        // 2. Perform attempts (simulations) for this round and pick the best one
        let bestRoundTables: { memberIds: string[], visitorIds: string[] }[] = [];
        let bestRoundScore = -Infinity;

        const captainIdsSet = new Set(captainIds);

        const evalTableLocal = (tableMembers: string[], tableVisitors: string[], tableIdx: number) => {
            let score = 0;
            const allIds = [...tableMembers, ...tableVisitors, captainIds[tableIdx]];
            
            // Track chapters to penalize if too many from the same chapter are at one table
            const chapterCounts = new Map<string, number>();

            for (let i = 0; i < allIds.length; i++) {
                const u = allIds[i];
                const isCap = captainIdsSet.has(u);

                const chapU = userChapter.get(u);
                if (chapU && chapU !== "") {
                  chapterCounts.set(chapU, (chapterCounts.get(chapU) || 0) + 1);
                }

                if (!isCap) {
                    if (lastRoundTable.get(u) === tableIdx) score -= 1000;
                    else if (visitedTables.get(u)?.has(tableIdx)) score -= 50;
                }
                
                for (let j = i + 1; j < allIds.length; j++) {
                    const v = allIds[j];
                    const catU = userCategory.get(u);
                    const catV = userCategory.get(v);
                    // Penalize exact category match, ignoring blanks/nulls/N/A
                    if (catU && catV && catU !== "N/A" && catV !== "N/A" && catU === catV) {
                        score -= 500;
                    }
                    if (!currentMet.get(u)?.has(v)) score += 1;
                }
            }
            
            // For a table of ~8 people, if more than 3 are from the exact same chapter, heavily penalize.
            // This ensures they are mixed. 
            chapterCounts.forEach(count => {
              if (count > 3) {
                // progressive penalty: 4 people = -100, 5 people = -200...
                score -= ((count - 3) * 100);
              }
            });

            return score;
        };

        for (let attempt = 0; attempt < 10; attempt++) {
            const tables: { memberIds: string[], visitorIds: string[] }[] = Array.from({ length: C }, () => ({ memberIds: [], visitorIds: [] }));
            
            // Distribute as evenly as possible using round-robin assignment
            shuffle(activeMembers);
            for (let i=0; i<activeMembers.length; i++) tables[i % C].memberIds.push(activeMembers[i]);

            shuffle(activeVisitors);
            for (let i=0; i<activeVisitors.length; i++) tables[i % C].visitorIds.push(activeVisitors[i]);

            // Local Search / Simulated Annealing
            for (let step = 0; step < 1500; step++) {
                const isMemberSwap = Math.random() < 0.5;
                const t1 = Math.floor(Math.random() * C);
                const t2 = Math.floor(Math.random() * C);
                if (t1 === t2) continue;

                const arr1 = isMemberSwap ? tables[t1].memberIds : tables[t1].visitorIds;
                const arr2 = isMemberSwap ? tables[t2].memberIds : tables[t2].visitorIds;
                
                if (arr1.length === 0 || arr2.length === 0) continue;

                const idx1 = Math.floor(Math.random() * arr1.length);
                const idx2 = Math.floor(Math.random() * arr2.length);

                const scoreBefore = evalTableLocal(tables[t1].memberIds, tables[t1].visitorIds, t1) + 
                                    evalTableLocal(tables[t2].memberIds, tables[t2].visitorIds, t2);
                
                const u1 = arr1[idx1];
                const u2 = arr2[idx2];
                arr1[idx1] = u2;
                arr2[idx2] = u1;

                const scoreAfter = evalTableLocal(tables[t1].memberIds, tables[t1].visitorIds, t1) + 
                                   evalTableLocal(tables[t2].memberIds, tables[t2].visitorIds, t2);

                if (scoreAfter >= scoreBefore) {
                    // Keep swap
                } else {
                    // Revert swap
                    arr1[idx1] = u1;
                    arr2[idx2] = u2;
                }
            }

            let attemptScore = 0;
            for (let t = 0; t < C; t++) attemptScore += evalTableLocal(tables[t].memberIds, tables[t].visitorIds, t);

            if (attemptScore > bestRoundScore) {
                bestRoundScore = attemptScore;
                bestRoundTables = tables.map(t => ({ memberIds: [...t.memberIds], visitorIds: [...t.visitorIds] }));
            }
        }

        // Apply the best round to our global state
        matrix.push(bestRoundTables);
        for (let t = 0; t < C; t++) {
            const allIds = [...bestRoundTables[t].memberIds, ...bestRoundTables[t].visitorIds, captainIds[t]];
            for (let i = 0; i < allIds.length; i++) {
                const u = allIds[i];
                visitedTables.get(u)!.add(t);
                lastRoundTable.set(u, t);
                roundsPlayed.set(u, roundsPlayed.get(u)! + 1);
                
                for (let j = i + 1; j < allIds.length; j++) {
                    const v = allIds[j];
                    currentMet.get(u)!.add(v);
                    currentMet.get(v)!.add(u);
                }
            }
        }
        
      }

      const totalRounds = matrix.length;
      const slotGrouping = calculateSlotGrouping(totalRounds);
      const totalSlots = slotGrouping.length;

      // Chunked saving to avoid Vercel timeouts
      setSavingProgress({ current: 0, total: totalRounds });
      let currentRoundIndex = 0;

      for (let s = 0; s < totalSlots; s++) {
        const slotId = genId();
        // The slot is passed with the first round of the slot
        let isFirstRoundInSlot = true;

        const roundsInSlot = slotGrouping[s];
        for (let r = 0; r < roundsInSlot; r++) {
          const roundId = genId();
          const singleRoundData = [{ 
            id: roundId, 
            slotId, 
            roundNumber: currentRoundIndex + 1, 
            status: "PENDING",
            durationMinutes: DEFAULT_DURATION
          }];

          const singleTableData: any[] = [];
          const singleAssignmentData: any[] = [];
          const roundTables = matrix[currentRoundIndex];

          for (let t = 0; t < C; t++) {
            const tableId = genId();
            singleTableData.push({ id: tableId, roundId, tableNumber: t + 1 });
            singleAssignmentData.push({ userId: captainIds[t], tableId, isCaptain: true });

            for (const memberId of roundTables[t].memberIds) {
              singleAssignmentData.push({ userId: memberId, tableId, isCaptain: false });
            }
            for (const visitorId of roundTables[t].visitorIds) {
              singleAssignmentData.push({ userId: visitorId, tableId, isCaptain: false });
            }
          }

          const chunkPayload = {
            slotData: isFirstRoundInSlot ? [{ id: slotId, slotNumber: s + 1 }] : [],
            roundData: singleRoundData,
            tableData: singleTableData,
            assignmentData: singleAssignmentData
          };

          const isFirstChunk = (currentRoundIndex === 0);
          
          setSavingProgress({ current: currentRoundIndex + 1, total: totalRounds });
          const result = await saveRoundChunk(chunkPayload, isFirstChunk);
          
          if (result.error) throw new Error(result.error);

          isFirstRoundInSlot = false;
          currentRoundIndex++;
        }
      }
      
      router.refresh();
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred during generation");
    } finally {
      setIsGenerating(false);
      setSavingProgress(null);
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
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="maxRounds" className="text-[10px] font-black text-[#0D2421] uppercase tracking-wider">
                Rounds to Generate
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
          </div>
          
          <div className="flex flex-col gap-3 p-4 bg-white border-2 border-[#0D2421]/20 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableLimits} 
                onChange={(e) => setEnableLimits(e.target.checked)} 
                className="w-4 h-4 accent-[#BEF03C]"
              />
              <span className="text-[10px] font-black text-[#0D2421] uppercase tracking-wider">Enable Client Specific Table Limits</span>
            </label>
            
            {enableLimits && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-[#0D2421]/70 uppercase tracking-wider">Target Members/Table</label>
                  <input 
                    type="number" 
                    value={targetMembers}
                    onChange={handleNumericChange(setTargetMembers, "conclave_target_members")}
                    className="p-2 border-2 border-[#0D2421] bg-[#FAF8F4] rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-[#0D2421]/70 uppercase tracking-wider">Target Visitors/Table</label>
                  <input 
                    type="number" 
                    value={targetVisitors}
                    onChange={handleNumericChange(setTargetVisitors, "conclave_target_visitors")}
                    className="p-2 border-2 border-[#0D2421] bg-[#FAF8F4] rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#0D2421]/60 font-semibold uppercase tracking-wide leading-relaxed">
            The engine forces table rotation and evenly spreads members and visitors. It strictly penalizes placing people from the same <span className="font-bold">Business Category</span> at the same table.
          </p>
        </div>

          <div className="flex flex-col gap-2">
            <button 
              type="submit"
              disabled={!(captainCount > 0 && (memberCount > 0 || visitorCount > 0)) || isGenerating}
              className={`w-full py-3.5 border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs transition-all ${
                captainCount > 0 && (memberCount > 0 || visitorCount > 0) && !isGenerating
                  ? 'bg-[#0D2421] text-[#BEF03C] hover:bg-[#163733] shadow-[3px_3px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer'
                  : 'bg-[#FAF8F4] text-[#0D2421]/40 border-[#0D2421]/30 cursor-not-allowed shadow-none'
              }`}
            >
              {isGenerating 
                ? (savingProgress 
                    ? `💾 Saving Round ${savingProgress.current} of ${savingProgress.total}...` 
                    : "🎲 Generating in Browser (Do Not Close)...")
                : "🎲 Auto-Generate Round Assignments"}
            </button>
            
            {savingProgress && (
              <div className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-full h-3 overflow-hidden shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]">
                <div 
                  className="bg-[#BEF03C] h-full border-r-2 border-[#0D2421] transition-all duration-300"
                  style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </form>
    </div>
  );
}
