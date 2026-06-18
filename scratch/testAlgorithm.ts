function genId() {
  return Math.random().toString(36).substring(7);
}

function shuffle(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Mock categories
const categories = ["IT & Tech", "Finance", "Healthcare", "Education", "Marketing & PR"];

// Mock users
const captains = Array.from({ length: 5 }, (_, i) => ({ id: `CAP_${i+1}`, businessCategory: categories[i] }));
const members = Array.from({ length: 12 }, (_, i) => ({ id: `MEM_${i+1}`, businessCategory: categories[i % categories.length] }));
const visitors = Array.from({ length: 6 }, (_, i) => ({ id: `VIS_${i+1}`, businessCategory: categories[i % categories.length] }));

const MAX_ROUNDS = 5;
const MAX_TABLE_SIZE = 5; // 1 captain + 4 attendees
const C = captains.length;

const memberIds = members.map(m => m.id);
const visitorIds = visitors.map(v => v.id);
const captainIds = captains.map(c => c.id);

const userCategory = new Map<string, string>();
members.forEach(m => userCategory.set(m.id, m.businessCategory));
visitors.forEach(v => userCategory.set(v.id, v.businessCategory));
captains.forEach(c => userCategory.set(c.id, c.businessCategory));

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

console.log("Starting generation...");

for (let roundNum = 0; roundNum < MAX_ROUNDS; roundNum++) {
  const maxMembersAndVisitors = MAX_TABLE_SIZE > 1 ? MAX_TABLE_SIZE - 1 : Infinity;
  const totalAvailableSlots = C * maxMembersAndVisitors;
  
  const mPool = [...memberIds];
  const vPool = [...visitorIds];
  
  shuffle(mPool); mPool.sort((a,b) => roundsPlayed.get(a)! - roundsPlayed.get(b)!);
  shuffle(vPool); vPool.sort((a,b) => roundsPlayed.get(a)! - roundsPlayed.get(b)!);

  const activeMembers: string[] = [];
  const activeVisitors: string[] = [];
  let slotsUsed = 0;
  let mIdx = 0, vIdx = 0;

  while (slotsUsed < totalAvailableSlots && (mIdx < mPool.length || vIdx < vPool.length)) {
      if (mIdx < mPool.length) { activeMembers.push(mPool[mIdx++]); slotsUsed++; }
      if (slotsUsed < totalAvailableSlots && vIdx < vPool.length) { activeVisitors.push(vPool[vIdx++]); slotsUsed++; }
  }

  let bestRoundTables: { memberIds: string[], visitorIds: string[] }[] = [];
  let bestRoundScore = -Infinity;

  const captainIdsSet = new Set(captainIds);

  const evalTableLocal = (tableMembers: string[], tableVisitors: string[], tableIdx: number) => {
      let score = 0;
      const allIds = [...tableMembers, ...tableVisitors, captainIds[tableIdx]];
      for (let i = 0; i < allIds.length; i++) {
          const u = allIds[i];
          const isCap = captainIdsSet.has(u);

          if (!isCap) {
              if (lastRoundTable.get(u) === tableIdx) score -= 1000;
              else if (visitedTables.get(u)?.has(tableIdx)) score -= 50;
          }
          
          for (let j = i + 1; j < allIds.length; j++) {
              const v = allIds[j];
              const catU = userCategory.get(u);
              const catV = userCategory.get(v);
              if (catU && catV && catU !== "N/A" && catV !== "N/A" && catU === catV) {
                  score -= 500;
              }
              if (!currentMet.get(u)?.has(v)) score += 1;
          }
      }
      return score;
  };

  for (let attempt = 0; attempt < 10; attempt++) {
      const tables: { memberIds: string[], visitorIds: string[] }[] = Array.from({ length: C }, () => ({ memberIds: [], visitorIds: [] }));
      
      shuffle(activeMembers);
      for (let i=0; i<activeMembers.length; i++) tables[i % C].memberIds.push(activeMembers[i]);

      shuffle(activeVisitors);
      for (let i=0; i<activeVisitors.length; i++) tables[i % C].visitorIds.push(activeVisitors[i]);

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
              // Keep
          } else {
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

  matrix.push(bestRoundTables);
  
  console.log(`\n--- ROUND ${roundNum + 1} --- (Score: ${bestRoundScore})`);
  let roundViolations = 0;

  for (let t = 0; t < C; t++) {
      const allIds = [...bestRoundTables[t].memberIds, ...bestRoundTables[t].visitorIds, captainIds[t]];
      
      const mCount = bestRoundTables[t].memberIds.length;
      const vCount = bestRoundTables[t].visitorIds.length;
      console.log(`Table ${t+1} [${captainIds[t]}]: ${mCount} Members, ${vCount} Visitors`);
      
      for (let i = 0; i < allIds.length; i++) {
          const u = allIds[i];
          
          if (lastRoundTable.get(u) === t) {
            console.log(`  🚨 VIOLATION: ${u} is at same table as last round!`);
            roundViolations++;
          }
          
          visitedTables.get(u)!.add(t);
          lastRoundTable.set(u, t);
          roundsPlayed.set(u, roundsPlayed.get(u)! + 1);
          
          for (let j = i + 1; j < allIds.length; j++) {
              const v = allIds[j];
              const catU = userCategory.get(u);
              const catV = userCategory.get(v);
              if (catU && catV && catU === catV) {
                console.log(`  🚨 CATEGORY COLLISION: ${u} and ${v} both in ${catU}`);
                roundViolations++;
              }
              currentMet.get(u)!.add(v);
              currentMet.get(v)!.add(u);
          }
      }
  }
  
  if (roundViolations === 0) {
      console.log("✅ Perfect round! No violations.");
  }
}

// Print sit-out counts if any
console.log("\n--- BENCH ROTATION STATS ---");
for (const id of [...memberIds, ...visitorIds]) {
  console.log(`${id}: played ${roundsPlayed.get(id)} / ${MAX_ROUNDS} rounds`);
}
